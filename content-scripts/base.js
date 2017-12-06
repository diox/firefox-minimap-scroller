{
    let portToExtension;
    let sidebarWidth;
    let sidebarHeight;
    let areEventHandlersSet;
    let contentRootElement;

    // Basic debounce function stolen from 
    // https://davidwalsh.name/javascript-debounce-function
    function debounce(func, wait, immediate) {
        let timeout;
        return function() {
            let context = this, args = arguments;
            let later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            let callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    function getContentRootElement() {
        // https://developer.mozilla.org/docs/Mozilla_Quirks_Mode_Behavior
        // The scrollLeft, scrollTop, scrollWidth, and scrollHeight properties
        // are relative to BODY in quirks mode (instead of HTML)  (bug 211030).
        let contentDocument = window.document;

        if (contentDocument.compatMode == "BackCompat") {
            return contentDocument.body;
        } else {
            return contentDocument.documentElement;
        }
    }

    function getCanvasElm() {
        // For now we're creating a new canvas every time.
        return document.createElement('canvas');
    }

    function capturePageContents() {
        let contentWindow = window;
        let left = 0;
        let top = 0;
        let pageWidth = contentRootElement.scrollWidth;
        let pageHeight = contentRootElement.scrollHeight;
        if (pageHeight < 10 || pageWidth < 10) {
            // Hack: arbitrary value, used to prevent drawing minimap on dummy
            // content.
            console.warn('Page too small to capture for minimap, ignoring.')
            return null;
        }
        let dataURL;
        let canvas = getCanvasElm();
        let ratio = sidebarWidth / pageWidth;
        canvas.width = sidebarWidth;
        canvas.height = Math.round(pageHeight * ratio);
        let ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.drawWindow(contentWindow, left, top, pageWidth, pageHeight,
                       'rgb(255,255,255)');
        dataURL = canvas.toDataURL();
        // FIXME: is data url the best way to pass that data?
        // FIXME: clear canvas once we're done? Is it useful?
        return dataURL;
    }

    function getScrollerDimensions() {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        let pageWidth = contentRootElement.scrollWidth;
        let pageHeight = contentRootElement.scrollHeight;
        let ratio = sidebarWidth / pageWidth;
        let scrollTop = 0;
        if (sidebarHeight && pageHeight > sidebarHeight) {
            let trueScrollHeight = (
                contentRootElement.scrollHeight - 
                contentRootElement.clientHeight);
            let scrollRatio = contentRootElement.scrollTop / trueScrollHeight;
            scrollTop = Math.round(
                (pageHeight * ratio - sidebarHeight) * scrollRatio
            );
        }
        return {
            width: Math.round(ratio * contentRootElement.clientWidth),
            height: Math.round(ratio * contentRootElement.clientHeight),
            top: Math.round(ratio * contentRootElement.scrollTop),
            left: Math.round(ratio * contentRootElement.scrollLeft),
            scrollTop: scrollTop,
        }
    }

    function captureAndSendData(options) {
        let dataURL = capturePageContents();
        let scrollerDimensions = dataURL ? getScrollerDimensions() : null;
        messageSender({
            minimapDataURL: dataURL,
            scrollerDimensions: scrollerDimensions,
        });
    }

    function captureAndSendScrollerOnly() {
        messageSender({
            scrollerDimensions: getScrollerDimensions(),
        });
    }

    function messageSender(message) {
        if (portToExtension && sidebarWidth && sidebarHeight) {
            portToExtension.postMessage(message);
        }
    }

    function messageReceiver(message) {
        if (message.sidebarWidth && message.sidebarHeight) {
            sidebarWidth = message.sidebarWidth;
            sidebarHeight = message.sidebarHeight;
            onSidebarReady();
        }
        if (message.scrollDelta) {
            onSidebarScrollDelta(message.scrollDelta);
        } else if (message.scrollAbsolute) {
            onSidebarScrollAbsolute(message.scrollAbsolute);
        }
    }

    function onSidebarScrollDelta(scrollDelta) {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        let pageWidth = contentRootElement.scrollWidth;
        let ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop += (scrollDelta.deltaY / ratio);
        contentRootElement.scrollLeft += (scrollDelta.deltaX / ratio);
    }

    function onSidebarScrollAbsolute(scrollAbsolute) {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        let pageWidth = contentRootElement.scrollWidth;
        let ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop = (scrollAbsolute.absoluteY / ratio);
        contentRootElement.scrollLeft = (scrollAbsolute.absoluteX / ratio);
    }

    function onSidebarReady() {
        // Initial capture when we switch to the tab or load the extension.
        captureAndSendData();

        if (!areEventHandlersSet) {
            // Various events to listen to.
            window.addEventListener('load', captureAndSendData);
            document.defaultView.addEventListener(
                'resize', debounce(captureAndSendData, 250));
            document.addEventListener('scroll', captureAndSendScrollerOnly);

            var observer = new MutationObserver(
                debounce(captureAndSendData, 250));
            observer.observe(document.documentElement, {
                subtree: true,
                attributes: false,
                childList: true,
                characterData: true
            });
        }
    }

    function onConnectionReady(port) {
        portToExtension = port;

        portToExtension.onMessage.addListener(messageReceiver);
    }

    if (window) {
        contentRootElement = getContentRootElement()
        // Start listening to changes to the page to send it back to the
        // extension.
        browser.runtime.onConnect.addListener(onConnectionReady);
    }
}
