// Forked from https://builder.addons.mozilla.org/package/25177/revision/26/

const { Cc, Cu, Ci } = require('chrome'),
    WindowUtils = require('window-utils'),
    windows = require("windows").browserWindows,
    { BrowserWindow } = require('windows')

exports.sidebar = function(options){
    
    var sidebars = {
        instances: [],
    };

    sidebars.getSidebar = function(window){
        return sidebars.instances.filter(function(obj){
            return BrowserWindow(obj.window) == window;
        })[0];
    }
    
    sidebars.getActive = function(){
        var active = sidebars.getSidebar(windows.activeWindow);
        return active || false;
    }
    
    new WindowUtils.WindowTracker({
        onTrack: function (window) {

            // window is a ChromeWindow here.
            // I just need the document, is there a way to do this with the clean
            // high level API ?
            
            var document = window.document,
                defaultSidebar = document.getElementById('sidebar-box');
            
            if (defaultSidebar){
                
                var sidebar = { elements: {} },
                    uid = new Date().getTime(),
                    clone = defaultSidebar.cloneNode(true),
                    splitter = document.getElementById('sidebar-splitter'),
                    parseElements = function(el){
                        if (el && el.tagName){
                            sidebar[el.tagName] = el;
                            if (el.id) el.id = el.id + '-' + uid;
                            var length =  el.childNodes.length;
                            if(length) for (var i = 0; i <= length; i++) parseElements(el.childNodes[i]);
                        }
                    };
                
                parseElements(clone);
                if (options.title) sidebar.sidebarheader.firstChild.textContent = options.title;
                if (options.header === false) sidebar.sidebarheader.style.display = 'none';
                
                sidebar.browser.style.backgroundColor = '#ffffff';
                sidebar.uid = uid
                sidebar.window = window;
                sidebar.options = options;

                if (typeof options.right !== 'undefined' && options.right) {
                    splitter = splitter.cloneNode(true);
                    splitter.id = 'sidebar-splitter-right';
                    document.getElementById('browser').appendChild(splitter);
                    document.getElementById('browser').appendChild(clone);
                } else {                
                    document.getElementById('browser').insertBefore(clone, splitter);
                }
                
                sidebar.injectAssets = function(assets){
                    var page = sidebar.browser.contentDocument;
                    if(page){
                        (assets.css || []).forEach(function(href){
                            var link = page.createElement('link');
                                link.rel = 'stylesheet';
                                link.type = 'text/css';
                                link.href = href + (href.split('?')[1] ? '&' : '?') + 'cacheBust=' + new Date().getTime();
                            
                            page.body.appendChild(link);
                        });
                        
                        (assets.js || []).forEach(function(src){
                            var script = page.createElement('script');   
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
                    sidebar.showing = true;
                    sidebar.browser.style.width = sidebar.options.width || '300px';
                    sidebar.browser.style.maxWidth = sidebar.options.maxWidth || '400px';
                    sidebar.browser.style.minWidth = sidebar.options.minWidth || '200px';
                    splitter.hidden = false;
                    sidebar.vbox.hidden = false;
                    var content = sidebar.browser.contentWindow;
                    if(!content || content.location != sidebar.options.url) sidebar.load();
                    sidebar.label.value = sidebar.options.title;
                    return sidebar;
                };
                
                sidebar.hide = function(document){
                    sidebar.vbox.hidden = true;
                    splitter.hidden = true;
                    sidebar.showing = false;
                    return sidebar;
                };
                
                sidebar.close = function(document){
                    sidebar.hide();
                    sidebar.label.value = '';
                    sidebar.browser.setAttribute('src', 'about:blank');
                    sidebar.vbox.setAttribute('src', 'about:blank');
                    return sidebar;
                };
                
                sidebar.destroy = function(){
                    document.getElementById('browser').removeChild(sidebar.vbox);
                };
                
                sidebar.domready = function(){
                    (sidebar.options.onDomReady || function(){}).call(sidebar, this);
                }
                
                sidebar.browser.addEventListener('DOMContentLoaded', sidebar.domready, false);
                sidebar.toolbarbutton.addEventListener('click', sidebar[sidebar.options.closeButtonAction || 'hide'], false);
                
                sidebar.show();
                sidebar.hide();
                
            }

            if(sidebar) sidebars.instances.push(sidebar);
            
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