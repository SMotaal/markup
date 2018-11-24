import {patterns, entities} from './patterns.mjs'; // identifier, sequence, all, raw
import {Closures, Symbols, identifier, sequence, all, raw} from './helpers.mjs';

export const mappings = {};
export const modes = {
  // Fallback mode
  default: {
    ...(mappings.default = {syntax: 'default'}),
    matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
  },
};

/// DEFINITIONS
Syntaxes: {
  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (modes.es = {
      ...(mappings.javascript = mappings.es = mappings.js = mappings.ecmascript = {syntax: 'es'}),
      comments: Closures.from('//…\n /*…*/'),
      quotes: Symbols.from(`' " \``),
      closures: Closures.from('{…} (…) […]'),
      spans: {'`': Closures.from('${…}')},
      keywords: Symbols.from(
        // abstract enum interface package namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
      ),
      assigners: Symbols.from('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: Symbols.from(
        '>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :',
      ),
      nonbreakers: Symbols.from('.'),
      operators: Symbols.from('++ -- !! ^ ~ ! ...'),
      breakers: Symbols.from(', ;'),
      patterns: {
        ...patterns,
        maybeIdentifier: identifier(entities.es.IdentifierStart, entities.es.IdentifierPart),
      },
      matcher: sequence`([\s\n]+)|(${all(
        REGEXPS,
        raw`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...raw`\+ \- \* & \|`.split(' ').map(s => `${s}${s}|${s}=|${s}`),
        ...raw`! \*\* % << >> >>> < > \^ ~`.split(' ').map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        "'": /(\n)|(')|(\\.)/g,
        '"': /(\n)|(")|(\\.)/g,
        '`': /(\n)|(`|\$\{)|(\\.)/g,
        comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      },
    });

    ECMAScriptExtensions: {
      // TODO: Undo $ matching once fixed
      const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
      const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;
      const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
      const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
      const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
      const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
      const ESM = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
      const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
      const ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

      const {quotes, closures, spans} = es;
      const syntax = {quotes, closures, spans};
      const matchers = {};
      ({quote: matchers.quote} = es.matchers);

      const mjs = (modes.mjs = {
        ...(mappings.mjs = mappings.esm = {syntax: 'mjs'}),
        keywords: Symbols.from('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers, closure: CLOSURE},
      });
      const cjs = (modes.cjs = {
        ...(mappings.cjs = {syntax: 'cjs'}),
        keywords: Symbols.from('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers, closure: CJS},
      });
      const esx = (modes.esx = {
        ...(mappings.esx = {syntax: 'esx'}),
        keywords: Symbols.from(mjs.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers, closure: ESX},
      });
    }
  }
}
