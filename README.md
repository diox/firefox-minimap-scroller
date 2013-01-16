Firefox Minimap Scroller Sidebar Addon
======================================

Description
-----------

Firefox Minimap Scroller Sidebar Addon adds a special sidebar to your browser
which displays a small minimap representing the document inside your current
active tab and its visible area. You can use this minimap to navigate around 
the document, scroll clickly to a specific element, etc.

The minimap and the rectangle showing the visible area are updated when you
scroll, resize, change page etc (Unfortunately for the moment it can not react
to CSS-only changes, but it does change when new elements are added).

This was inspired by the minimap feature found in many games and text editors,
particularly Sublime Text 2. 


Preview
-------

Here is what it looks like:

![Image Preview][Image Preview]

In addition, I made a small [screencast][Video Preview] (OGV format, 50 seconds,
no sound) demonstrating the addon.

[Image Preview]: http://virgule.net/tmp/firefox-minimap-scroller-0.0.8.jpg
[Video Preview]: http://virgule.net/tmp/firefox-minimap-scroller-0.0.8.ogv


Installation instructions
-------------------------

You'll have to package the extension yourself to test it since it's not
distributed anywhere at the moment.

- Make sure you have an updated checkout of the repository and its git
  submodules.

- Install the [Add-on SDK][].

- Once inside the SDK environnement (having activated it using `source
  bin/activate`), go to the add-on directory, and run `cfx run` to quickly test
  that everything is OK, and `cfx xpi` to generate the addon file.

- Drag & drop the resulting xpi to firefox.

**Note:** If your OS uses uses py3k by default, activating the add-on sdk will
display an error message:

> Error: You appear to be using Python 3, but the Add-on SDK only supports the
> Python 2.x line.

The workaround is easy:

1. Symlink your python2 executable to the add-on sdk bin folder
2. Change your path before activating the SDK

```shell
    $ cd /path/to/addon-sdk/
    $ ln -s /usr/bin/python2 bin/
    $ export PATH=`pwd`/bin:$PATH
    $ source bin/activate
    $ cd /path/to/firefox-minimap-scroller/
    $ cfx xpi
```

[Add-on SDK]: https://addons.mozilla.org/en-US/developers/docs/sdk/latest/dev-guide/tutorials/installation.html


Roadmap
-------

Here are the main issues I plan to adress before making a real release of the 
add-on and distribute it "officially":

- Stop re-drawing when switching tabs. This means storing a canvas for every
  tab, updating it in the background, and show the right one when activating a
  tab. I'm not sure it's completely useful: it would certainly incur an 
  important memory penalty, and for the moment switching tabs seems pretty fast,
  at least on my machine.

- Find a way to use MozAfterPaint to be able to react to CSS-only changes.
  Investigate whether it could eventually replace the whole content-script 
  or not. 

- Fix sidebar menu item to be able to show/hide sidebar independently on each
  window. This requires some ugly hacks or a propre fix in the external 
  menuitems library.

- Find a way to properly unit test the add-on.

- Clean up code.