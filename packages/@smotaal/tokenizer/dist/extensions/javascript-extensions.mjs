import { Symbols, all, sequence } from './helpers.mjs';
import { javascript } from './javascript-mode.mjs';

const mjs = Object.defineProperties(
  ({syntax} = mjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import export default'),
    quotes,
    closures,
    spans,
    matcher: javascript.MJS,
    matchers: {quote: matchers.quote, closure: javascript.CLOSURE},
  }),
  {
    defaults: {get: () => ({...mjs.DEFAULTS})},
  },
);

const cjs = Object.defineProperties(
  ({syntax} = cjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
    syntax,
    keywords: Symbols.from('import module exports require'),
    quotes,
    closures,
    spans,
    matcher: javascript.CJS,
    matchers: {quote: matchers.quote, closure: javascript.CLOSURE},
  }),
  {
    defaults: {get: () => ({...cjs.DEFAULTS})},
  },
);

const esx = Object.defineProperties(
  ({syntax} = esx.defaults, {javascript: {quotes, closures, spans, matchers}, mjs, cjs}) => ({
    syntax,
    keywords: Symbols.from(mjs.keywords, cjs.keywords),
    quotes,
    closures,
    spans,
    matcher: javascript.ESX,
    matchers: {quote: matchers.quote, closure: javascript.ESX},
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

  const {REGEXPS, CLOSURES} = javascript;

  // TODO: Undo $ matching once fixed
  const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
  const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;
  const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
  const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
  const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
  javascript.CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
  javascript.MJS = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
  javascript.CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b|\bimport(?=\(|\.)`;
  javascript.ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;
}

export { cjs, esx, mjs };
//# sourceMappingURL=javascript-extensions.mjs.map
