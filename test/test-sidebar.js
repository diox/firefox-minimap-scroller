const { sidebars, SideBar } = require('sidebar');
const windows = require('sdk/windows').browserWindows;


exports['test sidebar creation aync'] = function(assert, done) {
    var s = new SideBar({
        onDomReady: function(sidebar) {
            assert.equal(sidebars.instances.length, 1, 'Creating an instance works');
            s.unload();
            done();
        }
    });
};

exports['test sidebar creation new windows async'] = function(assert, done) {
    var s = SideBar({});
    assert.equal(windows.length, 1);
    assert.equal(sidebars.instances.length, windows.length, 'Initializing SideBar creates a sidebar for the first window.');

    windows.open({
        url: 'about:blank',
        onOpen: function(window) {
            assert.equal(windows.length, 2);
            assert.equal(sidebars.instances.length, windows.length, 'Automatically creating a sidebar for each window works');
            window.close(function() {
                assert.equal(windows.length, 1);
                assert.equal(sidebars.instances.length, windows.length, 'Automatically removing sidebars when closing a window works');
                s.unload();
                done();
            });
        },
        
    });               
};

exports['test sidebar getSidebar async'] = function(assert, done) {
    var s = SideBar({
        onDomReady: function(sidebar) {
            assert.equal(sidebars.instances[0], sidebars.getSidebar(windows.activeWindow), 'getSidebar(activeWindow) returns the correct sidebar');

            windows.open({
                url: 'about:blank',
                onOpen: function(window) {
                    assert.equal(sidebars.instances[1], sidebars.getSidebar(window), 'getSidebar(window) returns the correct sidebar');
                    window.close(function() {
                        assert.equal(sidebars.instances.length, 1, 'No sidebar is left on closing (in getSidebar)');
                        s.unload();
                        done();
                    });
                }
            });
        }
    });
};

exports['test sidebar getActive async'] = function(assert, done) {    
    var s = SideBar({});
    assert.equal(sidebars.instances[0], sidebars.getActive(), 'getActive() returns the correct sidebar (default window)');

    windows.open({
        url: 'about:blank',
        onOpen: function(window) {
            window.activate();  // activate() doesn't take a callback, I'm assuming it's not async...
            assert.equal(sidebars.instances[1], sidebars.getActive(), 'getActive() returns the correct sidebar (new window is activated)');
            window.close(function(window) {
                assert.equal(sidebars.instances.length, 1, 'No sidebar is left on closing (in getActive)');
                s.unload();
                done();
            });
        }
    });
};

exports['test sidebar nonbrowserwindows'] = function(assert) {
    var s = SideBar({});
    let { open } = require('sdk/window/utils');
    let win = open('data:text/html,Hello Window');
    assert.equal(sidebars.instances.length, 1, 'No sidebar is created for non browser windows');
    win.close();
    assert.equal(sidebars.instances.length, 1, 'No sidebar is destroyed for non browser windows');
    s.unload();
};

require('test').run(exports);
