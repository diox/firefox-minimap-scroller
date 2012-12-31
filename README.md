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

Current version is 0.0.8. It's very much **experimental**, may crash your 
computer, have horrible memory leaks, be terribly slow, etc, so for the moment,
don't bother reporting these kind of issues unless you can tell me how to fix
them :-)

Here are the main issues I plan to fix before considering the addon somewhat
"stable":

- Stop re-drawing when switching tabs. This means storing a canvas for every
  tab, updating it in the background, and show the right one when activating a
  tab.

- Find a way to use MozAfterPaint to be able to react to CSS-only changes.
  Investigate whether it could eventually replace the whole content-script 
  or not.  

- Make sidebar accessible, include menu-item to de-activate it or move it
  to the side.

- Find a way to properly unit test the addon

- Clean up code


Installation instructions
-------------------------

You'll have to package the extension yourself to test it since it's not
distributed anywhere at the moment.

- Install the [Add-on SDK][].

- Once inside the SDK environnement (having activated it using ``source
  bin/activate``), go to the add-on directory, and run `cfx xpi`.

- Drag & drop the resulting xpi to firefox.

[Add-on SDK]: https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/installation.html

If by chance (?) you're running Archlinux (or some other distribution that uses
py3k by default), activating the add-on sdk will display an error message:

> Error: You appear to be using Python 3, but the Add-on SDK only supports the
> Python 2.x line.

The fix is easy:

1. symlink your python2 executable to the add-on sdk bin folder
2. change your path before activating the SDK

    $ cd /path/to/addon-sdk/
    $ ln -s /usr/bin/python2 bin/
    $ export PATH=`pwd`/bin:$PATH
    $ source bin/activate
    $ cd /path/to/firefox-minimap-scroller/
    $ cfx xpi


The mandatory screenshot
------------------------

![The mandatory screenshot](https://raw.github.com/diox/firefox-minimap-scroller/master/doc/screenshots/screen1.png)
