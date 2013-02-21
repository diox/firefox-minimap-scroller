var main = require("main");
const windows = require('windows').browserWindows;
const tabs = require('tabs');
const self = require('self');
const timers = require('timers');
const { List } = require('sdk/util/list');
const { getActiveTab } = require('sdk/tabs/utils');
const { getMostRecentBrowserWindow } = require('sdk/window/utils');


exports["test pagemod load simple page async"] = function(assert, done) {
    var testUrl = self.data.url('tests/simple.html');

    main.pagemod.include.add(testUrl);
    main.pagemod.once("attach", function(worker) {
        let previousEvent;

        assert.equal(worker.tab.url, testUrl);

        worker.port.on('DOMContentLoaded', function(e) {
            previousEvent = 'DOMContentLoaded';
        });

        worker.port.on('load', function(e) {
            assert.equal(previousEvent, 'DOMContentLoaded');
            main.pagemod.include.remove(testUrl);
            done();
        });
    });
    tabs.open({ url: testUrl });
};

exports["test pagemod scroll simple page async"] = function(assert, done) {
    var testUrl = self.data.url('tests/simple-scroll.html');

    main.pagemod.include.add(testUrl);
    main.pagemod.once("attach", function(worker) {
        assert.equal(worker.tab.url, testUrl);
        worker.port.on('load', function(e) {
            let window = getMostRecentBrowserWindow();
            let tab = getActiveTab(window);
            let document = tab.linkedBrowser.contentWindow.document;
            document.documentElement.scrollTop = 100;  // force scrolling
        });

        worker.port.on('scroll', function(e) {
            main.pagemod.include.remove(testUrl);
            done();
        });
    });
    tabs.open({ url: testUrl });
};

exports["test pagemod mutation simple page async"] = function(assert, done) {
    var testUrl = self.data.url('tests/simple.html');

    main.pagemod.include.add(testUrl);
    main.pagemod.once("attach", function(worker) {
        assert.equal(worker.tab.url, testUrl);
        worker.port.on('load', function(e) {
            let window = getMostRecentBrowserWindow();
            let tab = getActiveTab(window);
            let document = tab.linkedBrowser.contentWindow.document;
            document.body.textContent = 'OK';  // force mutation
        });

        worker.port.on('mutation', function(e) {
            main.pagemod.include.remove(testUrl);
            done();
        });
    });
    tabs.open({ url: testUrl });
};

require("test").run(exports);
