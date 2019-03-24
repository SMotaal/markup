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

Definitions: {
  Defaults: {
    const requires = [javascript.defaults.syntax];

    mjs.DEFAULTS = {syntax: 'mjs', aliases: ['esm'], requires};
    cjs.DEFAULTS = {syntax: 'cjs', requires};
    esx.DEFAULTS = {syntax: 'esx', requires: [...requires, 'cjs', 'mjs']};
  }

  const {REGEXPS, CLOSURES, extended = (javascript.extended = {})} = javascript;

  // TODO: Undo $ matching once fixed
  const QUOTES = (javascript.extended.QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g);
  const COMMENTS = (javascript.extended.COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g);
  const STATEMENTS = (javascript.extended.STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS));
  const BLOCKLEVEL = (javascript.extended.BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`);
  const TOPLEVEL = (javascript.extended.TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`);
  javascript.extended.CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
  javascript.extended.MJS = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
  javascript.extended.CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b|\bimport(?=\(|\.)`;
  javascript.extended.ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;
}
