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
        contentScriptWhen: 'start',
        attachTo: ['existing', 'top'],  // FIXME: no frames for now
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

            worker.port.on('DOMContentLoaded', function(e) {
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
}

var sidebars = sideBar({
    'url': self.data.url('sidebar.html'),
    'title': 'Minimap',
    'right': true,
    'width': '200px', // FIXME: remember user preference
    'minWidth': '150px',
    'onDomReady': init
});

for each (var window in windows.browserWindows) {
    let sidebar = sidebars.getSidebar(window);
    if (sidebar) {
        sidebar.show();
    }
}

windows.browserWindows.on('open', function(window) {
    let sidebar = sidebars.getSidebar(window);
    if (sidebar) {
        sidebar.show();
    }
});