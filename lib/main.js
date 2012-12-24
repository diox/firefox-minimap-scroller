const tabs = require("tabs");
const windows = require("windows");
const self = require("self");
const pageMod = require("page-mod");
const sideBar = require('sidebar').sidebar;
const miniMap = require("minimap");

function shouldICare(tab) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    // FIXME: does not work with multiple windows anyway...
    if (tab != tabs.activeTab) {
        // console.warn('Call from ' + tab.url + ' is ignored, not the active tab');
        return false;
    }
    return true;
}

function init() {
    let sidebar = this;
    let minimap = new miniMap.Minimap(sidebar);

    pageMod.PageMod({
        include: "*",
        contentScriptFile: self.data.url('content-notifychanges.js'),
        onAttach: function(worker) {
            worker.port.on('resize', function(e) {
                if (shouldICare(worker.tab)) {
                    minimap.drawMinimap();
                }
            });

            worker.port.on('load', function(e) {
                if (shouldICare(worker.tab)) {
                    minimap.drawMinimap();
                }
            });

            worker.port.on('scroll', function(e) {
                if (shouldICare(worker.tab)) {
                    minimap.drawScroller();
                }
            });

            worker.port.on('mutation', function(e) {
                if (shouldICare(worker.tab)) {
                    minimap.drawMinimap();
                }
            })
        }
    });    

    tabs.on('activate', function(tab) {
        // Redraw on activate since for the moment we only have one main
        // canvas that needs to be redrawn everytime we change tabs.
        minimap.drawMinimap();
    });

    tabs.on('ready', function(tab){        
        if (shouldICare(tab)) {
            // Hack: active tab is ready, let's redraw in case it wasn't when
            // it was activated. 
            minimap.drawMinimap();
        }
    });
}

function createSideBar(window) {
    let sidebars = sideBar({
        'url': self.data.url('sidebar.html'),
        'title': 'Minimap Scroller Sidebar',
        'right': true,
        'width': '200px',
        'onDomReady': init
    });

    let current = sidebars.getSidebar(window);
    if (current) {
        current.show();
    } else {
        console.warn('Could not find sidebar for window');
        console.warn(window);
    }
}

for each (var window in windows.browserWindows) {
    createSideBar(window);
}
windows.browserWindows.on('open', function(window) {
    createSideBar(window);
});