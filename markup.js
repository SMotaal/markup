// Extended Features
import * as modes from './lib/markup-modes.js';
import * as dom from './lib/markup-dom.js';
import * as api from './lib/markup.js';

/** @type {api['markup']} */
export let markup = (source, options) => {
  const defaults = {...api.defaults, syntaxes: {}};
  modes.install(defaults);
  dom.supported && dom.install(defaults);
  // Object.setPrototypeOf(defaults, api.defaults);
  markup = (source, options) => api.markup(source, options, defaults);
  return markup(source, options);
};

export default Object.setPrototypeOf(
  {
    get markup() {
      return markup;
    },
    get dom() {
      return dom;
    },
  },
  api,
);
