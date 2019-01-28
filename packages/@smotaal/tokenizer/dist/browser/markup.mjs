import { Parser } from '../tokenizer.mjs';
import '../extensions/helpers.mjs';
import '../extensions/css-mode.mjs';
import '../extensions/html-mode.mjs';
import '../extensions/markdown-mode.mjs';
import '../extensions/javascript-mode.mjs';
import '../extensions/javascript-extensions.mjs';
import { modes } from '../extensions/extensions.mjs';
import { render } from '../extensions/dom.mjs';

const parser = new Parser();
for (const id in modes) parser.register(modes[id]);

const versions = [parser];

const tokenize = (source, options = {}) => {
  const version = versions[options.version - 1] || versions[0];
  options.tokenize = (version || parser).tokenize;
  try {
    return version.tokenize(source, {options});
  } finally {
    // || console.info('Markup Version %O', version);
  }
};

const render$1 = async (source, options) => render(tokenize(source, options), options && options.fragment);

const warmup = (source, options) => {
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  for (const item of tokenize(source, options));
  cache.add(source);
};

export { tokenize, render$1 as render, warmup };
//# sourceMappingURL=markup.mjs.map
