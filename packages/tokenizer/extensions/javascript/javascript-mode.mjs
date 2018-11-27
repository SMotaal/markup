import {patterns, entities} from '../patterns.mjs';
import {Closures, Symbols, identifier, sequence, all, raw} from '../helpers.mjs';

export const defaults = {syntax: 'javascript', aliases: ['javascript', 'es', 'js', 'ecmascript']};

export const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;

export const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
COMMENTS['(closures)'] = '//…\n /*…*/';

export const QUOTES = /`|"|'/g;
QUOTES['(symbols)'] = `' " \``;

export const CLOSURES = /\{|\}|\(|\)|\[|\]/g;
CLOSURES['(closures)'] = '{…} (…) […]';

export const SPANS = {'`': {['(closures)']: '${…}'}};

export const KEYWORDS = {
  ['(symbols)']:
    // abstract enum interface package namespace declare type module
    'arguments as async await break case catch class export const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
};

export const ASSIGNERS = {['(symbols)']: '= += -= *= /= **= %= |= ^= &= <<= >>= >>>='};

export const COMBINATORS = {['(symbols)']: '>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'};
export const NONBREAKERS = {['(symbols)']: '.'};
export const OPERATORS = {['(symbols)']: '++ -- !! ^ ~ ! ...'};
export const BREAKERS = {['(symbols)']: ', ;'};

export const javascript = Object.defineProperties(
  ({syntax} = defaults) => {
    const javascript = {
      syntax,
      comments: Closures.from(COMMENTS),
      quotes: Symbols.from(QUOTES),
      closures: Closures.from(CLOSURES),
      spans: {'`': Closures.from(SPANS['`'])},
      keywords: Symbols.from(KEYWORDS),
      assigners: Symbols.from(ASSIGNERS),
      combinators: Symbols.from(COMBINATORS),
      nonbreakers: Symbols.from(NONBREAKERS),
      operators: Symbols.from(OPERATORS),
      breakers: Symbols.from(BREAKERS),
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
    };
    return javascript;
  },
  {
    defaults: {get: () => ({...defaults})},
  },
);
