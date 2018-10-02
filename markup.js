// Extended Features
import * as modes from './lib/markup-modes.js';
import * as dom from './lib/markup-dom.js';
import * as api from './lib/markup.js';

const initialize = () => {
  const defaults = {...api.defaults, syntaxes: {}};
  modes.install(defaults);
  dom.install(defaults);
  tokenize = (source, options) => api.tokenize(source, {options}, defaults);
  render = (source, options) => {
    const fragment =
      options.fragment ||
      (typeof document === 'object' &&
        document.createDocumentFragment &&
        document.createDocumentFragment()) ||
      [];
    const elements = api.render(source, options, defaults);
    let first = elements.next();

    if (first && 'value' in first) {
      if ('push' in fragment) {
        fragment.push(first.value);
        if (!first.done) for (const element of elements) fragment.push(element);
      } else if ('append' in fragment && first.value.nodeType >= 1) {
        fragment.append(first.value);
        if (!first.done) for (const element of elements) fragment.append(element);
      } else if ('textContent' in fragment) {
        let text = `${first.value}`;
        // fragment.textContent += `${first.value}`;
        if (!first.done) for (const element of elements) text += `${element}`;
        const template = document.createElement('template');
        template.innerHTML = text;
        fragment.appendChild(template.content);
        // fragment.appendChild(new Text(text));
      }
    }

    return fragment;
  };
  return markup;
};

export let render = (source, options) => {
  initialize();
  return render(source, options);
};
export let tokenize = (source, options) => {
  initialize();
  return tokenize(source, options);
};

export const markup = Object.create(
  api, {
    initialize: {get: () => initialize},
    render: {get: () => render},
    tokenize: {get: () => tokenize},
    dom: {get: () => dom},
  }
);

export default markup;
