{
  import { default_settings } from '../settings';

  const saveOptions = (e) => {
    /*browser.storage.sync.set({
      colour: document.querySelector("#colour").value
    });*/
    // FIXME: store the settings as json in 'settings'.
    e.preventDefault();
  }

  const restoreOptions = () => {
    let settings = await browser.storage.sync.get('settings');
    if (true || !settings) {
      // FIXME: import this from a module that is also available from the
      // sidebar - also do not set them in sidebar.css then, find a way to
      // initialize this correctly.
    }

    // for machin settings create the inputs and add a submit button.
  }

  document.addEventListener('DOMContentLoaded', restoreOptions);
  document.querySelector('form').addEventListener('submit', saveOptions);
}
