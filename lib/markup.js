import * as modes from './markup-modes.js';
import * as dom from './markup-dom.js';
import * as parser from './markup-parser.js';
// import * as parser2 from '../packages/tokenizer/lib/parser.mjs';
// import '../packages/tokenizer/extensions/extensions.mjs';

export let initialized;

export const ready = (async () => void (await modes.ready))();

export const versions = [parser];

// const versions = [parser, parser2];

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
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) && template)(
        document.createElement('template'),
      );

    /// API
    const syntaxes = {};
    const renderers = {};
    const defaults = {...parser.defaults};

    await ready;
    /// Defaults
    modes.install(defaults, syntaxes);
    dom.install(defaults, renderers);

    // tokenize = (source, options) => parser.tokenize(source, {options}, defaults);
    tokenize = (source, options = {}) => {
      const version = options.version > 1 ? versions[options.version - 1] : versions[0];
      options.tokenize = (version || parser).tokenize;
      // const sourceType = options.sourceType;
      return version.tokenize(source, {options}, defaults);
    };

    render = async (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = parser.render(source, options, defaults);
      let first = await elements.next();

      let logs = (fragment.logs = []);

      if (first && 'value' in first) {
        if (!dom.native && template && 'textContent' in fragment) {
          logs.push(`render method = 'text' in template`);
          const body = [first.value];
          if (!first.done) for await (const element of elements) body.push(element);
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);

          // if (!first.done) {
          //   if (typeof requestAnimationFrame === 'function') {
          //     //  && first.value.token
          //     let lines = 0;
          //     for await (const element of elements) {
          //       // element.token &&
          //       //   element.token.breaks > 0 &&
          //       //   (lines += element.token.breaks) % 2 === 0 &&
          //       lines++ % 10 === 0 &&
          //         ((template.innerHTML = body.splice(0, body.length).join('')),
          //         fragment.appendChild(template.content));
          //       // await new Promise(r => setTimeout(r, 1000))
          //       // await new Promise(requestAnimationFrame)
          //       body.push(element);
          //     }
          //   } else {
          //     for await (const element of elements) body.push(element);
          //     template.innerHTML = body.join(''); // text
          //     fragment.appendChild(template.content);
          //   }
          // }
        } else if ('push' in fragment) {
          logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          if (!first.done) for await (const element of elements) fragment.push(element);
        } else if ('append' in fragment) {
          //  && first.value.nodeType >= 1
          logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          if (!first.done) for await (const element of elements) fragment.append(element);
        }
        // else if ('textContent' in fragment) {
        //   let text = `${first.value}`;
        //   if (!first.done) for await (const element of elements) text += `${element}`;
        //   if (template) {
        //     logs.push(`render method = 'text' in template`);
        //   } else {
        //     logs.push(`render method = 'text' in fragment`);
        //     // TODO: Find a workaround for DocumentFragment.innerHTML
        //     fragment.innerHTML = text;
        //   }
        // }
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
  if (!initialized) throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
  else if (initialized.then) Error(`Markup: tokenize(…) called during initialization. ${Messages.InitializeFirst}`);
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

export const markup = Object.create(parser, {
  initialize: {get: () => initialize},
  render: {get: () => render},
  tokenize: {get: () => tokenize},
  warmup: {get: () => warmup},
  dom: {get: () => dom},
  modes: {get: () => parser.modes},
});

/// CONSTANTS

const Messages = {
  InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
};

export default markup;
