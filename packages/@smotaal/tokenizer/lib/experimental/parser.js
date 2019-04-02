import {Tokenizer} from './tokenizer.js';

export const TOKENIZERS = 'tokenizers';
export const MAPPINGS = 'mappings';
export const MODES = 'modes';

const none = {
  syntax: 'markup',
  matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/+|\/\*+|\*+\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

const define = (instance, property, value, options) => {
  if (!instance.hasOwnProperty(property))
    return (
      Object.defineProperty(instance, property, {
        value,
        writable: (options && options.writable === true) || false,
        configurable: (options && options.configurable === true) || false,
        enumerable: !options || options.enumerable === true,
      }),
      value
    );
};

export class Parser {
  /** @param {string} source @param {{sourceType?: string}} [state] */
  tokenize(source, state = {}) {
    const {
      options: {
        sourceType,
        mode = (state.options.mode = (sourceType && this.get(sourceType)) || none),
      } = (state.options = {}),
    } = state;
    let tokenizer = mode && this[TOKENIZERS].get(mode);
    if (!source || !mode) return [];
    !tokenizer && this[TOKENIZERS].set(mode, (tokenizer = new Tokenizer(mode)));
    state.parser = this;
    state.tokenize = (this.hasOwnProperty('tokenize') && this.tokenize) || (this.tokenize = this.tokenize.bind(this));
    return tokenizer.tokenize(source, state);
  }

  get [TOKENIZERS]() {
    return define(this, TOKENIZERS, new WeakMap());
  }
  get [MAPPINGS]() {
    return define(this, MAPPINGS, Object.create(null));
  }

  get [MODES]() {
    return define(this, MODES, Object.create(null));
  }

  get(id = 'default') {
    const {[MAPPINGS]: mappings, [MODES]: modes} = this;
    if (id in modes) return modes[id];
    let mapping = mappings[id];
    !mapping || mapping.syntax === id || (mapping = mappings[mapping.syntax]);
    if (mapping && mapping.factory) {
      const {syntax, factory, options} = mapping;
      if (options.requires && options.requires.length > 0) {
        const list = [];
        for (const id of options.requires) id in modes || this.get(id) || list.push(id);
        if (list.length) {
          list.length > 1 && list.push(list.splice(-2, 2).join(' and '));
          throw Error(`Cannot initialize "${syntax}" which requires the list mode(s): ${list.join(', ')}`);
        }
      }
      return (mapping.mode = modes[id] = factory(options, modes));
    }
  }

  /** @param {ModeFactory | Mode} mode @param {ModeOptions} [options] */
  register(mode, options) {
    if (!this[MAPPINGS]) return;

    const {[MAPPINGS]: mappings, [MODES]: modes} = this;
    const factory = typeof mode === 'function' && mode;
    const {syntax, aliases = (options.aliases = [])} = ({syntax: options.syntax = mode.syntax} = options = {
      syntax: undefined,
      ...factory.defaults,
      ...options,
    });

    if (!syntax || typeof syntax !== 'string') {
      throw TypeError(`Cannot register "${syntax}" since it not valid string'`);
    }

    if (mappings[syntax]) {
      if (factory ? factory === mappings[syntax].factory : mode === modes[syntax]) return;
      throw ReferenceError(`Cannot register "${syntax}" since it is already registered`);
    }

    if (aliases && aliases.length > 0) {
      for (const alias of aliases) {
        if (!alias || typeof alias !== 'string')
          throw TypeError(`Cannot register "${syntax}" since it's alias "${alias}" not valid string'`);
        else if (mappings[alias])
          throw ReferenceError(`Cannot register "${syntax}" since it's alias "${alias}" is already registered`);
      }
    }

    const mapping = factory ? {syntax, factory, options} : {syntax, mode, options};
    const descriptor = {value: mapping, writable: false};

    for (const id of [syntax, ...aliases]) {
      Object.defineProperty(mappings, id, descriptor);
    }
  }

  /** @param {string} mode @param {string[]} requires */
  requires(mode, requires) {
    const missing = [];
    for (const mode of requires) {
      mode in this[MAPPINGS] || missing.push(`"${mode}"`);
    }
    if (!missing.length) return;
    throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
  }
}

/**
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
 * @typedef { {[name: string]: Mode} } Modes
 * @typedef { {[name: string]: {syntax: string} } } Mappings
 * @typedef { {aliases?: string[], syntax: string} } ModeOptions
 * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
 */
