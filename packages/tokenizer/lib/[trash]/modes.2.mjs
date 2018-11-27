import * as helpers from './helpers.mjs';

/** TODO: Consider linking mappings to each instance of modes */
export const mappings = {};

export const modes = Object.assign(
  new class Modes {
    /**
     *
     * @param mode {string}
     * @param factory {ModeFactory}
     * @param defaults {ModeDefaults}
     */
    register(mode, factory, defaults) {
      if (!mode || typeof mode !== 'string') throw TypeError(`Cannot register "${mode}" since 'it is invalid'`);
      if (this.hasOwnProperty(mode)) throw ReferenceError(`Cannot register "${mode}" since it is already registered`);
      if (!factory || typeof factory !== 'function')
        throw TypeError(`Cannot register "${mode}" since it does not have a valid factory`);

      defaults = {syntax: mode, ...factory.defaults, ...defaults};
      const {syntax, aliases, requires} = defaults;

      Object.defineProperty(this, syntax, {
        get() {
          requires && requires.length && this.requires(mode, requires);
          return (this[syntax] = factory(helpers, defaults, this));
        },
        set(value) {
          Reflect.defineProperty(this, syntax, {value});
        },
        configurable: true,
        enumerable: true,
      });

      mappings[syntax] = {syntax};

      if (aliases && aliases.length) {
        for (const alias of aliases) {
          mappings[alias] = mappings[syntax];
        }
      }
    }

    requires(mode, requires) {
      const missing = [];
      for (const mode of requires) mode in this || missing.push(`"${mode}"`);
      if (!missing.length) return;
      throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
    }
  }(),
  {
    default: {
      ...(mappings.default = {syntax: 'default'}),
      matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
    },
  },
);

/**
 * @typedef { typeof modes } Modes
 * @typedef { Partial<modes[keyof modes]> } Mode
 * @typedef { typeof helpers } Helpers
 * @typedef { {aliases?: string[], syntax: string} } ModeDefaults
 * @typedef { (helpers: Helpers, defaults: ModeDefaults, Modes) => Mode } ModeFactory
 */

// import {patterns, entities} from './patterns.mjs'; // identifier, sequence, all, raw
// import {Closures, Symbols, identifier, sequence, all, raw} from './helpers.mjs';
// export const modes = {
//   // Fallback mode
//   default: {
//     ...(mappings.default = {syntax: 'default'}),
//     matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
//   },
// };

// /// DEFINITIONS
// Syntaxes: if (false) {
//   ECMAScript: {
//     const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;

//     const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
//     COMMENTS['(closures)'] = '//…\n /*…*/';

//     const QUOTES = /`|"|'/g;
//     QUOTES['(symbols)'] = `' " \``;

//     const CLOSURES = /\{|\}|\(|\)|\[|\]/g;
//     CLOSURES['(closures)'] = '{…} (…) […]';

//     const SPANS = {'`': {['(closures)']: '${…}'}};

//     const KEYWORDS = {
//       ['(symbols)']:
//         // abstract enum interface package namespace declare type module
//         'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
//     };

//     const ASSIGNERS = {['(symbols)']: '= += -= *= /= **= %= |= ^= &= <<= >>= >>>='};

//     const COMBINATORS = {['(symbols)']: '>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'};
//     const NONBREAKERS = {['(symbols)']: '.'};
//     const OPERATORS = {['(symbols)']: '++ -- !! ^ ~ ! ...'};
//     const BREAKERS = {['(symbols)']: ', ;'};

//     const es = (modes.es = {
//       ...(mappings.javascript = mappings.es = mappings.js = mappings.ecmascript = {syntax: 'es'}),
//       comments: Closures.from(COMMENTS),
//       quotes: Symbols.from(QUOTES),
//       closures: Closures.from(CLOSURES),
//       spans: {'`': Closures.from(SPANS['`'])},
//       keywords: Symbols.from(KEYWORDS),
//       assigners: Symbols.from(ASSIGNERS),
//       combinators: Symbols.from(COMBINATORS),
//       nonbreakers: Symbols.from(NONBREAKERS),
//       operators: Symbols.from(OPERATORS),
//       breakers: Symbols.from(BREAKERS),
//       patterns: {
//         ...patterns,
//         maybeIdentifier: identifier(entities.es.IdentifierStart, entities.es.IdentifierPart),
//       },
//       matcher: sequence`([\s\n]+)|(${all(
//         REGEXPS,
//         raw`\/=`,
//         COMMENTS,
//         QUOTES,
//         CLOSURES,
//         /,|;|\.\.\.|\.|\:|\?|=>/,
//         /!==|===|==|=/,
//         ...raw`\+ \- \* & \|`.split(' ').map(s => `${s}${s}|${s}=|${s}`),
//         ...raw`! \*\* % << >> >>> < > \^ ~`.split(' ').map(s => `${s}=|${s}`),
//       )})`,
//       matchers: {
//         quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
//         "'": /(\n)|(')|(\\.)/g,
//         '"': /(\n)|(")|(\\.)/g,
//         '`': /(\n)|(`|\$\{)|(\\.)/g,
//         comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
//       },
//     });

//     // console.log({es, COMMENTS, QUOTES});

//     ECMAScriptExtensions: {
//       // TODO: Undo $ matching once fixed
//       const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
//       const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g;
//       const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
//       const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
//       const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
//       const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
//       const ESM = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
//       const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
//       const ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

//       const {quotes, closures, spans} = es;
//       const syntax = {quotes, closures, spans};
//       const matchers = {};
//       ({quote: matchers.quote} = es.matchers);

//       const mjs = (modes.mjs = {
//         ...(mappings.mjs = mappings.esm = {syntax: 'mjs'}),
//         keywords: Symbols.from('import export default'),
//         ...syntax,
//         matcher: ESM,
//         matchers: {...matchers, closure: CLOSURE},
//       });
//       const cjs = (modes.cjs = {
//         ...(mappings.cjs = {syntax: 'cjs'}),
//         keywords: Symbols.from('import module exports require'),
//         ...syntax,
//         matcher: CJS,
//         matchers: {...matchers, closure: CJS},
//       });
//       const esx = (modes.esx = {
//         ...(mappings.esx = {syntax: 'esx'}),
//         keywords: Symbols.from(mjs.keywords, cjs.keywords),
//         ...syntax,
//         matcher: ESX,
//         matchers: {...matchers, closure: ESX},
//       });
//     }
//   }
// }
