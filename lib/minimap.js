const { getActiveTab } = require('tabs/utils');

function Minimap(sidebar) {
    let minimap = this;
    minimap.sidebar = sidebar;
    let document = sidebar.browser.contentDocument;

    minimap.isdown = false;
    document.documentElement.addEventListener('mousedown', function(e) {
        minimap.isdown = true;
        minimap.clickScrollMinimap(e);
    });

    document.documentElement.addEventListener('wheel', function(e) {
        minimap.wheelScrollMinimap(e);
    });

    document.documentElement.addEventListener('mouseup', function(e) {
        minimap.isdown = false;
    });

    document.documentElement.addEventListener('mousemove', function(e) {
        if (minimap.isdown) {
            minimap.clickScrollMinimap(e);
        }
    });    
};

Minimap.prototype.getContentWindowAndIndex = function() {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let chromeWindow = this.sidebar.window;
    let win = getActiveTab(chromeWindow).linkedBrowser.contentWindow;
    let index = chromeWindow.gBrowser.getBrowserIndexForDocument(win.document);
    return [win, index];    
}

Minimap.prototype.wheelScrollMinimap = function(e) {
    // FIXME: obey firefox mousewheel prefs, including modifier keys ?
    let scroller = this.getScrollerElm(-1);
    let top = scroller.offsetTop + (e.deltaY * 10); 
    let left = scroller.offsetLeft + (e.deltaX * 10);
    this.absoluteScrollMinimap(top, left);
}

Minimap.prototype.clickScrollMinimap = function(e) {
    let scroller = this.getScrollerElm(-1);
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
    let [win, index] = this.getContentWindowAndIndex();

    // transform mouse position values in the sidebar in scroll position on
    // the target document
    top = parseInt(top / this.ratioh, 10);
    left = parseInt(left / this.ratiow, 10);

    // FIXME: constrain ? this doesn't seem to be necessary, but maybe there is
    // a performance gain, especially if we can determine whether we need to
    // adjust scrollTop/Left or not depending on the constrained values
    // FIXME: use page mod instead of accessing document properties directly ?
    win.document.documentElement.scrollTop = top;
    win.document.documentElement.scrollLeft = left; 

    // Calling drawScroller() isn't necessary, since we listen on "scroll"
    // event on the document.    
}

Minimap.prototype.getCanvasElm = function(index) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let document = this.sidebar.browser.contentDocument;
    let canvas = document.getElementById('minimap');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'minimap';
        document.body.appendChild(canvas);
    }
    return canvas;
}

Minimap.prototype.getScrollerElm = function(index) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let document = this.sidebar.browser.contentDocument;
    return document.getElementById('scroller');
}

Minimap.prototype.drawScroller = function() {
    // FIXME: watch resize on sidebar
    let scroller = this.getScrollerElm(-1);
    let canvas = this.getCanvasElm(-1);

    if (!canvas.width || !canvas.height) {
        // not ready yet
        console.warn('drawScroller() called, but canvas has no dimensions yet');
        return;
    }

    // canvas width and height contain the real size of the document.
    // canvas is automatically resized by the browser, we need to find out
    // it's real dimensions, not the dimensions we set ourselves, we do that 
    // using getComputedStyle
    let canvaswin = this.sidebar.browser.contentDocument.defaultView;
    let canvasstyle = canvaswin.getComputedStyle(canvas, null);

    if (!canvasstyle) {
        // not ready yet
        return;
    }

    let [win, index] = this.getContentWindowAndIndex();
    // FIXME: use page mod instead of accessing document directly ?
    let computedwith = parseInt(canvasstyle.getPropertyValue('width'), 10);
    let computedheight = parseInt(canvasstyle.getPropertyValue('height'), 10);
    this.ratiow = computedwith / canvas.width;
    this.ratioh = computedheight / canvas.height;

    let documentElement = win.document.documentElement;
    let width = parseInt(this.ratiow * documentElement.clientWidth, 10);
    let height = parseInt(this.ratioh * documentElement.clientHeight, 10);
    let top = parseInt(this.ratiow * documentElement.scrollTop, 10);
    let left = parseInt(this.ratiow * documentElement.scrollLeft, 10);
/*
    console.log('Document width x height: ', canvas.width, canvas.height);
    console.log('Minimap  width x height: ', computedwith, computedheight);
    console.log('Viewport width x height: ', documentElement.clientWidth, 
                                             documentElement.clientHeight);
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
    let [win, index] = this.getContentWindowAndIndex();
    let canvas = this.getCanvasElm(index);    
    let left = 0;
    let top = 0;
    let width = win.document.documentElement.scrollWidth;
    let height = win.document.documentElement.scrollHeight;
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
    ctx.drawWindow(win, left, top, width, height, 'rgb(255, 255, 255)');
    ctx.restore();
    this.drawScroller();
}

exports.Minimap = Minimap;