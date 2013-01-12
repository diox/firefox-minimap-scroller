// Forked from https://builder.addons.mozilla.org/package/25177/revision/26/

const { Cc, Cu, Ci } = require('chrome'),
    WindowUtils = require('window-utils'),
    windows = require("windows").browserWindows,
    { BrowserWindow } = require('windows'),
    prefs = require('simple-prefs').prefs;

exports.sidebar = function(options){
    
    let sidebars = {
        instances: [],
    };

    sidebars.getSidebar = function(window){
        return sidebars.instances.filter(function(obj){
            return BrowserWindow(obj.window) == window;
        })[0];
    }
    
    sidebars.getActive = function(){
        let active = sidebars.getSidebar(windows.activeWindow);
        return active || false;
    }

    sidebars.changeVisibilityForAll = function(val) {
        sidebars.instances.forEach(function(item){
            item.visibility = val;
        });
    }

    sidebars.changeWidthPref = function(prefName) {
        let value = prefs[prefName];
        sidebars.instances.forEach(function(item){
            item.browser.style.width = value + 'px';
            item.vbox.width = value;
        });
        options.width = value + 'px';
    }

    sidebars.changePositionPref = function(prefName) {
        let value = prefs[prefName];
        sidebars.instances.forEach(function(sidebar) {
            if (sidebar.options.position != value) {
                // Before creating a new one, remove old splitter
                sidebar.splitter.parentNode.removeChild(sidebar.splitter);
                // Insert sidebar at new position
                sidebar._insertSidebar(sidebar.vbox, value);
                // Make sure the new splitter is correctly initialized by
                // calling show() / hide() according to sidebar.showing value
                if (sidebar.showing) {
                    sidebar.show();
                } else {
                    sidebar.hide();
                }
            }
        });
        options.position = value;  // all sidebar share the same options object
    }
    
    new WindowUtils.WindowTracker({
        onUntrack: function (window) {
            if (window.document.getElementById('sidebar-box')) {
                let sidebar = sidebars.getSidebar(BrowserWindow(window));
                if (sidebar) {
                    sidebar.destroy();
                }
            }
        },
        onTrack: function (window) {

            // window is a ChromeWindow here.
            // I just need the document, is there a way to do this with the clean
            // high level API ?
            
            let document = window.document,
                defaultSidebar = document.getElementById('sidebar-box');
            
            if (defaultSidebar){
                
                let sidebar = { elements: {} };

                sidebar.init = function() {
                    let uid = new Date().getTime();
                    let clone = defaultSidebar.cloneNode(true);
                    let parseElements = function(el){
                        if (el && el.tagName){
                            sidebar[el.tagName] = el;
                            if (el.id) el.id = el.id + '-' + uid;
                            let length =  el.childNodes.length;
                            if(length) for (let i = 0; i <= length; i++) parseElements(el.childNodes[i]);
                        }
                    };

                    parseElements(clone);
                    if (options.title) sidebar.sidebarheader.firstChild.textContent = options.title;
                    if (options.header === false) sidebar.sidebarheader.style.display = 'none';
                    if (options.contextid) sidebar.browser.setAttribute('context', options.contextid);

                    sidebar.browser.style.backgroundColor = '#ffffff';
                    sidebar.uid = uid
                    sidebar.window = window;
                    sidebar.options = options;
                    sidebar._insertSidebar(clone, sidebar.options.position);


                    sidebar.browser.addEventListener('DOMContentLoaded', sidebar.domready, false);
                    sidebar.toolbarbutton.oncommand = null;  // Don't disturb the real sidebars
                    sidebar.toolbarbutton.addEventListener('click', function(e) {
                        if (sidebar.options.closeButtonAction) {
                            sidebar.options.closeButtonAction(e);
                        } else {
                            sidebar.hide();
                        }
                        e.preventDefault();
                    }, false);

                    sidebar.show();
                    sidebar.hide();
                }

                sidebar._insertSidebar = function(vbox, position) {
                    let document = sidebar.window.document;
                    let splitter = splitter = document.getElementById('sidebar-splitter');

                    sidebar.splitter = splitter.cloneNode(true);
                    if (position !== 'undefined' && position == 'right') {
                        sidebar.splitter.id = 'sidebar-splitter-right';
                        document.getElementById('browser').appendChild(sidebar.splitter);
                        document.getElementById('browser').appendChild(vbox);
                    } else {
                        // we insert our own splitter right after the real one, and
                        // our sidebar in between.
                        sidebar.splitter.id = 'sidebar-splitter-left';
                        document.getElementById('browser').insertBefore(sidebar.splitter, splitter.nextSibling);
                        document.getElementById('browser').insertBefore(vbox, sidebar.splitter);
                    }
                }
                
                sidebar.injectAssets = function(assets){
                    let page = sidebar.browser.contentDocument;
                    if(page){
                        (assets.css || []).forEach(function(href){
                            let link = page.createElement('link');
                                link.rel = 'stylesheet';
                                link.type = 'text/css';
                                link.href = href + (href.split('?')[1] ? '&' : '?') + 'cacheBust=' + new Date().getTime();
                            
                            page.body.appendChild(link);
                        });
                        
                        (assets.js || []).forEach(function(src){
                            let script = page.createElement('script');
                                script.type = 'text/javascript';
                                script.src = src + (src.split('?')[1] ? '&' : '?') + 'cacheBust=' + new Date().getTime();
                            
                            page.body.appendChild(script);
                        });
                    }
                };
                
                sidebar.load = function(title, url){
                    sidebar.options.title = title ? title : sidebar.options.title || '';
                    sidebar.options.url = url ? url : sidebar.options.url || 'about:blank';
                    sidebar.browser.setAttribute('src', sidebar.options.url);
                    sidebar.vbox.setAttribute('src', sidebar.options.url);
                    sidebar.label.value = sidebar.options.title;
                    return sidebar;
                };
                
                sidebar.show = function(){
                    let width = sidebar.options.width || '300px';
                    sidebar.showing = true;
                    sidebar.browser.style.width = width;
                    sidebar.vbox.width = parseInt(width, 10);
                    sidebar.browser.style.maxWidth = sidebar.options.maxWidth || '400px';
                    sidebar.browser.style.minWidth = sidebar.options.minWidth || '200px';
                    sidebar.splitter.hidden = false;
                    sidebar.vbox.hidden = false;
                    let content = sidebar.browser.contentWindow;
                    if(!content || content.location != sidebar.options.url) sidebar.load();
                    sidebar.label.value = sidebar.options.title;
                    return sidebar;
                };
                
                sidebar.hide = function(){
                    sidebar.vbox.hidden = true;
                    sidebar.splitter.hidden = true;
                    sidebar.showing = false;
                    return sidebar;
                };

                sidebar.__defineSetter__("visibility", function(val) {
                    if (val) {
                        sidebar.show();
                    } else {
                        sidebar.hide();
                    }
                });
                
                sidebar.close = function(document){
                    sidebar.hide();
                    sidebar.label.value = '';
                    sidebar.browser.setAttribute('src', 'about:blank');
                    sidebar.vbox.setAttribute('src', 'about:blank');
                    return sidebar;
                };
                
                sidebar.destroy = function(){
                    (sidebar.options.onDestroy || function(){}).call(sidebar, this);
                    document.getElementById('browser').removeChild(sidebar.vbox);
                    document.getElementById('browser').removeChild(sidebar.splitter);
                    // remove corresponding sidebar from instances array
                    sidebars.instances = sidebars.instances.filter(function(item) {
                        return item != sidebar;
                    });
                };
                
                sidebar.domready = function(){
                    (sidebar.options.onDomReady || function(){}).call(sidebar, this);
                }

                sidebar.init();
                sidebars.instances.push(sidebar);
            }
        }
    
    });
    
    require('unload').when(function(event){
        if (event == 'uninstall' || event == 'upgrade' || event == 'disable') {
            sidebars.instances.forEach(function(object){
                object.destroy();
            })
        }
    });
    
    return sidebars;
    
};