Firefox Minimap Scroller Sidebar Add-on
=======================================

Description
-----------

Firefox Minimap Scroller Sidebar Add-on adds a special sidebar to your browser
which displays a small minimap representing the document inside your current
active tab and its visible area. You can use this minimap to navigate around 
the document, scroll clickly to a specific element, etc.

The minimap and the rectangle showing the visible area are updated when you
scroll, resize, change page etc (Unfortunately for the moment it can not react
to CSS-only changes, but it does change when new elements are added).

This was inspired by the minimap feature found in many games and text editors,
particularly Sublime Text 2.

Note that this add-on is fairly experimental, and probably not very useful. It
was more of a fun exercice to write. Don't expect a lot of support.


Installation instructions
-------------------------

The add-on is available on AMO: 
https://addons.mozilla.org/en-US/firefox/addon/minimap-scroller-sidebar/

To develop, use `web-ext run` command from this directory or install the add-on
temporarily using `about:debugging`.

TODO
----

- Stop re-drawing that much, particularly when switching tabs. There are two
  parts to this: better, more specific events need to be used instead of the
  super generic browser.tabs.onUpdated, and also maybe storing a canvas for
  every tab, updating it in the background, and show the right one when
  activating a tab. I'm not sure it's completely useful: it would certainly
  incur an important memory penalty, and for the moment switching tabs seems
  pretty fast.

- Find a way to use MozAfterPaint to be able to react to CSS-only changes.

- Show sidebar on the right. This would require new APIs in Firefox itself.
  In the meantime, it's possible to do this using userChrome.css.

- Find a way to have proper unit and integration tests of the add-on.

- Clean up code.
