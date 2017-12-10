{
    browser.browserAction.onClicked.addListener(() => {
        // FIXME: implement this. Requires storing global state for each
        // window as there is no API to check whether the sidebar is opened.
        let isSidebarOpenedInCurrentWindow = false;
        if (isSidebarOpenedInCurrentWindow) {
            browser.sidebarAction.close();
        } else {
            browser.sidebarAction.open();
        }
    });
}
