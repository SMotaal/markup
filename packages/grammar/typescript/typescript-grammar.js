import {javascript} from '../javascript/javascript-grammar.js';
import {Symbols, sequence, raw, all} from '../common/helpers.js';

export const typescript = Object.defineProperties(
  ({syntax} = typescript.defaults, {javascript}) => ({
    ...javascript,
    keywords: Symbols.from(typescript.KEYWORDS),
  }),
  {
    defaults: {get: () => ({...typescript.DEFAULTS})},
  },
);

Definitions: {
  Defaults: {
    typescript.DEFAULTS = {syntax: 'typescript', aliases: ['ts'], requires: [javascript.defaults.syntax]};
  }
  typescript.KEYWORDS = {
    ['(symbols)']: `abstract enum interface namespace declare type module private public protected ${
      javascript.KEYWORDS['(symbols)']
    }`,
  };
}
