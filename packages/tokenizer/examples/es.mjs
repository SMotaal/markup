import {Parser} from '../index.mjs';
import {javascript} from '../extensions/javascript/javascript-mode.mjs';
const parser = new Parser();
export const {modes, mappings} = parser;

parser.register(javascript);

import * as dom from '../extensions/dom.mjs';

export const tokenize = (source, options = {}) => parser.tokenize(source, {options});

export const render = async (source, options) => dom.render(tokenize(source, options), options && options.fragment);

export const warmup = (source, options) => {
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  for (const item of tokenize(source, options));
  cache.add(source);
};
