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

/** The identity empty immutable iterable for debugging. */
const EmptyTokenArray = (EmptyTokenArray =>
  Object.freeze(
    new (Object.freeze(Object.freeze(Object.setPrototypeOf(EmptyTokenArray.prototype, null)).constructor, null))(),
  ))(
  class EmptyTokenArray {
    *[Symbol.iterator]() {}
  },
);

/**
 * Returns the first occurance of a sequence in the string
 * starting from the index (or 0 where undefined), always
 * returning -1 or the index of the occurance.
 *
 * @see https://tc39.es/ecma262/#sec-string.prototype.indexof
 * @type {(string: string, sequence: string , index?: number) => number}
 */
export const indexOf = Function.call.bind(String.prototype.indexOf);

/**
 * Returns the total number of `\n` sequences in the string.
 *
 * @type {(string: string) => number}
 */
export const countLineBreaks = text => {
  let lineBreaks = 0;
  for (let index = -1; (index = indexOf(text, '\n', index + 1)) !== -1; lineBreaks++);
  return lineBreaks;
};

export const createBaselineTokenizer = () => {
  return class Tokenizer {
    *tokenize(sourceText) {
      let match, lastIndex;
      const matcher = RegExp(none.matcher);
      const string = String(sourceText || '');

      lastIndex = 0;
      while ((match = matcher.exec(string))) {
        const {0: text, index} = match;
        const pre = lastIndex < index && string.slice(lastIndex, index);
        lastIndex = matcher.lastIndex;
        pre && (yield {text: pre, lineBreaks: countLineBreaks(pre)});
        yield {text, lineBreaks: countLineBreaks(text)};
      }
    }
  };
};

/** @param {typeof import('./tokenizer.js')['Tokenizer']} [Tokenizer] */
export const createParser = (Tokenizer = createBaselineTokenizer()) =>
  class Parser {
    constructor(options) {
      if (options) {
        const {mode, tokenizer, url, modes} = options;
        if (mode) {
          this.register((this.mode = mode));
          tokenizer && this[TOKENIZERS].set(mode, tokenizer);
        }
        if (modes) for (const id in modes) this.register(modes[id]);
        url && (this.MODULE_URL = url);
      }
    }

    /**
     * @param source {string}
     * @param state {{sourceType?: string}}
     */
    tokenize(source, state = {}) {
      const {
        options: {
          sourceType,
          mode = (state.options.mode = (sourceType && this.get(sourceType)) || this.mode || none),
        } = (state.options = {}),
      } = state;
      let tokenizer = mode && this[TOKENIZERS].get(mode);
      if (!source || !mode) return EmptyTokenArray;
      if (!tokenizer) {
        if (typeof Tokenizer !== 'function') {
          throw TypeError(
            `Parse factory expected the first argument to be a Tokenizer constructor (not ${typeof Tokenizer}) — either define a tokenizer mapping for "${sourceType ||
              mode.syntax ||
              'markup'}" or pass the a constructor to the factory.`,
          );
        }
        this[TOKENIZERS].set(mode, (tokenizer = new Tokenizer(mode)));
      }
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
      if (mapping) {
        const {syntax, mode, factory, options} = mapping;
        if (mode) {
          return (modes[id] = mode);
        }
        if (factory) {
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
    }

    /** @param {ModeFactory | Parser.Mode} mode @param {Parser.Mode.Options} [options] */
    register(mode, options) {
      if (!this[MAPPINGS]) return;

      const {[MAPPINGS]: mappings, [MODES]: modes} = this;
      const factory = typeof mode === 'function' && mode;
      const {syntax, aliases = (options.aliases = []), preregister, tokenizer} = ({
        syntax: options.syntax = mode.syntax,
      } = options = {
        syntax: undefined,
        ...(factory ? factory.defaults : mode),
        ...options,
      });

      if (!syntax || typeof syntax !== 'string') {
        throw TypeError(`Cannot register "${syntax}" since it not valid string'`);
      }

      if (preregister) preregister(this);

      if (mappings[syntax]) {
        if (factory ? factory === mappings[syntax].factory : mode === modes[syntax]) return;
        throw ReferenceError(`Cannot register "${syntax}" since it is already registered`);
      }

      const ids = [syntax];

      if (aliases && aliases.length > 0) {
        for (const alias of aliases) {
          const mapping = mappings[alias];
          if (!alias || typeof alias !== 'string') {
            throw TypeError(`Cannot register "${syntax}" since it's alias "${alias}" not valid string'`);
          }

          if (alias in modes || (mapping && (mapping.syntax === alias || mapping.syntax[0] === alias[0]))) {
            continue;
          }

          if (mapping) {
            Object.defineProperty(mappings, alias, {writable: true, configurable: true});
            delete mappings[alias];
            ids.push(alias);
          }

          ids.push(alias);
        }
      }

      const mapping = factory ? {syntax, factory, options} : {syntax, mode, options};
      const descriptor = {value: mapping, writable: false, configurable: true};

      for (const id of ids) Object.defineProperty(mappings, id, descriptor);

      if (tokenizer) this[TOKENIZERS].set(mode, tokenizer);
    }

    unregister(id) {
      const {[MAPPINGS]: mappings, [MODES]: modes} = this;
      if (id in modes) {
        throw ReferenceError(`Cannot unregister "${id}" since it's already been bootstrapped for use.`);
      }
      Object.defineProperty(mappings, id, {writable: true, configurable: true});
      delete mappings[id];
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
  };

/**
 * @typedef { ReturnType<createParser> } Parser
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Parser.Mode
 * @typedef { {[name: string]: Parser.Mode} } Parser.Modes
 * @typedef { {[name: string]: {syntax: string} } } Parser.Mappings
 * @typedef { {aliases?: string[], syntax: string} } Parser.Mode.Options
 * @typedef { (options: Parser.Mode.Options, modes: Parser.Modes) => Parser.Mode } ModeFactory
 */
