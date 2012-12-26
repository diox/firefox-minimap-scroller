const { getActiveTab } = require('tabs/utils');

function Minimap(sidebar) {
    var minimap = this;
    minimap.sidebar = sidebar;  // FIXME: will this leak when destroying windows ?
    let sidebarDocument = minimap.sidebar.browser.contentDocument;

    minimap.isdown = false;
    sidebarDocument.documentElement.addEventListener('mousedown', function(e) {
        minimap.isdown = true;
        minimap.clickScrollMinimap(e);
    });

    sidebarDocument.documentElement.addEventListener('wheel', function(e) {
        minimap.wheelScrollMinimap(e);
    });

    sidebarDocument.documentElement.addEventListener('mouseup', function(e) {
        minimap.isdown = false;
    });

    sidebarDocument.documentElement.addEventListener('mousemove', function(e) {
        if (minimap.isdown) {
            minimap.clickScrollMinimap(e);
        }
    });    
};

Minimap.prototype.getContentWindowAndIndex = function() {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let win = this.sidebar.window;
    let contentWindow = getActiveTab(win).linkedBrowser.contentWindow;
    let index = win.gBrowser.getBrowserIndexForDocument(contentWindow.document);
    return [contentWindow, index];
}

Minimap.prototype.wheelScrollMinimap = function(e) {
    // FIXME: obey firefox mousewheel prefs, including modifier keys ?
    let scroller = this.getScrollerElm(-1);
    if (!scroller) {
        return;
    }
    let top = scroller.offsetTop + (e.deltaY * 10); 
    let left = scroller.offsetLeft + (e.deltaX * 10);
    this.absoluteScrollMinimap(top, left);
}

Minimap.prototype.clickScrollMinimap = function(e) {
    let scroller = this.getScrollerElm(-1);
    if (!scroller) {
        return;
    }
    let top = e.clientY - (scroller.offsetHeight / 2);
    let left = e.clientX - (scroller.offsetWidth / 2);
    this.absoluteScrollMinimap(top, left);
}

Minimap.prototype.absoluteScrollMinimap = function(top, left) {
    if (typeof this.ratiow === 'undefined' || 
        typeof this.ratioh === 'undefined') {
        // console.log('ratio undefined :(');
        return;
    }
    let [contentWindow, index] = this.getContentWindowAndIndex();
    let contentDocumentElement = contentWindow.document.documentElement;

    // transform mouse position values in the sidebar in scroll position on
    // the target document
    top = Math.round(top / this.ratioh);
    left = Math.round(left / this.ratiow);

    // FIXME: constrain ? this doesn't seem to be necessary, but maybe there is
    // a performance gain, especially if we can determine whether we need to
    // adjust scrollTop/Left or not depending on the constrained values
    // FIXME: use page mod instead of accessing document properties directly ?
    contentDocumentElement.scrollTop = top;
    contentDocumentElement.scrollLeft = left;

    // Calling drawScroller() isn't necessary, since we listen on "scroll"
    // event on the document.
}

Minimap.prototype.getCanvasElm = function(index) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let sidebarDocument = this.sidebar.browser.contentDocument;
    if (!sidebarDocument) {
        return null;
    }
    let canvas = sidebarDocument.getElementById('minimap');
    if (!canvas) {
        canvas = sidebarDocument.createElement('canvas');
        canvas.id = 'minimap';
        sidebarDocument.body.appendChild(canvas);
    }
    return canvas;
}

Minimap.prototype.getScrollerElm = function(index) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let sidebarDocument = this.sidebar.browser.contentDocument;
    if (!sidebarDocument) {
        return null;
    }
    return sidebarDocument.getElementById('scroller');
}

Minimap.prototype.drawScroller = function() {
    // FIXME: watch resize on sidebar
    let scroller = this.getScrollerElm(-1);
    let canvas = this.getCanvasElm(-1);

    if (!scroller || !canvas || !canvas.width || !canvas.height) {
        // not ready yet
        // console.warn('drawScroller() called, but canvas has no dimensions yet');
        return;
    }

    // canvas width and height contain the real size of the document.
    // canvas is automatically resized by the browser, we need to find out
    // it's real dimensions, not the dimensions we set ourselves, we do that 
    // using offsetWidth and offsetHeight
    this.ratiow = canvas.offsetWidth / canvas.width;
    this.ratioh = canvas.offsetHeight / canvas.height;

    // FIXME: use page mod instead of accessing document directly ?
    let [contentWindow, index] = this.getContentWindowAndIndex();
    let contentDocumentElement = contentWindow.document.documentElement;
    let width = Math.round(this.ratiow * contentDocumentElement.clientWidth);
    let height = Math.round(this.ratioh * contentDocumentElement.clientHeight);
    let top = Math.round(this.ratioh * contentDocumentElement.scrollTop);
    let left = Math.round(this.ratiow * contentDocumentElement.scrollLeft);
/*
    console.log('Document width x height: ', canvas.width, canvas.height);
    console.log('Minimap width x height: ', computedwith, computedheight);
    console.log('Content width x height: ', contentDocumentElement.clientWidth,
                                           contentDocumentElement.clientHeight);
    console.log('Scroller width x height: ', width, height);
    console.log('Scroller top x left: ', top, left);
*/
    scroller.style.width = width + 'px';
    scroller.style.height = height + 'px';
    scroller.style.top = top + 'px';
    scroller.style.left = left + 'px';
    scroller.style.display = 'block';
}

Minimap.prototype.drawMinimap = function() {
    let [contentWindow, index] = this.getContentWindowAndIndex();
    let canvas = this.getCanvasElm(index);
    if (!canvas) {
        return;
    }
    let contentDocumentElement = contentWindow.document.documentElement;
    let left = 0;
    let top = 0;
    let width = contentDocumentElement.scrollWidth;
    let height = contentDocumentElement.scrollHeight;
    if (height < 10) {
        // Hack: arbitrary value, used to prevent drawing minimap on dummy
        // content
        return;
    }
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(1.0, 1.0);
    ctx.drawWindow(contentWindow, left, top, width, height, 'rgb(255,255,255)');
    ctx.restore();
    this.drawScroller();
}

exports.Minimap = Minimap;