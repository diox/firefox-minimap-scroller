Firefox Minimap Scroller
========================

Description
-----------

Firefox Minimap Scroller addon adds a special sidebar to your browser which
displays a small minimap representing the document inside your current active 
tab and its visible area. You can use this minimap to navigate around the 
document, scroll clickly to a specific element, etc.

The minimap and the rectangle showing the visible area are updated when you
scroll, resize, change page etc (Unfortunately for the moment it can not react
to CSS-only changes, but it does change when new elements are added).

This was inspired by the minimap feature found in many games and text editors,
particularly Sublime Text 2. 

Current state and roadmap
-------------------------

Current version is 0.0.6. It's very much **experimental**, may crash your 
computer, have horrible memory leaks, be terribly slow, etc, so for the moment,
don't bother reporting these kind of issues unless you can tell me how to fix
them :-)

Here are the main issues I plan to fix before considering the addon somewhat
"stable":

- Stop re-drawing when switching tabs. This means storing a canvas for every
  tab, updating it in the background, and show the right one when activating a
  tab.

- Have minimap auto-scroll when it's not big enough to represent the full
  document (essential for long pages).

- Find a way to use MozAfterPaint to be able to react to CSS-only changes.
  Investigate whether it could eventually replace the whole content-script 
  or not.  

- Make sidebar accessible, include menu-item to de-activate it or move it
  to the side.

- Properly test de-activation and re-activation, including with multiple windows
  and tabs. In fact, try to find a way to properly test the addon :-)

- Clean up code