import { Closures, Symbols, matchers } from './helpers.mjs';

const css = Object.defineProperties(
  ({syntax} = css.defaults) => ({
    syntax,
    comments: Closures.from('/*…*/'),
    closures: Closures.from('{…} (…) […]'),
    quotes: Symbols.from(`' "`),
    assigners: Symbols.from(`:`),
    combinators: Symbols.from('> :: + :'),
    nonbreakers: Symbols.from(`-`),
    breakers: Symbols.from(', ;'),
    matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|any|any-link|backdrop|before|checked|default|defined|dir|disabled|empty|enabled|first|first-child|first-letter|first-line|first-of-type|focus|focus-visible|focus-within|fullscreen|host|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|required|right|root|scope|target|valid|visited))/g,
    matchers: {
      quote: matchers.escapes,
      comment: matchers.comments,
    },
  }),
  {
    defaults: {value: {syntax: 'css'}},
  },
);

export { css };
//# sourceMappingURL=css-mode.mjs.map
