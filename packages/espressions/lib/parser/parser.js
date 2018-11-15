import {mappings, modes} from './modes.js';
import {Tokenizer} from './tokenizer.js';

export const defaults = {
  matcher: modes.default.matcher,
  syntax: 'default',
  sourceType: 'default',
  mappings,
  modes,
};

const tokenizers = new WeakMap();

export function tokenize(source, state = {}) {
  let {
    options: {sourceType} = (state.options = {}),
  } = state;
  const {syntax = 'default'} = mappings[sourceType] || Null;
  const mode = modes[syntax];
  if (!mode) throw ReferenceError('tokenize invoked without a mode');
  state.options.mode = mode;
  let tokenizer = tokenizers.get(mode);
  tokenizer || tokenizers.set(mode, (tokenizer = new Tokenizer(mode)));
  // console.log({tokenizer, mode, state});
  return tokenizer.tokenize(source);
}

