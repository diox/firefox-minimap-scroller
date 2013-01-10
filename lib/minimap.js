const { getActiveTab } = require('tabs/utils');

function Minimap(sidebar) {
    var minimap = this;
    minimap.sidebar = sidebar;  // FIXME: will this leak when destroying windows ?
    let sidebarRootElm = this.sidebar.browser.contentDocument.documentElement;

    sidebarRootElm.addEventListener('mousedown', function(e) {
        let scroller = minimap.getScrollerElm(-1);
        if (!scroller) {
            return null;
        }

        // If we are outside the scroller element, then scroll right away.
        // If we aren't, don't do anything in order not to affect potential 
        // dragging.
        if (minimap.isClickOutsideScroller(scroller, e)) {
            minimap.clickScrollMinimap(e);
        }

        // Mouse down init. Keep original mouse coordinates calculated from
        // the scroller position
        var startX = e.pageX - scroller.offsetLeft;
        var startY = e.pageY - scroller.offsetTop;

        // Callback for mousemove, with a twist: pass startX/startY inside the 
        // event
        var mouseMoveCallback = function(e) {
            e._deltaX = startX;
            e._deltaY = startY;
            minimap.clickScrollMinimap(e);
        }

        // Attach mousemove
        sidebarRootElm.addEventListener('mousemove', mouseMoveCallback);

        sidebarRootElm.addEventListener('mouseup', function(e) {
            // Remove mousemove event listener on mouse up, we don't need it
            // any more
            sidebarRootElm.removeEventListener('mousemove', mouseMoveCallback);
        });
    });

    sidebarRootElm.addEventListener('wheel', function(e) {
        minimap.wheelScrollMinimap(e);
    });
};

Minimap.prototype.isClickOutsideScroller = function(scroller, e) {
        let s_left = scroller.offsetLeft;
        let s_width = scroller.offsetWidth;
        let s_top = scroller.offsetTop;
        let s_height = scroller.offsetHeight;

        if (e.pageX < s_left || e.pageX > s_left + s_width ||
            e.pageY < s_top || e.pageY > s_top + s_height) {
            return true;
        }
        return false;
}

Minimap.prototype.getContentWindow = function() {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    let win = this.sidebar.window;
    let contentWindow = getActiveTab(win).linkedBrowser.contentWindow;
    // let index = win.gBrowser.getBrowserIndexForDocument(contentWindow.document);
    return contentWindow;
}

Minimap.prototype.getContentRootElement = function(contentWindow) {
    // https://developer.mozilla.org/en-US/docs/Mozilla_Quirks_Mode_Behavior
    // The scrollLeft, scrollTop, scrollWidth, and scrollHeight properties are
    // relative to BODY in quirks mode (instead of HTML)  (bug 211030).
    if (!contentWindow) {
        contentWindow = this.getContentWindow();
    }
    let contentDocument = contentWindow.document;

    if (contentDocument.compatMode == "BackCompat") {
        return contentDocument.body;
    } else {
        return contentDocument.documentElement;
    }
}

Minimap.prototype.wheelScrollMinimap = function(e) {
    // FIXME: obey firefox mousewheel prefs, including modifier keys ?
    let modifierx = 50;  // arbitrary value that looks ok for all sizes
    let modifiery = 50;  // arbitrary value that looks ok for all sizes
    let scroller = this.getScrollerElm(-1);
    if (!scroller) {
        return;
    }
    let top = scroller.offsetTop + (e.deltaY * this.ratioh * modifiery);
    let left = scroller.offsetLeft + (e.deltaX * this.ratiow * modifierx);
    this.absoluteScrollMinimap(top, left);
}

Minimap.prototype.clickScrollMinimap = function(e) {
    let scroller = this.getScrollerElm(-1);
    if (!scroller) {
        return;
    }
    let top, left;
    if (typeof e._deltaX !== 'undefined' && typeof e._deltaY != 'undefined') {
        top = e.pageY - e._deltaY;
        left = e.pageX - e._deltaX;
    } else {
        top = e.pageY - (scroller.offsetHeight / 2);
        left = e.pageX - (scroller.offsetWidth / 2);
    }
    this.absoluteScrollMinimap(top, left);
}

Minimap.prototype.absoluteScrollMinimap = function(top, left) {
    if (typeof this.ratiow === 'undefined' || 
        typeof this.ratioh === 'undefined') {
        // console.log('ratio undefined :(');
        return;
    }
    let contentRootElement = this.getContentRootElement();

    // Transform mouse position values in the sidebar in scroll position on
    // the target document
    top = Math.round(top / this.ratioh);
    left = Math.round(left / this.ratiow);

    // FIXME: constrain ? this doesn't seem to be necessary, but maybe there is
    // a performance gain, especially if we can determine whether we need to
    // adjust scrollTop/Left or not depending on the constrained values
    // FIXME: use page mod instead of accessing document properties directly ?
    contentRootElement.scrollTop = top;
    contentRootElement.scrollLeft = left;

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
    let sidebarDocument = this.sidebar.browser.contentDocument;

    if (!sidebarDocument || !scroller || !canvas || !canvas.width || !canvas.height) {
        // not ready yet
        // console.warn('drawScroller() called, but canvas has no dimensions yet');
        return;
    }

    // canvas width and height contain the real size of the document.
    // canvas is automatically resized by the browser, we need to find out
    // it's real dimensions, not the dimensions we set ourselves, we do that 
    // using offsetWidth and offsetHeight
    let canvasRealHeight = canvas.offsetHeight;
    let canvasRealWidth = canvas.offsetWidth;
    this.ratiow = canvasRealWidth / canvas.width;
    this.ratioh = canvasRealHeight / canvas.height;

    // FIXME: use page mod instead of accessing document directly ?
    let contentRootElement = this.getContentRootElement();
    let width = Math.round(this.ratiow * contentRootElement.clientWidth);
    let height = Math.round(this.ratioh * contentRootElement.clientHeight);
    let top = Math.round(this.ratioh * contentRootElement.scrollTop);
    let left = Math.round(this.ratiow * contentRootElement.scrollLeft);

    // before drawing scroller, let's check whether we should move the canvas
    // or not.
    let sidebarHeight = sidebarDocument.documentElement.offsetHeight; // FIXME: cache this, not going to change unless we resize the window
    if (canvasRealHeight > sidebarHeight) {
        let scrollRatio = (contentRootElement.scrollTop) / (contentRootElement.scrollHeight - contentRootElement.clientHeight);
        let sidebarScrollTop = Math.round((canvasRealHeight - sidebarHeight) * scrollRatio);
        sidebarDocument.documentElement.scrollTop = sidebarScrollTop;
    }
    scroller.style.width = width + 'px';
    scroller.style.height = height + 'px';
    scroller.style.top = top + 'px';
    scroller.style.left = left + 'px';
    scroller.style.display = 'block';
}

Minimap.prototype.drawMinimap = function(reason) {
    let contentWindow = this.getContentWindow();
    let contentRootElement = this.getContentRootElement(contentWindow);
    let canvas = this.getCanvasElm(-1);
    if (!canvas) {
        return;
    }
    let left = 0;
    let top = 0;
    let width = contentRootElement.scrollWidth;
    let height = contentRootElement.scrollHeight;
    if (height < 10) {
        // Hack: arbitrary value, used to prevent drawing minimap on dummy
        // content
        return;
    }
    canvas.width = width;
    canvas.height = height;
    let ctx = canvas.getContext('2d');
    // console.log('ctx.drawWindow ' + width + ' / ' + height);
    // console.log('(' + reason + ')');
    ctx.drawWindow(contentWindow, left, top, width, height, 'rgb(255,255,255)');
    this.drawScroller();
}

exports.Minimap = Minimap;