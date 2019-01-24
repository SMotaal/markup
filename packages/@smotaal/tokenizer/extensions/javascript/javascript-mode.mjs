import {patterns, entities} from '../patterns.mjs';
import {Closures, Symbols, identifier, sequence, all, raw} from '../helpers.mjs';
import {
  REGEXPS,
  COMMENTS,
  QUOTES,
  CLOSURES,
  SPANS,
  KEYWORDS,
  ASSIGNERS,
  COMBINATORS,
  NONBREAKERS,
  OPERATORS,
  BREAKERS,
  segmenter,
} from './definitions.mjs';

export const defaults = {syntax: 'javascript', aliases: ['javascript', 'es', 'js', 'ecmascript']};

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
        segments: {
          // regexp: /^\/[^\*\/\n][^\n]*\//g,
          regexp: /^\/[^\n\/\*][^\n]+\//,
          // regexp: REGEXPS,
        },
      },
      // segmenter,
      matcher: sequence`([\s\n]+)|(${all(
        // raw`\?|\:`,
        REGEXPS,
        // raw`((${all(REGEXPS)}))`,
        // raw`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...raw`\+ \- \* & \|`.split(' ').map(s => `${s}${s}|${s}=|${s}`),
        ...raw`\/ ! % << >> >>> < > \^ ~`.split(' ').map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        "'": /(\n)|(')|(\\.)/g,
        '"': /(\n)|(")|(\\.)/g,
        '`': /(\n)|(`|\$\{)|(\\.)/g,
        // '?': /(\n)|(\?|:)/g,
        quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        comment: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      },
    };
    return javascript;
  },
  {
    defaults: {get: () => ({...defaults})},
  },
);
