import * as modes from './markup-modes.js';
import * as dom from './markup-dom.js';
import * as api from './markup-parser.js';

const initialize = () => {
  /// GLOBALS
  const document = ('object' === typeof scope.document && scope.document) || false;
  const supportsElements = document && 'function' === typeof document.createElement;
  const createFragment =
    document && 'function' === typeof document.createDocumentFragment
      ? () => document.createDocumentFragment()
      : Array;

  /**
   * Temporary template element for rendering
   * @type {HTMLTemplateElement?}
   */
  const template =
    supportsElements &&
    (template =>
      'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
      template)(document.createElement('template'));

  // console.log({document, template, createFragment});

  /// API
  const syntaxes = {};
  const renderers = {};
  const defaults = {...api.defaults};

  modes.install(defaults, syntaxes); // reset defaults.syntaxes
  dom.install(defaults, renderers); // reset defaults.renderers

  tokenize = (source, options) => api.tokenize(source, {options}, defaults);

  render = (source, options) => {
    const fragment = options.fragment || createFragment();

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
        if (!first.done) for (const element of elements) text += `${element}`;
        if (template) {
          template.innerHTML = text;
          fragment.appendChild(template.content);
        } else {
          // TODO: Find a workaround for DocumentFragment.innerHTML
          fragment.innerHTML = text;
        }
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

export const markup = Object.create(api, {
  initialize: {get: () => initialize},
  render: {get: () => render},
  tokenize: {get: () => tokenize},
  dom: {get: () => dom},
  modes: {get: () => api.modes},
});

/// SCOPE
const scope =
  // Browser Scope
  ('object' === typeof self && self === (self || 0).self && self) ||
  // Node.js Scope
  ('object' === typeof global && global === (global || 0).global && global) ||
  // Unknown Scope
  Object.create(null, {[Symbol.toStringTag]: {value: 'UnknownScope'}});

export default markup;
