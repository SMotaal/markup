import extendedParser from '../tokenizer.extended.js';
import dom from '../extensions/dom.js';

export {encodeEntity, encodeEntities} from '../extensions/dom.js';
export {entities} from '../../grammars/common/patterns.js';

export const parsers = [extendedParser];

const UNSET = Symbol('');

const State = Object.setPrototypeOf(
  class State {
    constructor(...properties) {
      Object.assign(this, ...properties);
    }
  }.prototype,
  null,
).constructor;

export const tokenize = (source, options = {}, flags) => {
  const state = new State({options, flags: {}});
  const variant = !options.variant ? 1 : parseInt(options.variant);
  const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
  tokenize.lastVariant === (tokenize.lastVariant = variant) ||
    variant <= parsers.length ||
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

export const render = (source, options, flags) => {
  const fragment = options && options.fragment;

  const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

  debugging && console.info('render: %o', {render, source, options, flags, fragment, debugging});

  fragment && (fragment.logs = debugging ? [] : undefined);

  return dom.render(tokenize(source, options, flags), fragment);
};

export const warmup = (source, options, flags) => {
  // Object.defineProperty(options, 'warmup', {value: true});
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (!cache.has(source)) {
    flags = `warmup ${(flags &&
      (flags.length > 0 || flags.size > 0) &&
      (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
      ''}`;
    for (const item of tokenize(source, options, flags));
  }
  cache.add(source);
};
