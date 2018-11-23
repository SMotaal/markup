import {Null} from './helpers.mjs';
import {mappings, modes} from './modes.mjs';
import {Tokenizer} from './tokenizer.mjs';

export const defaults = {
  matcher: modes.default.matcher,
  syntax: 'default',
  sourceType: 'default',
  mappings,
  modes,
};

const tokenizers = new WeakMap();

Tokenizer.tokenize = tokenize;

export function tokenize(source, state = {}) {
  let {options: {sourceType} = (state.options = {})} = state;
  const {syntax = 'default'} = mappings[sourceType] || Null;
  const mode = modes[syntax];
  if (!mode) throw ReferenceError('tokenize invoked without a mode');
  state.options.mode = mode;
  let tokenizer = tokenizers.get(mode);
  !tokenizer && tokenizers.set(mode, (tokenizer = new Tokenizer(mode)));
  // && console.log({tokenizer, mode});
  // console.log({tokenizer, mode, state});
  return tokenizer.tokenize(source);
}
