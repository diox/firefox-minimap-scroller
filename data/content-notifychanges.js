// FIXME: find a way to use MozAfterPaint.

// Listen to scroll event (document)
document.addEventListener('scroll', function(e) {
    self.port.emit('scroll');
});

// listen to DOMContentLoaded event (document)
document.addEventListener('DOMContentLoaded', function(e) {
    self.port.emit('DOMContentLoaded');

    // listen to DOM changes once DOM is ready
    var observer = new MutationObserver(function(mutations) {
        // Delay sending dom changes to prevent useless and costly redraws
        if (!observer._timeout) {
            observer._timeout = setTimeout(function() {
                self.port.emit('mutation');
                observer._timeout = null;
            }, 1000);
        }
    });
    observer._timeout = null;
    observer.observe(document.body, {
        subtree: true,
        attributes: false,
        childList: true,
        characterData: true
    });
});

// Listen to resize event (window)
document.defaultView.addEventListener('resize', function(e) {
    self.port.emit('resize');
});

// listen to load event (window)
document.defaultView.addEventListener('load', function(e) {
    self.port.emit('load');
});