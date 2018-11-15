import {patterns, entities, identifier, sequence, all, raw} from './patterns.js';

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
  /// Helpers
  const lines = string => string.split(/\n+/);
  const closures = string => {
    const pairs = symbols(string);
    const array = new Array(pairs.length);
    array.pairs = pairs;
    let i = 0;
    for (const pair of pairs) {
      const [opener, closer] = pair.split('…');
      array[(array[i++] = opener)] = {opener, closer};
    }
    array.toString = () => string;
    return array;
  };
  const symbols = source =>
    (source &&
      ((typeof source === 'string' && source.split(/ +/)) ||
        (Symbol.iterator in source && [...source]))) ||
    [];
  symbols.from = (...args) => [...new Set([].concat(...args.map(symbols)))];

  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (modes.es = {
      ...(mappings.javascript = mappings.es = mappings.js = mappings.ecmascript = {syntax: 'es'}),
      comments: closures('//…\n /*…*/'),
      quotes: symbols(`' " \``),
      closures: closures('{…} (…) […]'),
      spans: {'`': closures('${…}')},
      keywords: symbols(
        // abstract enum interface package  namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
      ),
      assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
      nonbreakers: symbols('.'),
      operators: symbols('++ -- !! ^ ~ ! ...'),
      breakers: symbols(', ;'),
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
        ...symbols(raw`\+ \- \* & \|`).map(s => `${s}${s}|${s}=|${s}`),
        ...symbols(raw`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=|${s}`),
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
        keywords: symbols('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers, closure: CLOSURE},
      });
      const cjs = (modes.cjs = {
        ...(mappings.cjs = {syntax: 'cjs'}),
        keywords: symbols('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers, closure: CJS},
      });
      const esx = (modes.esx = {
        ...(mappings.esx = {syntax: 'esx'}),
        keywords: symbols.from(mjs.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers, closure: ESX},
      });
    }
  }
}
