import {Symbols, Closures} from '../common/helpers.js';

export const regexp = Object.defineProperties(
  ({syntax} = regexp.defaults) => ({
    syntax,
    // comments: Closures.from('/*…*/'),
    closures: Closures.from('{…} (…) […]'),
    // quotes: Symbols.from(`' "`),
    assigners: Symbols.from(`?: ?=`),
    combinators: Symbols.from('+? *? + *'),
    // nonbreakers: Symbols.from(`\\`),
    // breakers: Symbols.from(', ;'),
    matcher: /(\s+)|(\\(?:(?:\\\\)*\\|[^\\\s\n])?|\(|\)|\[|\]|"|'|\{|\}|,|\?:|\?=|\+\?|\*\?|\+|\*|\?)/g,
    matchers: {
      // quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
      // comment: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
    },
  }),
  {
    defaults: {value: {syntax: 'regexp'}},
  },
);
