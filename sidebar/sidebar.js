/* global browser */
{
    let portToCurrentTab;
    let windowId;
    let scrollerElm;
    let minimapElm;
    let sidebarRootElm;
    let startX;
    let startY;

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

    // FIXME: is sidebar is hidden, maybe tell the content script to not send
    // us anything. Not sure if needed, need to test.

    // FIXME: handle tab zoom

    // FIXME: onTabUpdated fires a lot, there might be a better way to do this
    // by using webnavigation ?
    const tabUpdated = (tabId, changeInfo, tabInfo) => {
        if (tabInfo.windowId != windowId) {
            return;
        }
        // Reconnect to content script when URL changes in the current tab.
        if (tabInfo.active && tabInfo.url) {
            resetMinimap();
            connectToTab(tabId);
        }
    };

    const activeTabChanged = (activeInfo) => {
        // Active tab changed. We need to check the windowid to see if that's
        // relevant for this sidebar.
        if (activeInfo.windowId != windowId) {
            return;
        }

        // It was! We need to reset the minimap entirely and reconnect to the
        // tab - doing so will trigger a fresh capture and set up event
        // listeners again.
        resetMinimap();
        connectToTab(activeInfo.tabId);
    };

    const connectToTab = (tabId) => {
        if (portToCurrentTab) {
            portToCurrentTab.disconnect();
        }
        // (Re-)connect our port to the specified tab. We only care about one
        // given tab at at time, so just overwrite portToCurrentTab.
        portToCurrentTab = browser.tabs.connect(tabId);

        // Send sidebar dimensions. That will trigger the initial capture for
        // this tab.
        sendSidebarDimensions({forceDraw: true});

        // Listen for new captures sent by the content script we're connected
        // to.
        portToCurrentTab.onMessage.addListener(messageReceiver);
    };

    const scrollSidebar = (scrollTop) => {
        sidebarRootElm.scrollTop = scrollTop;
    };

    const messageReceiver = (message) => {
        if (message.hasOwnProperty('minimapDataURL')) {
            draw(message.minimapDataURL);
        }
        if (message.hasOwnProperty('scrollerDimensions')) {
            if (message.scrollerDimensions) {
                scrollSidebar(message.scrollerDimensions.scrollTop)
                drawScroller(message.scrollerDimensions);
            } else {
                scrollSidebar(0);
                hideScroller();
            }
        }
    };

    const messageSender = (message) => {
        if (portToCurrentTab) {
            portToCurrentTab.postMessage(message);  
        }
    };

    const resetMinimap = () => {
        /** 
         * Blank the minimap and hide scroller. 
         *
         * Used when switching tab or changing the URL of the current one,
         * because the page we're about to load may be one we can't see
         * (about:* pages, restricted pages like AMO, etc) so content script
         * that triggers the update of the minimap might never fire;
         **/
        hideScroller();
        draw('');
    };

    const draw = (minimapDataURL) => {
        minimapElm.src = minimapDataURL;
    };

    const hideScroller = () => {
        scrollerElm.style.display = 'none';
    };

    const drawScroller = (dimensions) => {
        scrollerElm.style.display = 'block';
        scrollerElm.style.width = dimensions.width + 'px';
        scrollerElm.style.height = dimensions.height + 'px';
        scrollerElm.style.transform =
            `translate(${dimensions.left}px,${dimensions.top}px)`;
    };

    const isScrollerVisible = () => {
        // scrollerElm.style.display should always be set, and be set
        // to 'block', otherwise the scroller is not visible and this
        // is pointless.
        return scrollerElm.style.display == 'block';
    };

    const isMouseOutsideScroller = (e) => {
        const sDimensions = scrollerElm.getBoundingClientRect();

        if (e.clientX < sDimensions.left || e.clientX > sDimensions.right ||
            e.clientY < sDimensions.top || e.clientY > sDimensions.bottom) {
            return true;
        }
        return false;
    };

    const sendAbsoluteScrollMessage = (e) => {
        const sDimensions = scrollerElm.getBoundingClientRect();

        messageSender({
            'scrollAbsolute': {
                'absoluteX': e.pageX - (sDimensions.width / 2),
                'absoluteY': e.pageY - (sDimensions.height / 2),
            }
        });
    };

    const sendDeltaScrollMessage = (e) => {
        messageSender({
            'scrollDelta': {
                'deltaX': e.deltaX,
                'deltaY': e.deltaY,
            }
        });
    };

    const sendSidebarDimensions = (extra) => {
        messageSender({
            'sidebarWidth': sidebarRootElm.offsetWidth,
            'sidebarHeight': sidebarRootElm.offsetHeight,
            ...extra,
        });
    };

    const onMouseUp = () => {
        /**
         * Callback to handle cleanup that needs to happen when mouse button
         * is released. Also removes itself to prevent any unnecessary extra
         * calls.
         */
        sidebarRootElm.removeEventListener('mouseup', onMouseUp);
        sidebarRootElm.removeEventListener('mousemove', onMouseMove);
    };

    const onMouseMove = (e) => {
        /**
         * Callback to handle mouse mouvement. Installed when mouse button is
         * pressed.
         */
        if (!e.buttons) {
            // If the button was released outside the sidebar document, we
            // don't receive a mouseup, so we need to check here if no buttons
            // are currently pressed and call the onmouseup callback ourselves.
            onMouseUp();
        } else {
            sendDeltaScrollMessage({
                deltaX: e.pageX - startX,
                deltaY: e.pageY - startY,
            });
            startX = e.pageX;
            startY = e.pageY;
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        sidebarRootElm = document.documentElement;
        minimapElm = document.getElementById('minimap');
        scrollerElm = document.getElementById('scroller');

        browser.windows.getCurrent({populate: true}).then((windowInfo) => {
            // Store windowId when it changes. We're watching for tab
            // changes but only care about the ones in this particular window.
            // (a different instance of the sidebar is loaded for each window)
            windowId = windowInfo.id;
            // Find the current tab active when starting the extension, and
            // connect to it.
            browser.tabs.query({windowId: windowId, active: true}).then(
                (tabs) => {
                    connectToTab(tabs[0].id);
                }
            );
        });

        // Connect to the active tab when it changes.
        browser.tabs.onActivated.addListener(activeTabChanged);

        // Reconnect when active tab changes URL.
        browser.tabs.onUpdated.addListener(tabUpdated);

        // When a mousescroll event is detected on the sidebar, scroll the
        // content accordingly.
        sidebarRootElm.addEventListener('wheel', (e) => {
            if (isScrollerVisible()) {
                sendDeltaScrollMessage({
                    // FIXME: re-adjusting the deltaX/deltaY by an arbitrary
                    // factor is necessary, but why?
                    deltaX: e.deltaX * 3,
                    deltaY: e.deltaY * 3,
                });
            }
        });

        // When a mousedown is detected, scroll the content accordingly.
        sidebarRootElm.addEventListener('mousedown', (e) => {
            if (isScrollerVisible()) {
                e.preventDefault();

                if (isMouseOutsideScroller(e)) {
                    // For a click outside the scroller, all we have to do is
                    // ask the content to scroll to that position.
                    sendAbsoluteScrollMessage(e);
                } else {
                    // For a click inside the scroller... we need to wait for
                    // mouse movement and follow it until the mouse button is
                    // released.

                    // Original position to calculate the delta.
                    startX = e.pageX;
                    startY = e.pageY;

                    // Attach mousemove event listener.
                    sidebarRootElm.addEventListener('mousemove', onMouseMove);

                    // Remove mousemove event listener on mouse up, we
                    // don't need it any more.
                    // sidebarRootElm.addEventListener('mouseup', onMouseUp);
                }
            }
        });

        // When we resize the sidebar, we need to give the content-script the
        // new sidebar dimensions.
        document.defaultView.addEventListener(
            'resize', debounce(sendSidebarDimensions, 100));
    });
}
