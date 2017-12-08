/* global browser */
{
    let portToExtension;
    let sidebarWidth;
    let sidebarHeight;
    let areEventHandlersSet;
    let contentRootElement;

    // Basic debounce function.
    const debounce = (fn, time) => {
        let timeout;

        return function debounced (...args) {
            /* eslint-disable no-invalid-this */
            const func = () => fn.apply(this, args);

            clearTimeout(timeout);
            timeout = setTimeout(func, time);
        };
    };

    let getContentRootElement = () => {
        // https://developer.mozilla.org/docs/Mozilla_Quirks_Mode_Behavior
        // The scrollLeft, scrollTop, scrollWidth, and scrollHeight properties
        // are relative to BODY in quirks mode (instead of HTML)  (bug 211030).
        let contentDocument = window.document;

        if (contentDocument.compatMode == 'BackCompat') {
            return contentDocument.body;
        }
        return contentDocument.documentElement;
    };

    let getCanvasElm = () => {
        // For now we're creating a new canvas every time.
        return document.createElement('canvas');
    };

    let capturePageContents = () => {
        let pageWidth = contentRootElement.scrollWidth;
        let pageHeight = contentRootElement.scrollHeight;
        if (pageHeight < 10 || pageWidth < 10) {
            // Hack: arbitrary value, used to prevent drawing minimap on dummy
            // content.
            console.warn('Page too small to capture for minimap, ignoring.')
            return null;
        }
        let canvas = getCanvasElm();
        let ratio = sidebarWidth / pageWidth;
        canvas.width = sidebarWidth;
        canvas.height = Math.round(pageHeight * ratio);
        let ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.drawWindow(window, 0, 0, pageWidth, pageHeight, '#FFF');
        // FIXME: is data url the best way to pass that data?
        // FIXME: clear canvas once we're done? Is it useful?
        return canvas.toDataURL();
    };

    let getScrollerDimensions = () => {
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
                ((pageHeight * ratio) - sidebarHeight) * scrollRatio
            );
        }
        return {
            width: Math.round(ratio * contentRootElement.clientWidth),
            height: Math.round(ratio * contentRootElement.clientHeight),
            top: Math.round(ratio * contentRootElement.scrollTop),
            left: Math.round(ratio * contentRootElement.scrollLeft),
            scrollTop: scrollTop,
        }
    };

    let captureAndSendData = () => {
        let dataURL = capturePageContents();
        let scrollerDimensions;
        if (dataURL) {
            scrollerDimensions = getScrollerDimensions();
        } else {
            scrollerDimensions = null;
        }
        messageSender({
            minimapDataURL: dataURL,
            scrollerDimensions: scrollerDimensions,
        });
    };

    let captureAndSendScrollerOnly = () => {
        messageSender({scrollerDimensions: getScrollerDimensions()});
    };

    let messageSender = (message) => {
        if (portToExtension && sidebarWidth && sidebarHeight) {
            portToExtension.postMessage(message);
        }
    };

    let messageReceiver = (message) => {
        if (message.sidebarWidth && message.sidebarHeight) {
            ({sidebarWidth, sidebarHeight} = message);
            onSidebarReady();
        }
        if (message.scrollDelta) {
            onSidebarScrollDelta(message.scrollDelta);
        } else if (message.scrollAbsolute) {
            onSidebarScrollAbsolute(message.scrollAbsolute);
        }
    };

    let onSidebarScrollDelta = (scrollDelta) => {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        let pageWidth = contentRootElement.scrollWidth;
        let ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop += (scrollDelta.deltaY / ratio);
        contentRootElement.scrollLeft += (scrollDelta.deltaX / ratio);
    };

    let onSidebarScrollAbsolute = (scrollAbsolute) => {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        let pageWidth = contentRootElement.scrollWidth;
        let ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop = (scrollAbsolute.absoluteY / ratio);
        contentRootElement.scrollLeft = (scrollAbsolute.absoluteX / ratio);
    };

    let onSidebarReady = () => {
        // Initial capture when we switch to the tab or load the extension.
        captureAndSendData();

        if (!areEventHandlersSet) {
            // Various events to listen to.
            window.addEventListener('load', captureAndSendData);
            document.defaultView.addEventListener(
                'resize', debounce(captureAndSendData, 250));
            document.addEventListener('scroll', captureAndSendScrollerOnly);

            let observer = new MutationObserver(
                debounce(captureAndSendData, 250));
            observer.observe(document.documentElement, {
                subtree: true,
                attributes: false,
                childList: true,
                characterData: true
            });
        }
    };

    let onConnectionReady = (port) => {
        portToExtension = port;

        portToExtension.onMessage.addListener(messageReceiver);
    };

    if (window) {
        contentRootElement = getContentRootElement()
        // Start listening to changes to the page to send it back to the
        // extension.
        browser.runtime.onConnect.addListener(onConnectionReady);
    }
}
