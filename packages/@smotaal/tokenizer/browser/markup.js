import parser from '../extended.js';
import * as dom from '../extensions/dom.js';

export {encodeEntity, encodeEntities} from '../extensions/dom.js';
export {entities} from '../extensions/common/patterns.js';

const versions = [parser];
let lastVersion;

export const tokenize = (source, options = {}) => {
  const version = versions[options.version - 1] || versions[0];
  options.tokenize = (version || parser).tokenize;
  try {
    return version.tokenize(source, {options});
  } finally {
    !version || lastVersion === (lastVersion = version);
    // || console.info('Markup Version %O', version);
  }
};

export const render = async (source, options) => dom.render(tokenize(source, options), options && options.fragment);

export const warmup = (source, options) => {
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  for (const item of tokenize(source, options));
  cache.add(source);
};
