import {javascript, REGEXPS, CLOSURES} from './javascript-mode.mjs';
import {Symbols, sequence, all} from '../helpers.mjs';

// TODO: Undo $ matching once fixed
const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;
const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
const MJS = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b|\bimport(?=\(|\.)`;
const ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

const requires = [javascript.defaults.syntax];

export const mjs = Object.defineProperties(
  ({syntax} = defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import export default'),
    quotes,
    closures,
    spans,
    matcher: MJS,
    matchers: {quote: matchers.quote, closure: CLOSURE},
  }),
  {
    defaults: {value: {syntax: 'mjs', aliases: ['esm'], requires}},
  },
);

export const cjs = Object.defineProperties(
  ({syntax} = defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import module exports require'),
    quotes,
    closures,
    spans,
    matcher: CJS,
    matchers: {quote: matchers.quote, closure: CLOSURE},
  }),
  {
    defaults: {value: {syntax: 'cjs', requires}},
  },
);

export const esx = Object.defineProperties(
  ({syntax} = defaults, {javascript: {quotes, closures, spans, matchers}, mjs, cjs}) => ({
    syntax,
    keywords: Symbols.from(mjs.keywords, cjs.keywords),
    quotes,
    closures,
    spans,
    matcher: ESX,
    matchers: {quote: matchers.quote, closure: ESX},
  }),
  {
    defaults: {value: {syntax: 'esx', requires: [...requires, 'cjs', 'mjs']}},
  },
);
