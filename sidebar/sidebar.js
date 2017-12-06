{
    let portToCurrentTab;
    let windowId;
    let scrollerElm;
    let minimapElm;
    let sidebarRootElm;

    // FIXME: is sidebar is hidden, maybe tell the content script to not send
    // us anything. Not sure if needed, need to test.

    // FIXME: handle tab zoom

    // FIXME: onTabUpdated fires a lot, there might be a better way to do this
    // by using webnavigation ?
    let tabUpdated = (tabId, changeInfo, tabInfo) => {
        if (tabInfo.windowId != windowId) {
            return;
        }
        // Reconnect to content script when URL changes in the current tab.
        if (tabInfo.active && tabInfo.url) {
            resetMinimap();
            connectToTab(tabId);
        }
    };

    let activeTabChanged = (activeInfo) => {
        // Active tab changed.
        if (activeInfo.windowId != windowId) {
            return;
        }

        resetMinimap();

        // Now connect to the tab, immediately asking it to capture its
        // contents and then listening for changes.
        connectToTab(activeInfo.tabId);
    };

    let connectToTab = (tabId) => {
        if (portToCurrentTab) {
            portToCurrentTab.disconnect();
        }
        // (Re-)connect our port to the specified tab. We only care about one
        // given tab at at time, so just overwrite portToCurrentTab.
        portToCurrentTab = browser.tabs.connect(tabId);

        messageSender({
            'sidebarWidth': sidebarRootElm.offsetWidth,
            'sidebarHeight': sidebarRootElm.offsetHeight,
        });

        // Listen for new captures sent by the content script we're connected
        // to.
        portToCurrentTab.onMessage.addListener(messageReceiver);
    };

    let scrollSidebar = (scrollTop) => {
        sidebarRootElm.scrollTop = scrollTop;
    };

    let messageReceiver = (message) => {
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

    let messageSender = (message) => {
        if (portToCurrentTab) {
            portToCurrentTab.postMessage(message);  
        }
    };

    let resetMinimap = () => {
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

    let draw = (minimapDataURL) => {
        minimapElm.src = minimapDataURL;
    };

    let hideScroller = () => {
        scrollerElm.style.display = 'none';
    };

    let drawScroller = (dimensions) => {
        scrollerElm.style.width = dimensions.width + 'px';
        scrollerElm.style.height = dimensions.height + 'px';
        scrollerElm.style.top = dimensions.top + 'px';
        scrollerElm.style.left = dimensions.left + 'px';
        scrollerElm.style.display = 'block';
    };

    let isScrollerVisible = () => {
        // scrollerElm.style.display should always be set, and be set
        // to 'block', otherwise the scroller is not visible and this
        // is pointless.
        return scrollerElm.style.display == 'block';
    };

    let isClickOutsideScroller = (e) => {
        let sLeft = scrollerElm.offsetLeft;
        let sWidth = scrollerElm.offsetWidth;
        let sTop = scrollerElm.offsetTop;
        let sHeight = scrollerElm.offsetHeight;

        if (e.pageX < sLeft || e.pageX > sLeft + sWidth ||
            e.pageY < sTop || e.pageY > sTop + sHeight) {
            return true;
        }
        return false;
    };

    let sendAbsoluteScrollMessage = (e) => {
        messageSender({
            'scrollAbsolute': {
                'absoluteX': e.pageX - (scrollerElm.offsetWidth / 2),
                'absoluteY': e.pageY - (scrollerElm.offsetHeight / 2),
            }
        });
    };

    let sendDeltaScrollMessage = (e) => {
        messageSender({
            'scrollDelta': {
                'deltaX': e.deltaX,
                'deltaY': e.deltaY,
            }
        });
    };

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

                if (isClickOutsideScroller(e)) {
                    // For a click outside the scroller, all we have to do is
                    // ask the content to scroll to that position.
                    sendAbsoluteScrollMessage(e);
                } else {
                    // For a click inside the scroller... we need to wait for
                    // mouse movement and follow it until the mouse button is
                    // released.

                    // Original position to calculate the delta.
                    let startX = e.pageX;
                    let startY = e.pageY;

                    // Attach mousemove event listener. Need to remove it
                    // later, so use a variable for the callback.
                    let mouseMoveCallback = (e) => {
                        sendDeltaScrollMessage({
                            deltaX: e.pageX - startX,
                            deltaY: e.pageY - startY,
                        });
                        startX = e.pageX;
                        startY = e.pageY;
                    };
                    sidebarRootElm.addEventListener(
                        'mousemove', mouseMoveCallback);

                    sidebarRootElm.addEventListener('mouseup', (e) => {
                        // Remove mousemove event listener on mouse up, we
                        // don't need it any more.
                        sidebarRootElm.removeEventListener(
                            'mousemove', mouseMoveCallback);
                    });
                }
            }
        });
    });
}
