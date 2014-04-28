const tabs = require('sdk/tabs');
const windows = require('sdk/windows');
const self = require('sdk/self');
const pageMod = require('sdk/page-mod');
const { sidebars, sideBar } = require('sidebar');
const miniMap = require('minimap');
const simplePrefs = require('sdk/simple-prefs');
const menuItems = require('menuitems');

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

function getActiveMinimap() {
    return getMinimap(tabs.activeTab);
}

function init() {
    // FIXME: move pageMod stuff to separate function & file
    exports['pagemod'] = pageMod.PageMod({
        include: '*',
        contentScriptFile: self.data.url('content-notifychanges.js'),
        contentScriptWhen: 'start',
        attachTo: ['existing', 'top'],  // FIXME: no frames for now
        onAttach: function(worker) {

            worker.port.on('resize', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap('resize');
                    }
                }
            });

            worker.port.on('load', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap('load');
                    }
                }
            });

            worker.port.on('DOMContentLoaded', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap('DOMContentLoaded');
                    }
                }
            });

            worker.port.on('scroll', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawScroller('scroll');
                    }
                }
            });

            worker.port.on('mutation', function(e) {
                if (shouldICare(worker.tab)) {
                    let minimap = getMinimap(worker.tab);
                    if (minimap) {
                        minimap.drawMinimap('mutation');
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
            minimap.drawMinimap('activate');
        }
    });

    sideBar({
        url: self.data.url('sidebar.html'),
        title: 'Minimap',
        position: simplePrefs.prefs.sidebarPosition,
        width: simplePrefs.prefs.sidebarWidth + 'px',
        minWidth: '50px',
        maxWidth: '960px',
        onDomReady: initSidebar,
        onDestroy: destroySidebar,
        closeButtonAction: function closeSidebar() {
            // FIXME: Because menuitems created with menuitems package share
            // state across windows, we can't let the user close the sidebar in
            // the current window without affecting the others...
            // Therefore, close them all for now.
            changeSidebarVisibility(false);
        },
        contextid: 'contextMinimapSidebar',
    });

    simplePrefs.on('sidebarWidth', sidebars.changeWidthPref);
    simplePrefs.on('sidebarPosition', sidebars.changePositionPref);

    // Create menupopup holding our context menu items
    require('menupopup').menupopup({
        id: 'contextMinimapSidebar',
        parentid: 'mainPopupSet',
        position: 'end_before'
    });

    // Create the context menu items
    sidebars.contextmenu = [];
    sidebars.contextmenu.push(menuItems.Menuitem({
        id: 'reloadMinimapSidebar',
        menuid: 'contextMinimapSidebar',
        label: 'Reload This Minimap',
        onCommand: function() {
            let minimap = getActiveMinimap();
            if (minimap) {
                minimap.drawMinimap('reload');
            }
        }
    }));

    sidebars.hotkey = require('xulkeys').XulKey({
        id: 'viewMinimapSidebarKb',
        modifiers: 'control',
        key: 'M',
        onCommand: function() {
            changeSidebarVisibility(!sidebars.menuitem.checked);
        }
    });

    sidebars.menuitem = menuItems.Menuitem({
        id: 'viewMinimapSidebar',
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

    windows.browserWindows.on('open', function(window) {
        let sidebar = sidebars.getSidebar(window);
        if (sidebar) {
            sidebar.visibility = sidebars.shown;
        }
        // Hack to workaround a race condition between menuitems and menupopup:
        // Somehow, the menuitems are created on each window before the 
        // menupopup, and this causes the menuitem not to be attached. To work
        // around this, we re-set the menuid property on the corresponding 
        // menuitems to force them to be re-attached, since by the time we reach
        // browserWindows 'open' event, our menupopup will have been created...
        // Hopefully.
        sidebars.contextmenu.forEach(function(menuitem) {
            menuitem.menuid = menuitem.menuid;
        });
    });

    changeSidebarVisibility(true);
}

init();