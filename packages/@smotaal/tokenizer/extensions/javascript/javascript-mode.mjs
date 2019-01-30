import {Closures, Symbols, identifier, sequence, all, raw, patterns, entities} from '../helpers.mjs';

export const javascript = Object.defineProperties(
  ({syntax} = defaults) => ({
    syntax,
    comments: Closures.from(javascript.COMMENTS),
    quotes: Symbols.from(javascript.QUOTES),
    closures: Closures.from(javascript.CLOSURES),
    spans: {'`': Closures.from(javascript.SPANS['`'])},
    keywords: Symbols.from(javascript.KEYWORDS),
    assigners: Symbols.from(javascript.ASSIGNERS),
    combinators: Symbols.from(javascript.COMBINATORS),
    nonbreakers: Symbols.from(javascript.NONBREAKERS),
    operators: Symbols.from(javascript.OPERATORS),
    breakers: Symbols.from(javascript.BREAKERS),
    patterns: {
      ...patterns,
      maybeIdentifier: identifier(entities.es.IdentifierStart, entities.es.IdentifierPart),
      segments: {
        regexp: /^\/[^\n\/\*][^\n]*\//,
      },
    },
    matcher: sequence`([\s\n]+)|(${all(
      javascript.REGEXPS,
      javascript.COMMENTS,
      javascript.QUOTES,
      javascript.CLOSURES,
      ...javascript.PUNCTUATORS,
    )})`,
    matchers: {
      "'": /(\n)|(')|(\\.)/g,
      '"': /(\n)|(")|(\\.)/g,
      '`': /(\n)|(`|\$\{)|(\\.)/g,
      quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
      comment: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
    },
  }),
  {
    defaults: {get: () => ({...javascript.DEFAULTS})},
  },
);

Definitions: {
  Defaults: {
    javascript.DEFAULTS = {syntax: 'javascript', aliases: ['javascript', 'es', 'js', 'ecmascript']};
  }
  javascript.REGEXPS = /\/(?=[^\*\/\n][^\n]*\/(?:[a-z]+\b)?(?:[ \t]+[^\n\s\(\[\{\w]|[\.\[;,]|[ \t]*[\)\]\}\;\,\n]|\n|$))(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;

  javascript.COMMENTS = /\/\/|\/\*|\*\/|^\#\!.*\n/g;
  javascript.COMMENTS['(closures)'] = '//…\n /*…*/';

  javascript.QUOTES = /`|"|'/g;
  javascript.QUOTES['(symbols)'] = `' " \``;

  javascript.CLOSURES = /\{|\}|\(|\)|\[|\]/g;
  javascript.CLOSURES['(closures)'] = '{…} (…) […]';

  javascript.SPANS = {'`': {['(closures)']: '${…}'}};

  javascript.KEYWORDS = {
    ['(symbols)']:
      // abstract enum interface package namespace declare type module
      'arguments as async await break case catch class export const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
  };

  javascript.PUNCTUATORS = [
    /,|;|\.\.\.|\.|\:|\?|=>/,
    /\+\+|\+=|\+|--|-=|-|\*\*=|\*\*|\*=|\*|\/=|\//,
    /&&|&=|&|\|\||\|=|\||\%=|\%|\^=|\^|~=|~/,
    /<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>/,
    /!==|!=|!|===|==|=/,
  ];

  javascript.ASSIGNERS = {['(symbols)']: '= += -= *= /= **= %= &= |= <<= >>= >>>= ^= ~='};

  javascript.COMBINATORS = {['(symbols)']: '=== == + - * / ** % & && | || ! !== > < >= <= => >> << >>> ^ ~'};
  javascript.NONBREAKERS = {['(symbols)']: '.'};
  javascript.OPERATORS = {['(symbols)']: '++ -- ... ? :'};
  javascript.BREAKERS = {['(symbols)']: ', ;'};
}
