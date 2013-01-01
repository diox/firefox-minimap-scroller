const tabs = require("tabs");
const windows = require("windows");
const self = require("self");
const pageMod = require("page-mod");
const sideBar = require('sidebar').sidebar;
const miniMap = require("minimap");

function shouldICare(tab) {
    // FIXME: this needs to be changed when working on background tabs
    // support (generate minimap even for non-active tab)
    for each (var window in windows.browserWindows) {
        if (tab == window.tabs.activeTab) {
            return true;
        }
    }
    console.warn('Call from ' + tab.url + ' is ignored, not the active tab in any window');
    return false;
}

function initSidebar() {
    this.minimap = new miniMap.Minimap(this);
}

function destroySidebar() {
    this.minimap = null;
}

function changeSidebarVisibility(val) {
    sidebars.menuitem.checked = val;
    sidebars.shown = val;
    sidebars.changeVisibilityForAll(val);
}

function getMinimap(targetTab) {
    let _window;

    for each (var window in windows.browserWindows) {
        for each (var tab in window.tabs) {
            if (tab == targetTab) {
                _window = window;
            }
        }
    }

    if (_window) {
        let sidebar = sidebars.getSidebar(_window);
        if (sidebar && sidebar.minimap) {
            return sidebar.minimap;
        }
    }

    return null;
}

function init() {
    pageMod.PageMod({
        include: "*",
        contentScriptFile: self.data.url('content-notifychanges.js'),
        contentScriptWhen: 'start',
        attachTo: ['existing', 'top'],  // FIXME: no frames for now
        onAttach: function(worker) {

            worker.port.on('resize', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap();
                    }
                }
            });

            worker.port.on('load', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap();
                    }
                }
            });

            worker.port.on('DOMContentLoaded', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap();
                    }
                }
            });

            worker.port.on('scroll', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawScroller();
                    }
                }
            });

            worker.port.on('mutation', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap();
                    }
                }
            })
        }
    });    

    tabs.on('activate', function(tab) {
        // Redraw on activate since for the moment we only have one main
        // canvas that needs to be redrawn everytime we change tabs.
        let minimap = getMinimap(tab);
        if (minimap) {
            minimap.drawMinimap();
        }
    });

    let sidebars = sideBar({
        'url': self.data.url('sidebar.html'),
        'title': 'Minimap',
        'right': true,
        'width': '200px', // FIXME: remember user preference
        'minWidth': '150px',
        'onDomReady': initSidebar,
        'onDestroy': destroySidebar,
        'closeButtonAction': function closeSidebar() {
            // FIXME: Because menuitems created with menuitems package share
            // state across windows, we can't let the user close the sidebar in
            // the current window without affecting the others...
            // Therefore, close them all for now.
            changeSidebarVisibility(false);
        },
    });

    windows.browserWindows.on('open', function(window) {
        let sidebar = sidebars.getSidebar(window);
        if (sidebar) {
            sidebar.visibility = sidebars.shown;
        }
    });


    sidebars.hotkey = require('xulkeys').XulKey({
        id: 'viewMinimapSidebarKb',
        modifiers: 'control',
        key: 'M',
        onCommand: function() {
            changeSidebarVisibility(!sidebars.menuitem.checked);
        }
    });

    sidebars.menuitem = require('menuitems').Menuitem({
        id: 'menu_minimapSidebar',
        menuid: 'viewSidebarMenu',
        key: 'viewMinimapSidebarKb',
        label: 'Minimap',
        checked: true,
        type: 'checkbox',
        autocheck: false,
        onCommand: function() {
            changeSidebarVisibility(!sidebars.menuitem.checked);
        },
        insertbefore: 'menu_bookmarksSidebar'
    });

    return sidebars;
}

var sidebars = init();
changeSidebarVisibility(true);