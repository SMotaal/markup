import {javascript} from './javascript-grammar.js';
import {Symbols, sequence, raw, all} from '../common/helpers.js';

export const mjs = Object.defineProperties(
  ({syntax} = mjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import export default'),
    quotes,
    closures,
    spans,
    matcher: javascript.extended.MJS,
    matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
  }),
  {
    defaults: {get: () => ({...mjs.DEFAULTS})},
  },
);

export const cjs = Object.defineProperties(
  ({syntax} = cjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import module exports require'),
    quotes,
    closures,
    spans,
    matcher: javascript.extended.CJS,
    matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
  }),
  {
    defaults: {get: () => ({...cjs.DEFAULTS})},
  },
);

export const esx = Object.defineProperties(
  ({syntax} = esx.defaults, {javascript: {quotes, closures, spans, matchers}, mjs, cjs}) => ({
    syntax,
    keywords: Symbols.from(mjs.keywords, cjs.keywords),
    quotes,
    closures,
    spans,
    matcher: javascript.extended.ESX,
    matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
  }),
  {
    defaults: {get: () => ({...esx.DEFAULTS})},
  },
);

mjs.DEFAULTS = {syntax: 'mjs', aliases: ['esm'], requires: [javascript.defaults.syntax]};
cjs.DEFAULTS = {syntax: 'cjs', requires: [javascript.defaults.syntax]};
esx.DEFAULTS = {syntax: 'esx', requires: [javascript.defaults.syntax, 'cjs', 'mjs']};

javascript.extended = {};
// TODO: Undo $ matching once fixed
javascript.extended.QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
javascript.extended.COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n|<!--/g;
javascript.extended.STATEMENTS = all(
  javascript.extended.QUOTES,
  javascript.CLOSURES,
  javascript.REGEXPS,
  javascript.extended.COMMENTS,
);
javascript.extended.BLOCKLEVEL = sequence`(\n|\s+)|(${javascript.extended.STATEMENTS})`;
javascript.extended.TOPLEVEL = sequence`(\n|\s+)|(${javascript.extended.STATEMENTS})`;
javascript.extended.CLOSURE = sequence`(\n+)|(${javascript.extended.STATEMENTS})`;
javascript.extended.MJS = sequence`${javascript.extended.TOPLEVEL}|\bexport\b|\bimport\b`;
javascript.extended.CJS = sequence`${javascript.extended.BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b|\bimport(?=\(|\.)`;
javascript.extended.ESX = sequence`${javascript.extended.BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;
