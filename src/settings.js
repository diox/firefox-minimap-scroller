/* global browser */
/*
 * This file should be a module but unfortunately Firefox doesn't support them
 * and I don't want to include a bundler or transpiler yet. So this just lives
 * in the global scope, included via <script>, old-school style.
 */
const defaultSettings = [
    {
        name: 'sidebar-background-color',
        type: 'color',
        label: 'Sidebar background color',
        value: '#FFFFFF',
    },
    {
        name: 'scroller-background-color',
        type: 'color',
        label: 'Scroller background color',
        value: '#646464',
    },
    {
        name: 'scroller-outline-color',
        type: 'color',
        label: 'Scroller outline color',
        value: '#000000',
    },
    {
        name: 'scroller-opacity',
        type: 'number',
        label: 'Scroller opacity',
        value: '0.3',
        attributes: {
            max: '1.0',
            min: '0.0',
            step: '0.1',
        }
    },
];

/* exported readSettings */
const readSettings = async () => {
    let value = await browser.storage.sync.get('settings');
    if (!value) {
        return defaultSettings;
    }
    return value.settings;
}

/* exported writeSettings */
const writeSettings = async (data) => {
    await browser.storage.sync.set({settings: data});
}
