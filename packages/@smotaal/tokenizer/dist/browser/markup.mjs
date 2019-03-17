import { Parser } from '../tokenizer.mjs';
import '../extensions/helpers.mjs';
import { css } from '../extensions/css-mode.mjs';
import { html } from '../extensions/html-mode.mjs';
import { markdown } from '../extensions/markdown-mode.mjs';
import { javascript } from '../extensions/javascript-mode.mjs';
import { mjs, cjs, esx } from '../extensions/javascript-extensions.mjs';
import { render as render$1 } from '../extensions/dom.mjs';
export { encodeEntity, encodeEntities } from '../extensions/dom.mjs';



var modes = /*#__PURE__*/Object.freeze({
  css: css,
  html: html,
  markdown: markdown,
  javascript: javascript,
  mjs: mjs,
  cjs: cjs,
  esx: esx
});

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

const render = async (source, options) => render$1(tokenize(source, options), options && options.fragment);

const warmup = (source, options) => {
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  for (const item of tokenize(source, options));
  cache.add(source);
};

export { tokenize, render, warmup };
//# sourceMappingURL=markup.mjs.map
