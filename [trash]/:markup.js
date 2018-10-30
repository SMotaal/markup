import * as modes from './lib/markup-modes.js';
import * as dom from './lib/markup-dom.js';
import * as api from './lib/markup.js';

const initialize = () => {
  /// SELF
  const self = (scope.self === scope && scope.self) || false;

  // if ('onmessage' in self && isFunction[typeof self.postMessage]) {
  //   if (self.window === self && isFunction[typeof self.Worker]) {
  //     // const worker = new Worker(import.meta.url, {type: 'module'});
  //     // const worker = new Worker(`${new URL('./worker.js', import.meta.url)}`, {type: 'module'});
  //     // const worker = new Worker(`${new URL('./lib/markup-legacy.js', import.meta.url)}`);
  //     // self.addEventListener('message', ({data}) => {});
  //   }
  // }

  /// DOM

  const document = (isObject[typeof scope.document] && scope.document) || false;
  const supportsElements = document && isFunction(document.createElement);
  const createFragment =
    document && isFunction(document.createDocumentFragment)
      ? () => document.createDocumentFragment()
      : Array;

  /** May hold a temporary template element for rendering */
  const template =
    supportsElements &&
    (template =>
      'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
      template)(document.createElement('template'));

  // console.log({self, document, template, createFragment});

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

export default markup;

/// HELPERS
const TypeOf = type =>
  TypeOf[type] ||
  (TypeOf[type] = Object.defineProperties(
    Object.setPrototypeOf(unknown => type === typeof unknown, null),
    Object.getOwnPropertyDescriptors(
      Object.freeze({
        boolean: type === 'boolean',
        number: type === 'number',
        bigint: type === 'bigint',
        string: type === 'string',
        symbol: type === 'symbol',
        object: type === 'object',
        function: type === 'function',
        undefined: type === 'undefined',
      }),
    ),
  ));

const isFunction = TypeOf('function');
const isObject = TypeOf('object');

/// SCOPE
const scope =
  // Browser Scope
  (isObject[typeof self] && self && self === self.self && self) ||
  // Node.js Scope
  (isObject[typeof global] && global && global === global.global && global) ||
  // Unknown Scope
  Object.create(null, {[Symbol.toStringTag]: {value: 'UnknownScope'}});

const supportsMessage = scope && 'onmessage' in scope && isFunction[typeof scope.postMessage];

if (supportsMessage) {
  if (scope.window === scope) {
  } else if (scope.self === 'self') {
    initialize();
    self.addEventListener('message', ({data}) => {});
  }
}

// if (import.meta.url.includes('#initialize')) initialize();
