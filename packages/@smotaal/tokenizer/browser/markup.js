import parser from '../tokenizer.extended.js';
import dom from '../extensions/dom.js';
// import * as dom from '../extensions/dom.js';

export {encodeEntity, encodeEntities} from '../extensions/dom.js';
export {entities} from '../../grammars/common/patterns.js';

const versions = [parser];
let lastVersion;

export const tokenize = (source, options = {}, flags) => {
  const state = {options, flags: {}};
  const version = versions[options.version - 1] || versions[0];
  options.tokenize = (version || parser).tokenize;
  if (flags && (flags.length > 0 || flags.size > 0)) {
    typeof flags === 'string' || (flags = [...flags].join(' '));
    // console.log(flags);
    /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
    /\bdebug\b/i.test(flags) && (state.flags.debug = true);
  }
  state.flags.debug && console.log(state);
  try {
    return version.tokenize(source, state);
  } finally {
    !version || lastVersion === (lastVersion = version);
    // || console.info('Markup Version %O', version);
  }
};

export const render = (source, options, flags) => (
  !(options && flags) ||
    !options.fragment ||
    (!/\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '))
      ? (options.fragment.logs = [])
      : (options.fragment.logs = undefined)),
  dom.render(tokenize(source, options, flags), options && options.fragment)
);

export const warmup = (source, options, flags) => {
  // Object.defineProperty(options, 'warmup', {value: true});
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  flags = `warmup ${(flags &&
    (flags.length > 0 || flags.size > 0) &&
    (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
    ''}`;
  for (const item of tokenize(source, options, flags));
  cache.add(source);
};
