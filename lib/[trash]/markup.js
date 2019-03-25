import * as modes from './markup-modes.js';
import * as dom from './markup-dom.js';
import * as parser from './markup-parser.js';

export let initialized;

export const ready = (async () => void (await modes.ready))();

export const parsers = [parser];

// const versions = [parser, parser2];

const UNSET = Symbol('');

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

    tokenize = (source, options = {}, flags) => {
      const state = new State({options, flags: {}});
      const variant = !options.variant ? 1 : parseInt(options.variant);
      const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
      tokenize.lastVariant === (tokenize.lastVariant = variant) ||
        variant < parsers.length ||
        console.warn(
          '[tokenize‹parser›] Variant %O[%d] out of bounds — using default parser: %o',
          parsers,
          variant,
          parser.MODULE_URL || {parser},
        );
      options.tokenize = parser.tokenize;
      if (flags && (flags.length > 0 || flags.size > 0)) {
        typeof flags === 'string' || (flags = [...flags].join(' '));
        /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
        /\bdebug\b/i.test(flags) && (state.flags.debug = true);
      }

      let returned = UNSET;
      try {
        tokenize.lastParser === (tokenize.lastParser = parser) ||
          console.info('[tokenize‹parser›]: %o', parser.MODULE_URL || {parser});
        return (returned = parser.tokenize(source, state));
      } finally {
        returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
      }
    };

    render = async (source, options, flags) => {
      const fragment = (options && options.fragment) || createFragment();
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging && console.info('render: %o', {render, source, options, flags, fragment, debugging});

      let logs = fragment && (fragment.logs = debugging ? [] : undefined);

      const elements = parser.render(source, options, defaults);
      let first = await elements.next();

      if (first && 'value' in first) {
        if (!dom.native && template && 'textContent' in fragment) {
          logs && logs.push(`render method = 'text' in template`);
          const body = [first.value];
          if (!first.done) for await (const element of elements) body.push(element);
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);
        } else if ('push' in fragment) {
          logs && logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          if (!first.done) for await (const element of elements) fragment.push(element);
        } else if ('append' in fragment) {
          logs && logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          if (!first.done) for await (const element of elements) fragment.append(element);
        }
      }

      return fragment;
    };

    initialized = true;

    return markup;
  })();

export let render = async (source, options, flags) => {
  await initialize();
  return await render(source, options, flags);
};

export let tokenize = (source, options, flags) => {
  if (!initialized) throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
  else if (initialized.then) Error(`Markup: tokenize(…) called during initialization. ${Messages.InitializeFirst}`);
  return markup.tokenize(source, options, flags);
};

const keyFrom = options => (options && JSON.stringify(options)) || '';
const skim = iterable => {
  for (const item of iterable);
};

export const warmup = async (source, options, flags) => {
  const key = (options && keyFrom(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  await (initialized || initialize());

  if (!cache.has(source)) {
    flags = `warmup ${(flags &&
      (flags.length > 0 || flags.size > 0) &&
      (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
      ''}`;
    skim(tokenize(source, options, flags)), cache.add(source);
  }

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
