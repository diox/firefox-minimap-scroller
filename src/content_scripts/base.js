/* global browser */
{
    let contentRootElement;
    let initDone;
    let portToExtension;
    let sidebarWidth;
    let sidebarHeight;

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

    const getContentRootElement = () => {
        // https://developer.mozilla.org/docs/Mozilla_Quirks_Mode_Behavior
        // The scrollLeft, scrollTop, scrollWidth, and scrollHeight properties
        // are relative to BODY in quirks mode (instead of HTML)  (bug 211030).
        const contentDocument = window.document;

        if (contentDocument.compatMode == 'BackCompat') {
            return contentDocument.body;
        }
        return contentDocument.documentElement;
    };

    const getCanvasElm = () => {
        // For now we're creating a new canvas every time.
        return document.createElement('canvas');
    };

    const capturePageContents = () => {
        const pageWidth = contentRootElement.scrollWidth;
        const pageHeight = contentRootElement.scrollHeight;
        if (pageHeight < 10 || pageWidth < 10) {
            // Hack: arbitrary value, used to prevent drawing minimap on dummy
            // content.
            console.warn('Page too small to capture for minimap, ignoring.')
            return null;
        }
        const canvas = getCanvasElm();
        const ratio = sidebarWidth / pageWidth;
        canvas.width = sidebarWidth;
        canvas.height = Math.round(pageHeight * ratio);
        const ctx = canvas.getContext('2d');
        ctx.scale(ratio, ratio);
        ctx.drawWindow(window, 0, 0, pageWidth, pageHeight, '#FFF');
        // FIXME: is data url the best way to pass that data?
        // FIXME: clear canvas once we're done? Is it useful?
        return canvas.toDataURL();
    };

    const getScrollerDimensions = () => {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        const pageWidth = contentRootElement.scrollWidth;
        const pageHeight = contentRootElement.scrollHeight;
        const ratio = sidebarWidth / pageWidth;
        let scrollTop = 0;
        if (sidebarHeight && pageHeight > sidebarHeight) {
            const trueScrollHeight =
                contentRootElement.scrollHeight - 
                contentRootElement.clientHeight;
            const scrollRatio = 
                contentRootElement.scrollTop / trueScrollHeight;
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

    const captureAndSendData = () => {
        const dataURL = capturePageContents();
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

    const captureAndSendScrollerOnly = () => {
        messageSender({scrollerDimensions: getScrollerDimensions()});
    };

    const messageSender = (message) => {
        if (portToExtension && sidebarWidth && sidebarHeight) {
            portToExtension.postMessage(message);
        }
    };

    const messageReceiver = (message) => {
        if (message.sidebarWidth && message.sidebarHeight) {
            ({sidebarWidth, sidebarHeight} = message);
            if (message.hasOwnProperty('forceDraw')) {
                captureAndSendData();

                // The first time we receive this message, we want to set up
                // event listeners and do an initial capture.
                if (!initDone) {
                    initContentScript();
                }
            }
        }
        if (message.scrollDelta) {
            onSidebarScrollDelta(message.scrollDelta);
        } else if (message.scrollAbsolute) {
            onSidebarScrollAbsolute(message.scrollAbsolute);
        }
    };

    const onSidebarScrollDelta = (scrollDelta) => {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        const pageWidth = contentRootElement.scrollWidth;
        const ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop += (scrollDelta.deltaY / ratio);
        contentRootElement.scrollLeft += (scrollDelta.deltaX / ratio);
    };

    const onSidebarScrollAbsolute = (scrollAbsolute) => {
        // FIXME: don't recalculate info we already computed in
        // capturePageContents().
        const pageWidth = contentRootElement.scrollWidth;
        const ratio = sidebarWidth / pageWidth;
        contentRootElement.scrollTop = (scrollAbsolute.absoluteY / ratio);
        contentRootElement.scrollLeft = (scrollAbsolute.absoluteX / ratio);
    };

    const initContentScript = () => {
        // Various events to listen to.
        window.addEventListener('load', captureAndSendData);
        document.defaultView.addEventListener(
            'resize', debounce(captureAndSendData, 250));
        document.addEventListener('scroll', captureAndSendScrollerOnly);

        const observer = new MutationObserver(
            debounce(captureAndSendData, 250));
        observer.observe(document.documentElement, {
            subtree: true,
            attributes: false,
            childList: true,
            characterData: true
        });

        // Avoid doing this again.
        initDone = true;
    };

    const onConnectionReady = (port) => {
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
