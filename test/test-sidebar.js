var SideBar = require('sidebar').sidebar;
var windows = require('windows').browserWindows;


exports['test sidebar aync'] = function(assert, done) {
    let sidebars = SideBar({
        onDomReady: function(sidebar) {
            assert.equal(sidebars.instances.length, 1, 'Creating an instance works');
            done();
        }
    });
};

exports['test sidebar browserwindows async'] = function(assert, done) {
    let sidebars = SideBar({});

    windows.open({
        url: 'about:blank',
        onOpen: function(window) {
            assert.equal(sidebars.instances.length, 2, 'Automatically creating a sidebar for each window works');
            window.close(function() {
                assert.equal(sidebars.instances.length, 1, 'Automatically removing sidebars when closing a window works');
                done();
            });
        },
        
    });               
};

exports['test sidebar getSidebar async'] = function(assert, done) {
    let sidebars = SideBar({
        onDomReady: function(sidebar) {
            assert.equal(sidebars.instances[0], sidebars.getSidebar(windows.activeWindow), 'getSidebar(activeWindow) returns the correct sidebar');
        }
    });

    windows.open({
        url: 'about:blank',
        onOpen: function(window) {
            assert.equal(sidebars.instances[1], sidebars.getSidebar(window), 'getSidebar(window) returns the correct sidebar');
            window.close(function() {
                assert.equal(sidebars.instances.length, 1, 'No sidebar is left on closing (in getSidebar)');
                done(); 
            });
        }
    });
};

exports['test sidebar getActive async'] = function(assert, done) {    
    let sidebars = SideBar({});
    assert.equal(sidebars.instances[0], sidebars.getActive(), 'getActive() returns the correct sidebar (default window)');

    windows.open({
        url: 'about:blank',
        onOpen: function(window) {
            window.activate();  // activate() doesn't take a callback, I'm assuming it's not async...
            assert.equal(sidebars.instances[1], sidebars.getActive(), 'getActive() returns the correct sidebar (new window is activated)');
            window.close(function(window) {
                assert.equal(sidebars.instances.length, 1, 'No sidebar is left on closing (in getActive)');
                done();
            });
        }
    });
};

exports['test sidebar nonbrowserwindows'] = function(assert) {
    let sidebars = SideBar({});
    let { open } = require('api-utils/window/utils');
    let win = open('data:text/html,Hello Window');
    assert.equal(sidebars.instances.length, 1, 'No sidebar is created for non browser windows');
    win.close();
    assert.equal(sidebars.instances.length, 1, 'No sidebar is destroyed for non browser windows');    
};

require('test').run(exports);
