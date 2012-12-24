// FIXME: find a way to use MozAfterPaint.

// Listen to scroll event (document)
document.addEventListener('scroll', function(e) {
    self.port.emit('scroll');
});

// Listen to resize event (window)
document.defaultView.addEventListener('resize', function(e) {
    self.port.emit('resize');
});

// listen to load event (window)
document.defaultView.addEventListener('load', function(e) {
    self.port.emit('load');
});

// listen to DOM changes
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

// manually emit a "load" once, since load event has probably happened already
self.port.emit('load');