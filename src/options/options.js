/* global readSettings, writeSettings */
{
    const saveOptions = (e) => {
        /**
         * Event handler saving the options when a form element is changed.
         * It rebuilds the settings dict entirely from the form data and
         * saves it to storage - the rebuilding is a bit annoying, but
         * there aren't too many options for now.
         */
        let settings = [];
        for (let elm of e.currentTarget.elements) {
            let item = {
                attributes: {},
                type: elm.type,
                name: elm.name,
                value: elm.value,
                label: elm.labels[0].innerText,
            };
            // We have to rebuild everything... including special attributes.
            for (let attribute of ['max', 'min', 'step']) {
                if (elm[attribute] !== '') {
                    item.attributes[attribute] = elm[attribute];
                }
            }
            settings.push(item);
        }
        writeSettings(settings);
    }

    const restoreOptions = () => {
        let form = document.querySelector('form');
        readSettings().then((settings) => {
            // FIXME: trusting only the settings from storage sucks - if there
            // is ever garbage data in it, it's going to be wrong forever. We
            // need some kind of validation...
            for (let item of settings) {
                let input = document.createElement('input');
                input.type = item.type;
                input.name = item.name;
                input.value = item.value;
                if (item.hasOwnProperty('attributes')) {
                    for (let key of Object.keys(item.attributes)) {
                        input[key] = item.attributes[key];
                    }
                }
                let label = document.createElement('label');
                label.innerText = item.label;
                label.appendChild(input);
                form.appendChild(label);
            }
            form.addEventListener('change', saveOptions);
            document.body.appendChild(form);
        });
    }

    document.addEventListener('DOMContentLoaded', restoreOptions);
}
