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
    ['(symbols)']:
      'abstract enum interface package namespace declare type module arguments private public protected as async await break case catch class export const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
  };
}
