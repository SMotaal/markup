import * as modes from './markup-modes.js';
import * as dom from './markup-dom.js';
import * as api from './markup-parser.js';
// import * as patterns from './markup-patterns.js';

export let initialized;

export const ready = (async () => void (await modes.ready))();

const initialize = () =>
  initialized ||
  (initialized = async () => {
    const {createFragment, supported} = dom;

    /**
     * Temporary template element for rendering
     * @type {HTMLTemplateElement?}
     */
    const template =
      supported &&
      (template =>
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
        template)(document.createElement('template'));

    // console.log({document, template, createFragment});

    /// API
    const syntaxes = {}; // default: api.syntaxes.default
    const renderers = {};
    const defaults = {...api.defaults};

    await ready;
    /// Defaults
    modes.install(defaults, syntaxes); // reset defaults.syntaxes
    dom.install(defaults, renderers); // reset defaults.renderers

    tokenize = (source, options) => api.tokenize(source, {options}, defaults);

    render = async (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = api.render(source, options, defaults);
      let first = await elements.next();

      if (first && 'value' in first) {
        if ('push' in fragment) {
          fragment.push(first.value);
          if (!first.done) for await (const element of elements) fragment.push(element);
        } else if ('append' in fragment && first.value.nodeType >= 1) {
          fragment.append(first.value);
          if (!first.done) for await (const element of elements) fragment.append(element);
        } else if ('textContent' in fragment) {
          let text = `${first.value}`;
          if (!first.done) for await (const element of elements) text += `${element}`;
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

    initialized = true;

    return markup;
  })();

export let render = async (source, options) => {
  await initialize();
  return await render(source, options);
};

export let tokenize = (source, options) => {
  if (!initialized)
    throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
  else if (initialized.then)
    Error(`Markup: tokenize(…) called during initialization. ${Messages.InitializeFirst}`);
  return markup.tokenize(source, options);
};

const keyFrom = options => (options && JSON.stringify(options)) || '';
const skim = iterable => {
  for (const item of iterable);
};

export const warmup = async (source, options) => {
  const key = (options && keyFrom(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  await (initialized || initialize());
  // let tokens;
  cache.has(source) || (skim(tokenize(source, options)), cache.add(source));
  // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
  return true;
};

export const markup = Object.create(api, {
  initialize: {get: () => initialize},
  render: {get: () => render},
  tokenize: {get: () => tokenize},
  warmup: {get: () => warmup},
  dom: {get: () => dom},
  modes: {get: () => api.modes},
});

/// CONSTANTS

const Messages = {
  InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
};

export default markup;

// /// GLOBALS
// const document = ('object' === typeof scope.document && scope.document) || false;
// const supportsElements = document && 'function' === typeof document.createElement;
// const createFragment =
//   document && 'function' === typeof document.createDocumentFragment
//     ? () => document.createDocumentFragment()
//     : Array;
