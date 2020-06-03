const TOKENIZERS = 'tokenizers';
const MAPPINGS = 'mappings';
const MODES = 'modes';

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
const indexOf = Function.call.bind(String.prototype.indexOf);

/**
 * Returns the total number of `\n` sequences in the string.
 *
 * @type {(string: string) => number}
 */
const countLineBreaks = text => {
  let lineBreaks = 0;
  for (let index = -1; (index = indexOf(text, '\n', index + 1)) !== -1; lineBreaks++);
  return lineBreaks;
};

const createBaselineTokenizer = () => {
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
const createParser = (Tokenizer = createBaselineTokenizer()) =>
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

//@ts-check

class TokenizerAPI {
  /** @param {API.Options} [options] */
  constructor(options) {
    /** @type {API.Options} */
    const {
      parsers = [],
      tokenize = /** @type {API.tokenize} */ ((source, options = {}, flags) => {
        /** @type {{[name: string]: any} & TokenizerAPI.State} */
        const state = new TokenizerAPI.State({options, flags: {}});
        //@ts-ignore
        const variant = !options.variant ? 1 : parseInt(options.variant);
        const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
        this.lastVariant === (this.lastVariant = variant) ||
          variant <= parsers.length ||
          console.warn(
            '[tokenize‹parser›] Variant %O[%d] out of bounds — using default parser: %o',
            parsers,
            variant,
            parser.MODULE_URL || {parser},
          );
        options.tokenize = parser.tokenize;
        if (flags && (flags.length > 0 || flags.size > 0)) {
          typeof flags === 'string' || (flags = [...flags].join(' '));
          /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
          /\bdebug\b/i.test(flags) && (state.flags.debug = true);
        }

        let returned = UNSET;
        try {
          this.lastParser === (this.lastParser = parser) ||
            console.info('[tokenize‹parser›]: %o', parser.MODULE_URL || {parser});
          //@ts-ignore
          return (returned = parser.tokenize((this.lastSource = source), (this.lastState = state)));
        } finally {
          returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
        }
      }),

      warmup = (source, options, flags) => {
        const key = (options && JSON.stringify(options)) || '';
        let cache = (this.cache || (this.cache = new Map())).get(key);
        cache || this.cache.set(key, (cache = new Set()));
        if (!cache.has(source)) {
          cache.add(source);
          flags = `warmup ${(flags &&
            (flags.length > 0 || flags.size > 0) &&
            (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
            ''}`;
          const tokens = tokenize(source, options, flags);
          const snapshot = {...this};
          for (const item of tokens);
          console.log('[tokenize‹warmup›]: %o', snapshot);
        }
      },

      render,
    } = options;

    Object.defineProperties(this, {
      tokenize: {get: () => tokenize},
      warmup: {get: () => warmup},
      render: {get: () => render},
      parsers: {get: () => parsers},
    });
  }
}

Object.freeze(Object.setPrototypeOf(TokenizerAPI.prototype, null));

TokenizerAPI.State = class State {
  constructor(...properties) {
    Object.assign(this, ...properties);
  }
};

Object.freeze(Object.setPrototypeOf(TokenizerAPI.State.prototype, null));

const UNSET = Symbol('');

/**
 * @typedef {import('./legacy/parser.js').Parser & {MODULE_URL?: string, tokenize?: API.tokenize}} Parser
 * @typedef {Partial<{variant?: number | string, fragment?: Fragment, [name: string]: any}>} Parser.Options
 */

/**
 * @typedef {TokenizerAPI & {tokenize: API.tokenize, warmup: API.warmup, render: API.render, parsers: Parser[]}} API
 * @typedef {TokenizerAPI.State} API.State
 * @typedef {Partial<Pick<API, 'tokenize' | 'warmup' | 'render' | 'parsers'>>} API.Options
 * @typedef {<T extends {}>(source: string, options: Parser.Options, flags?: Flags) => IterableIterator<T>} API.tokenize
 * @typedef {(source: string, options: Parser.Options, flags?: Flags) => void} API.warmup
 * @typedef {(source: string, options: Parser.Options, flags?: Flags) => Promise<Fragment>} API.render
 */

/**
 * @typedef {(string | Array<string> | Set<string>) & {length?: number, size?: number}} Flags
 * @typedef {DocumentFragment & {logs?: string[]}} Fragment
 */

/** @param {Pick<typeof globalThis, 'document'|'DocumentFragment'|'Element'|'Object'|'Node'|'Text'>} endowments */
const createNativeDOM = (endowments = globalThis) => {
  if (
    !(
      typeof endowments === 'object' &&
      typeof endowments.document === 'object' &&
      ['createElement', 'createTextNode', 'createDocumentFragment'].every(
        method => typeof endowments.document[method] === 'function',
      )
    )
  )
    return (endowments = undefined);

  const native = {};

  native.Object = endowments.Object || globalThis.Object;
  // dom.String = endowments.String || globalThis.String;
  // dom.Set = endowments.Set || globalThis.Set;
  // dom.Symbol = endowments.Symbol || globalThis.Symbol;
  native.document = endowments.document;

  /** @type {typeof endowments.DocumentFragment} */
  native.DocumentFragment = endowments.DocumentFragment || native.document.createDocumentFragment().constructor;

  /** @type {typeof endowments.Element} */
  native.Element =
    endowments.Element ||
    (() => {
      let prototype = native.document.createElement('span');
      while (
        prototype.constructor &&
        prototype.constructor.name.startsWith('HTML') &&
        prototype !== (prototype = native.Object.getPrototypeOf(prototype) || prototype)
      );
      return prototype.constructor.name === 'Element' ? prototype.constructor : undefined;
    })();

  /** @type {typeof endowments.Node} */
  native.Node =
    endowments.Node ||
    (native.Element &&
      (() => {
        let prototype = native.Object.getPrototypeOf(native.Element.prototype);
        return prototype.constructor.name === 'Node' ? prototype.constructor : undefined;
      })());

  /** @type {typeof endowments.Text} */
  native.Text = endowments.Text || native.document.createTextNode('').constructor;

  native.createElement = (tag, properties, ...children) => {
    const element = native.document.createElement(tag);
    properties && native.Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  };
  native.createText = (content = '') => native.document.createTextNode(content);
  native.createFragment = () => native.document.createDocumentFragment();

  endowments = undefined;

  return native.Object.freeze(/** @type {typeof native} */ (native.Object.setPrototypeOf(native, null)));
};

// @ts-check
const applyEntitiesMixin = (() => {
  const entities = Object.freeze({
    extractCodePoint: Object.freeze(
      /** @type {(source: any, index: number) => number} */
      (Function.call.bind(''.charCodeAt)),
    ),
    replaceEntities: Object.freeze(
      /** @type {(source: any, replacer: string|Function) => string} */
      (RegExp.prototype[Symbol.replace].bind(/[\u00A0-\u9999<>\&]/g)),
    ),
    encodeEntities: Object.freeze(
      /** @type {(source: any) => string} */
      source => entities.replaceEntities(source, entities.encodeEntity),
    ),
    encodeEntity: Object.freeze(
      /** @type {(source: any) => string} */
      source => `&#${entities.extractCodePoint(source, 0)};`,
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof entities}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(entities)),
  );
})();

// @ts-check
const applyEndowmentsMixin = (() => {
  const endowments = Object.freeze({
    fixClassInheritance: Object.freeze(
      /**
       * @template T, U
       * @param {(new () => T & U)} Class
       * @param {(new () => U) | null | undefined} Super
       * @param {Pick<typeof globalThis, 'Object'>} endowments
       */
      (Class, Super, endowments = globalThis) => {
        endowments.Object.setPrototypeOf(
          Class.prototype,
          Super === null ? null : Super ? Super.prototype : endowments.Object.prototype,
        );

        endowments.Object.setPrototypeOf(Class, Super == null ? endowments.Object : Super);

        return Class;
      },
    ),
    checkPrimordialEndowments: Object.freeze(
      /**
       * @template {Pick<typeof globalThis, 'Object' | U>} T
       * @template {keyof typeof globalThis} U
       * @param {{[k in keyof T]?: T[k] & {__proto__: object}}} endowments
       * @param {U[]} primordials
       */
      (endowments, ...primordials) => {
        for (const endowment of `Object,${primordials}`.replace(/^,Object|(,\w+)(?=.*?\1)/g, '').split(',')) {
          if (
            endowment === 'Object'
              ? !(
                  typeof endowments[endowment] === 'function' &&
                  typeof endowments[endowment].prototype === 'object' &&
                  endowments[endowment].prototype !== null &&
                  endowments[endowment].__proto__ &&
                  endowments[endowment].__proto__.__proto__ === endowments.Object.prototype
                )
              : endowment in endowments &&
                !(
                  typeof endowments[endowment] === 'function' &&
                  endowments[endowment].prototype != null &&
                  // typeof endowments[endowment].prototype === 'object' &&
                  endowments[endowment].__proto__ === endowments.Object.__proto__ &&
                  endowments[endowment].prototype.__proto__ === endowments.Object.prototype
                )
          )
            throw `Error: createPseudoDOM invoked with an invalid ‹${endowment}› endowment.`;
        }
      },
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof endowments}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(endowments)),
  );
})();

// @ts-check
const applyQueriesMixin = (() => {
  const queries = Object.freeze({
    querySelector: Object.freeze(
      /**
       * @param {Element | DocumentFragment} scope
       * @param {string} selector
       */
      (scope, selector) => {},
    ),
    querySelectorAll: Object.freeze(
      /**
       * @param {Element | DocumentFragment} scope
       * @param {string} selector
       */
      (scope, selector) => {},
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof queries}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(queries)),
  );
})();

// @ts-check

const {
  Pseudom,
  Pseudom: {encodeEntity, encodeEntities},
} = {Pseudom: Object.freeze(applyQueriesMixin(applyEntitiesMixin(applyEndowmentsMixin(class Pseudom {}))))};

/** @param {Pick<typeof globalThis, 'Object'|'Set'|'String'|'Symbol'>} endowments */
const createPseudoDOM = (endowments = globalThis) => {
  const pseudo = {};

  pseudo.Object = endowments.Object || globalThis.Object;
  pseudo.Set = endowments.Set || globalThis.Set;
  pseudo.String = endowments.String || globalThis.String;
  pseudo.Symbol = endowments.Symbol || globalThis.Symbol;

  Pseudom.checkPrimordialEndowments(pseudo, ...['Object', 'Set', 'String', 'Symbol']);

  pseudo.document = null;

  pseudo.CSSStyleDeclaration = class CSSStyleDeclaration extends pseudo.Object {
    get cssText() {
      const cssProperties = [];

      for (const [key, value] of pseudo.Object.entries(this))
        typeof key !== 'string' ||
          key !== key.trim() ||
          // NOTE: We only ever expect strings and numbers
          !(typeof value === 'string' ? value.trim() : typeof value === 'number' ? !isNaN(value) : null) ||
          cssProperties.push(`${key}: ${CSSStyleDeclaration.normalizeValue(value)}`);

      return cssProperties.join(';');
    }

    toString() {
      return this.cssText;
    }

    toJSON() {
      return this.toString();
    }

    static normalizeValue(value) {
      return value || value === 0 ? /\s*;*$/[pseudo.Symbol.replace](value, '') : '';
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.CSSStyleDeclaration).prototype);

  pseudo.DOMStringMap = class DOMStringMap extends pseudo.Object {};

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMStringMap).prototype);

  // TODO: Consider support for Element.classList
  //       For now we list the simplicity of Element.className
  pseudo.DOMTokenList = class DOMTokenList extends pseudo.Set {
    toString() {
      return [...this].join(' ');
    }

    toJSON() {
      return this.toString();
    }

    static normalizeString(string) {
      return string ? /[\n\t\s]+/g[pseudo.Symbol.replace](string, ' ').trim() : '';
    }

    static from(...list) {
      return new DOMTokenList(DOMTokenList.normalizeList(...list).split(' '));
    }

    static normalizeList(...list) {
      return list.length ? DOMTokenList.normalizeString(list.filter(Boolean).join(' ')) : '';
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMTokenList).prototype);

  pseudo.NodeList = class NodeList extends pseudo.Set {};

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.NodeList).prototype);

  pseudo.Node = class Node extends pseudo.Object {
    get childNodes() {
      return pseudo.Object.defineProperty(this, 'childNodes', {value: new pseudo.NodeList()}).childNodes;
    }

    get childElementCount() {
      return (this.hasOwnProperty('childNodes') && this.childNodes.size) || 0;
    }

    get textContent() {
      return (this.hasOwnProperty('childNodes') && this.childNodes.size && [...this.childNodes].join('')) || '';
    }

    set textContent(text) {
      this.hasOwnProperty('childNodes') && this.childNodes.size && this.childNodes.clear();
      text && this.appendChild(new pseudo.Text(text));
    }

    insertBefore(node, nextNode) {
      if (!this.childNodes.has(nextNode))
        throw ReferenceError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a child.`);
      if (!(node !== null && typeof node === 'object' && node instanceof Node))
        throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 1 is not a Node.`);
      if (!(nextNode !== null && typeof nextNode === 'object' && nextNode instanceof Node))
        throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a Node.`);
      node.parentNode == null || node.parentNode.removeChild(node);
      pseudo.Object.defineProperties(node, {
        parentNode: {value: this, writable: false, configurable: true},
        previousSibling: {value: nextNode.previousSibling || null, writable: false, configurable: true},
        nextSibling: {value: nextNode, writable: false, configurable: true},
      });
      !nextNode.previousSibling
        ? pseudo.Object.defineProperty(this, 'firstNode', {value: node, writable: false, configurable: true})
        : pseudo.Object.defineProperty(nextNode.previousSibling, 'nextSibling', {
            value: node,
            writable: false,
            configurable: true,
          });
      pseudo.Object.defineProperty(nextNode, 'previousSibling', {value: node, writable: false, configurable: true});
      const childNodes = [...this.childNodes];
      childNodes.splice(childNodes.indexOf(nextNode), 0, node);
      this.childNodes.clear();
      this.childNodes.add(...childNodes);
      return node;
    }

    appendChild(node) {
      if (!(node !== null && typeof node === 'object' && node instanceof Node))
        throw TypeError(`Failed to execute 'appendChild' on 'Node': 1 argument required, but only 0 present.`);
      node.parentNode == null || node.parentNode.removeChild(node);
      pseudo.Object.defineProperties(node, {
        parentNode: {value: this, writable: false, configurable: true},
        previousSibling: {value: this.lastChild || null, writable: false, configurable: true},
        nextSibling: {value: null, writable: false, configurable: true},
      });
      !node.previousSibling ||
        pseudo.Object.defineProperties(node.previousSibling, {
          nextSibling: {value: node, writable: false, configurable: true},
        });
      pseudo.Object.defineProperties(this, {
        firstChild: {value: this.firstChild || node, writable: false, configurable: true},
        lastChild: {value: node, writable: false, configurable: true},
      });
      this.childNodes.add(node);
      return node;
    }

    removeChild(node) {
      if (!(node && node.parentNode === this))
        throw TypeError(`Failed to execute 'removeChild' on 'Node': 1 argument required, but only 0 present.`);

      node.previousSibling
        ? pseudo.Object.defineProperty(node.previousSibling, 'nextSibling', {
            value: node.nextSibling || null,
            writable: false,
            configurable: true,
          })
        : pseudo.Object.defineProperty(this, 'firstChild', {
            value: null,
            writable: false,
            configurable: true,
          });
      node.nextSibling
        ? pseudo.Object.defineProperty(node.nextSibling, 'previousSibling', {
            value: node.previousSibling || null,
            writable: false,
            configurable: true,
          })
        : pseudo.Object.defineProperty(this, 'lastChild', {
            value: null,
            writable: false,
            configurable: true,
          });
      pseudo.Object.defineProperties(node, {
        parentNode: {value: null, writable: false, configurable: true},
        previousSibling: {value: null, writable: false, configurable: true},
        nextSibling: {value: null, writable: false, configurable: true},
      });
      this.childNodes.delete(node);
      return node;
    }
  };

  pseudo.Node.prototype.firstChild = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.lastChild = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.previousSibling = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.nextSibling = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.parentNode = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.parentElement = /** @type {Node|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Node).prototype);

  pseudo.HTMLCollection = class HTMLCollection extends pseudo.Set {
    get length() {
      return this.size;
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.HTMLCollection).prototype);

  pseudo.ParentNode = class ParentNode extends pseudo.Node {
    get children() {
      return pseudo.Object.defineProperty(this, 'children', {value: new pseudo.HTMLCollection()}).children;
    }

    get childElementCount() {
      return ('children' in this && this.children.length) || 0;
    }

    append(...nodes) {
      if (nodes.length)
        for (const node of nodes)
          node === '' || this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node));
    }

    prepend(...nodes) {
      if (nodes.length)
        for (const node of nodes)
          node === '' ||
            (this.childElementCount > 0
              ? this.insertBefore(typeof node === 'object' ? node : new pseudo.Text(node), this.firstChild)
              : this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node)));
    }

    insertBefore(node, nextNode) {
      super.insertBefore(node, nextNode);
      if (node instanceof pseudo.Element) {
        pseudo.Object.defineProperties(node, {
          parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
          previousElementSibling: {value: nextNode.previousElementSibling || null, writable: false, configurable: true},
          nextElementSibling: {value: nextNode, writable: false, configurable: true},
        });
        !nextNode.previousElementSibling
          ? pseudo.Object.defineProperty(this, 'firstElementChild', {value: node, writable: false, configurable: true})
          : pseudo.Object.defineProperty(nextNode.previousElementSibling, 'nextElementSibling', {
              value: node,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperty(nextNode, 'previousElementSibling', {
          value: node,
          writable: false,
          configurable: true,
        });
        const children = [...this.children];
        children.splice(children.indexOf(nextNode), 0, node);
        this.children.clear();
        this.children.add(...children);
      }
      return node;
    }

    appendChild(node) {
      super.appendChild(node);
      if (node instanceof pseudo.Element) {
        pseudo.Object.defineProperties(node, {
          parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
          previousElementSibling: {value: this.lastElementChild || null, writable: false, configurable: true},
          nextElementSibling: {value: null, writable: false, configurable: true},
        });
        !node.previousElementSibling ||
          pseudo.Object.defineProperty(node.previousElementSibling, 'previousElementSibling', {
            value: node,
            writable: false,
            configurable: true,
          });
        pseudo.Object.defineProperties(this, {
          firstElementChild: {value: this.firstElementChild || node, writable: false, configurable: true},
          lastElementChild: {value: node, writable: false, configurable: true},
        });
        this.children.add(node);
      }
      return node;
    }

    removeChild(node) {
      super.removeChild(node);
      if (node instanceof pseudo.Element) {
        node.previousElementSibling
          ? pseudo.Object.defineProperty(node.previousElementSibling, 'nextElementSibling', {
              value: node.nextElementSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'firstElementChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        node.nextElementSibling
          ? pseudo.Object.defineProperty(node.nextElementSibling, 'previousElementSibling', {
              value: node.previousElementSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'lastElementChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperties(node, {
          parentElement: {value: null, writable: false, configurable: true},
          previousElementSibling: {value: null, writable: false, configurable: true},
          nextElementSibling: {value: null, writable: false, configurable: true},
        });
        this.children.delete(node);
      }
      return node;
    }
  };

  pseudo.ParentNode.prototype.firstElementChild = /** @type {Element|null} */ (null);
  pseudo.ParentNode.prototype.lastElementChild = /** @type {Element|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.ParentNode).prototype);

  pseudo.Element = class Element extends pseudo.Node {
    get style() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'style', {
          value: new pseudo.CSSStyleDeclaration(),
          writable: false,
          configurable: true,
        }).style;
      throw Error(`Invalid invocation of Element.style getter/setter.`);
    }

    set style(value) {
      value == null || pseudo.Object.assign(this.style, {...value});
    }

    get dataset() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'dataset', {
          value: new pseudo.DOMStringMap(),
          writable: false,
          configurable: true,
        }).dataset;
      throw Error(`Invalid invocation of Element.dataset getter/setter.`);
    }

    set dataset(value) {
      value == null || pseudo.Object.assign(this.dataset, {...value});
    }

    get innerHTML() {
      return this.textContent;
    }

    set innerHTML(text) {
      this.textContent = text;
    }

    get outerHTML() {
      let {className, tag, innerHTML, dataset} = this;

      className && (className = className.trim()) && (className = pseudo.DOMTokenList.normalizeString(className));

      const openTag = [tag];

      className && openTag.push(`class="${className}"`);

      if (this.hasOwnProperty('style')) openTag.push(`style=${JSON.stringify(this.style.cssText)}`);

      if (this.hasOwnProperty('dataset'))
        for (const [key, value] of pseudo.Object.entries(this.dataset))
          typeof key !== 'string' ||
            key !== key.trim() ||
            value == null ||
            typeof value === 'symbol' ||
            openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

      return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
    }

    toString() {
      return this.outerHTML;
    }

    toJSON() {
      return this.toString();
    }

    remove() {
      this.parentElement && this.parentElement.removeChild(this);
    }
  };

  pseudo.Object.defineProperties(pseudo.Element.prototype, {
    children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
    childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
    append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
    prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
    appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
    removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
    insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
    firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
    lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
  });

  pseudo.Element.prototype.previousElementSibling = /** @type {Element|null} */ (null);
  pseudo.Element.prototype.nextElementSibling = /** @type {Element|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Element).prototype);

  pseudo.DocumentFragment = class DocumentFragment extends pseudo.Node {
    toString() {
      return this.textContent;
    }

    toJSON() {
      return (this.childElementCount && [...this.childNodes]) || [];
    }

    [pseudo.Symbol.iterator]() {
      return ((this.childElementCount && this.childNodes) || '')[pseudo.Symbol.iterator]();
    }
  };

  pseudo.Object.defineProperties(pseudo.DocumentFragment.prototype, {
    children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
    childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
    append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
    prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
    appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
    removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
    insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
    firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
    lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
  });

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DocumentFragment).prototype);

  /** @type {typeof globalThis.Text} */
  pseudo.Text = class Text extends pseudo.Node {
    constructor(textContent) {
      pseudo.Object.defineProperty(super(), 'textContent', {
        value: `${textContent}`,
        writable: false,
        configurable: true,
      });
    }
    toString() {
      return Pseudom.encodeEntities(this.textContent.toString());
    }
  };

  pseudo.Object.defineProperties(pseudo.Text.prototype, {
    textContent: {value: '', writable: false, configurable: true},
  });

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Text).prototype);

  pseudo.createElement = pseudo.Object.freeze((tag, properties, ...children) => {
    const element = new pseudo.Element();
    element.tag = tag;
    properties == null ||
      (({dataset: element.dataset, className: element.className, ...element.properties} = properties),
      element.className || (element.className = ''));
    children.length && element.append(...children);
    return element;
  });

  pseudo.createText = pseudo.Object.freeze((content = '') => new pseudo.Text(content));

  pseudo.createFragment = pseudo.Object.freeze(() => new pseudo.DocumentFragment());

  endowments = undefined;

  // console.log(pseudo);

  return pseudo.Object.freeze(pseudo);
};

const pseudo = createPseudoDOM(globalThis);
const native =
  globalThis.document && globalThis.document.defaultView === globalThis && createNativeDOM(globalThis);

/// <reference lib="esnext.asynciterable" />
/**
 * @template T
 * @typedef {Promise<T> | T} async
 */

/**
 * @template T
 * @typedef {{next(): async<IteratorResult<async<T>>>}} iterator
 */

/**
 * @template T
 * @typedef {iterator<T> | {[Symbol.iterator](): iterator<T>}  | {[Symbol.asyncIterator](): iterator<T>}} iterable
 */

/**
 * @template T, U
 * @param {iterable<T>} iterable
 * @param {(value: T) => U} ƒ
 */
async function each(iterable, ƒ) {
  const iterator =
    (iterable && ('next' in iterable && typeof iterable.next === 'function' && iterable)) ||
    ((Symbol.asyncIterator in iterable && iterable[Symbol.asyncIterator]()) ||
      (Symbol.iterator in iterable && iterable[Symbol.iterator]()));
  try {
    if (iterator || typeof iterator.next === 'function') {
      let result, done;
      while (!done && (result = await iterator.next())) {
        await ƒ(await result.value);
        done = result.done;
      }
    }
  } finally {
    iterator &&
      iterable !== iterator &&
      'return' in iterator &&
      typeof iterator.return === 'function' &&
      iterator.return();
  }
}

//@ts-check

/// IMPLEMENTATION

class MarkupRenderer {
  constructor(options) {
    this.defaults = new.target.defaults || MarkupRenderer.defaults;

    Object.isFrozen(this.defaults) || Object.freeze((this.defaults = {...this.defaults}));

    this.options = {defaults: this.defaults, ...this.defaults, ...options};

    this.options.MARKUP_CLASS =
      /^\w+$|$/.exec(this.options.MARKUP_CLASS || this.defaults.MARKUP_CLASS)[0].toLowerCase() || 'markup';

    this.classes = {MARKUP_CLASS: this.options.MARKUP_CLASS, ...this.defaults.classes, ...this.options.classes};

    if (this.options.classes !== this.defaults.classes || this.options.MARKUP_CLASS !== this.defaults.MARKUP_CLASS) {
      const prefix = /^\w+(?=-|$)/;
      for (const [key, value] of Object.entries(this.classes)) {
        if (key === 'MARKUP_CLASS') continue;
        if (typeof key !== 'string') continue;
        if (!prefix.test(value) && key.includes('_'))
          throw Error(`Invalid MarkupRenderer class ‹{${key}: ${JSON.stringify(value)}›.`);
        this.classes[key] = /^\w+(?=-|$)/
          [Symbol.replace](
            value || this.defaults.classes[key] || key.toLowerCase().replace(/_/g, '-'),
            this.options.MARKUP_CLASS,
          )
          .toLowerCase();
      }
    }

    this.classes.MARKUP_SPACE = `whitespace ${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_WHITESPACE}`;
    this.classes.MARKUP_COMMENT = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ANNOTATION}`;
    this.classes.MARKUP_KEYWORD = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ENTITY}`;
    this.classes.MARKUP_IDENTIFIER = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_IDENTITY}`;
    this.classes.MARKUP_LITERAL = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-literal`;
    this.classes.MARKUP_SPAN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-span`;
    this.classes.MARKUP_STRING = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-string`;
    this.classes.MARKUP_PATTERN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-pattern`;
    this.classes.MARKUP_PUNCTUATOR = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-punctuator`;

    this.elements = {...this.defaults.elements, ...this.options.elements};

    this.options.classes = Object.freeze(this.classes);

    this.dom = this.options.dom || (this.options.dom = new.target.dom || MarkupRenderer.dom);

    Object.freeze(this.options);

    this.renderers = {
      line: new.target.factory(
        this.elements.LINE,
        {markupHint: '', markupClass: this.classes.MARKUP_LINE},
        this.options,
      ),
      fault: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `fault`, markupClass: this.classes.MARKUP_FAULT},
        this.options,
      ),
      text: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `text`, markupClass: this.classes.MARKUP_TOKEN},
        this.options,
      ),
      sequence: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `sequence`, markupClass: this.classes.MARKUP_TOKEN},
        this.options,
      ),

      whitespace: this.dom.Text,

      inset: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `inset`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
        this.options,
      ),

      break: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `break`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
        this.options,
      ),

      comment: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `comment`, markupClass: this.classes.MARKUP_COMMENT},
        this.options,
      ),

      keyword: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `keyword`, markupClass: this.classes.MARKUP_KEYWORD},
        this.options,
      ),
      identifier: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `identifier`, markupClass: this.classes.MARKUP_IDENTIFIER},
        this.options,
      ),

      literal: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `literal`, markupClass: this.classes.MARKUP_LITERAL},
        this.options,
      ),
      number: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `number`, markupClass: `literal ${this.classes.MARKUP_LITERAL}`},
        this.options,
      ),
      string: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `string`, markupClass: this.classes.MARKUP_STRING},
        this.options,
      ),
      quote: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `quote`, markupClass: `string ${this.classes.MARKUP_STRING}`},
        this.options,
      ),
      pattern: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `pattern`, markupClass: this.classes.MARKUP_PATTERN},
        this.options,
      ),

      punctuator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `punctuator`, markupClass: `${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      operator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `operator`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      assigner: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `assigner`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      combinator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {
          markupHint: `combinator`,
          markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`,
        },
        this.options,
      ),
      delimiter: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `delimiter`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      punctuation: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `punctuation`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      breaker: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `breaker`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      opener: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `opener`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      closer: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `closer`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      span: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `span`, markupClass: `${this.classes.MARKUP_SPAN}`},
        this.options,
      ),
    };
  }

  async render(tokens, fragment) {
    let logs, template, first, elements;
    try {
      fragment || (fragment = MarkupRenderer.dom.Fragment());
      logs = fragment.logs; // || (fragment.logs = []);
      elements = this.renderer(tokens);
      if ((first = await elements.next()) && 'value' in first) {
        template = MarkupRenderer.dom.Template();
        if (!MarkupRenderer.dom.native && template && 'textContent' in fragment) {
          logs && logs.push(`render method = 'text' in template`);
          const body = [first.value];
          first.done || (await each(elements, element => element && body.push(element)));
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);
        } else if ('push' in fragment) {
          logs && logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          first.done || (await each(elements, element => element && fragment.push(element)));
        } else if ('append' in fragment) {
          logs && logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          first.done || (await each(elements, element => element && fragment.append(element)));
        }
      }
      return fragment;
    } finally {
      template && (template.innerHTML = '');
      template = fragment = logs = elements = first = null;
    }
  }

  *renderer(tokens) {
    let renderedLine, LineInset, normalizedLineInset, normalizedLineText, lineBreak, insetHint;
    let type, text, punctuator, hint, lineInset, lineBreaks, renderer;
    const {
      renderers,
      options: {REFLOW: reflows},
    } = this;
    const Lines = /^/gm;
    const Tabs = /\t+/g;
    const createLine = reflows
      ? () => (renderedLine = renderers.line())
      : () => (renderedLine = renderers.line('', 'no-reflow'));
    const emit = (renderer, text, type, hint) => {
      text == null && (text = '');
      (renderedLine || createLine()).appendChild(renderer(text, hint || type));
      if (type === 'inset') {
        renderedLine.style['--markup-line-inset-spaces'] =
          text.length - (renderedLine.style['--markup-line-inset-tabs'] = text.length - text.replace(Tabs, '').length);
        renderedLine.dataset['markup-line-inset'] = text;
      }
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint);
    const emitBreak = hint => emit(renderers.break, '\n', 'break', hint);

    for (const token of tokens) {
      if (!token || !token.text) continue;

      ({type = 'text', text, punctuator, hint, lineInset, lineBreaks} = token);

      renderer =
        (punctuator &&
          (renderers[punctuator] || (type && renderers[type]) || renderers.punctuator || renderers.operator)) ||
        (type && (renderers[type] || (type !== 'whitespace' && type !== 'break' && renderers.text))) ||
        MarkupRenderer.dom.Text;

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (reflows && lineBreaks && type !== 'break') {
        LineInset = void (lineInset = lineInset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const normlizedline of text.split(Lines)) {
          (normalizedLineInset = normlizedline.startsWith(lineInset)
            ? normlizedline.slice(0, lineInset.length)
            : normlizedline.match(LineInset || (LineInset = RegExp(`^${lineInset.replace(/./g, '$&?')}|`)))[0]) &&
            emitInset(normalizedLineInset, insetHint);

          (normalizedLineText = normalizedLineInset
            ? normlizedline.slice(normalizedLineInset.length)
            : normlizedline) &&
            ((normalizedLineText === '\n'
              ? ((lineBreak = normalizedLineText), (normalizedLineText = ''))
              : normalizedLineText.endsWith('\n')
              ? ((lineBreak = '\n'),
                (normalizedLineText = normalizedLineText.slice(0, normalizedLineText.endsWith('\r\n') ? -2 : -1)))
              : !(lineBreak = '')) && emit(renderer, normalizedLineText, type, hint),
            lineBreak && (emitBreak(), renderedLine && (renderedLine = void (yield renderedLine))));
        }
      } else {
        // TODO: See if pseudom children can be optimized for WBR/BR clones
        emit(renderer, text, type, hint);
        type === 'break'
          ? renderedLine && (renderedLine = void (yield renderedLine))
          : type === 'whitespace' ||
            //@ts-ignore
            renderedLine.appendChild(MarkupRenderer.dom.Element('wbr'));
      }
    }
    renderedLine && (yield renderedLine);
  }

  /**
   * @template {{markupHint: string}} T
   * @param {string} tagName
   * @param {T & Partial<HTMLElement>} properties
   * @param {MarkupRenderer['options']} [options]
   * @param {typeof MarkupRenderer['dom']} [dom]
   */
  static factory(tagName, properties, options, dom) {
    let defaults = /** @type {MarkupRenderer['options']} */ ((this &&
      Object.prototype.isPrototypeOf.call(MarkupRenderer, this) &&
      this.defaults) ||
      MarkupRenderer.defaults);
    let markupClass = defaults.MARKUP_CLASS;
    let markupHint = '';
    ({
      0: tagName = 'span',
      2: options = defaults,
      3: dom = options.dom || MarkupRenderer.dom,
    } = /** @type {*} */ (arguments));

    //@ts-ignore
    ({markupClass = options.MARKUP_CLASS || markupClass, markupHint = '', ...properties} = /** @type {*} */ ({
      ...properties,
    }));

    properties.className = `${markupHint ? `${markupClass} ${markupHint}` : markupClass} ${
      options.MARKUP_CLASS || defaults.MARKUP_CLASS
    }`;

    return new (this.Factory || MarkupRenderer.Factory)({tagName, options, markupHint, markupClass, properties, dom})
      .render;
  }
}

{
  const defaults = {};

  /** Specifies the intended mode for rendering a token @type {'html'} */
  defaults.MODE = 'html';
  /** Tag name of the element to use for rendering a token. */
  defaults.SPAN = 'span';
  /** Tag name of the element to use for grouping tokens in a single line. */
  defaults.LINE = 'span';
  /** The bare class name for all rendered markup nodes. */
  defaults.MARKUP_CLASS = 'markup';
  /** Enable renderer-side unpacking { inset } || { breaks > 0 } tokens */
  defaults.REFLOW = true;

  defaults.elements = {
    MARKUP_LINE: 'span',
    MARKUP_TOKEN: 'span',
  };

  defaults.classes = {
    /** The bare class name for all rendered markup nodes. */
    MARKUP_CLASS: 'markup',
    /** The prefixed class name for rendered markup lines. */
    MARKUP_LINE: 'markup-line',
    /** The prefixed class name for rendered markup tokens. */
    MARKUP_TOKEN: 'markup-token',
    /** The prefixed class name for rendered markup tokens. */
    MARKUP_FAULT: 'markup-fault',
    /** The prefixed class name for rendered markup whitespace tokens. */
    MARKUP_WHITESPACE: 'markup-whitespace',
    /** The prefixed class name for rendered markup punctuation tokens. */
    MARKUP_PUNCTUATION: 'markup-punctuation',
    /** The prefixed class name for rendered markup annotation tokens. */
    MARKUP_ANNOTATION: 'markup-annotation',
    /** The prefixed class name for rendered markup entity tokens. */
    MARKUP_ENTITY: 'markup-entity',
    /** The prefixed class name for rendered markup identity tokens. */
    MARKUP_IDENTITY: 'markup-identity',
    /** The prefixed class name for rendered markup atoms. */
    MARKUP_ATOM: 'markup-atom',
  };

  MarkupRenderer.defaults = defaults;

  Object.freeze(defaults);
}

MarkupRenderer.Factory = class Factory {
  /** @param {{tagName: string, markupHint: string, markupClass: string, properties: Partial<HTMLElement>, options: MarkupRenderer['options'], dom: typeof MarkupRenderer['dom']}} configuration */
  constructor({tagName, markupHint, markupClass, properties, options, dom}) {
    this.tagName = tagName;
    this.properties = Object.freeze({...properties});
    this.markupHint = markupHint || '';
    this.markupClass = markupClass || MarkupRenderer.defaults.MARKUP_CLASS;
    this.options = options;
    this.dom = dom;
    this.render = this.render.bind(this);
    Object.freeze(this);
  }

  render(content, hint) {
    let element, hintSeparator;

    element =
      (typeof content === 'string' && (content = this.dom.Text(content))) || content != null
        ? this.dom.Element(this.tagName, this.properties, content)
        : this.dom.Element(this.tagName, this.properties);

    typeof hint === 'string' && hint !== '' && (hintSeparator = hint.indexOf('\n\n')) !== -1
      ? ((element.dataset = {
          'markup-hint': `${this.markupHint}${this.dom.escape(hint.slice(hintSeparator))}`,
        }),
        hintSeparator === 0 || (element.className = `${element.className} ${hint.slice(0, hintSeparator)}`))
      : (hint && (element.className = `${element.className} ${hint}`),
        (element.dataset = {'markup-hint': hint || this.markupHint || element.className}));

    return element;
  }
};

MarkupRenderer.dom = (() => {
  /** Uses lightweight proxy objects that can be serialized into HTML text */
  const HTML_MODE = MarkupRenderer.defaults.MODE === 'html';
  const supported = !!native;
  const native$1 = !HTML_MODE && supported;
  const implementation = native$1 ? native : pseudo;
  const {createElement: Element, createText: Text, createFragment: Fragment} = implementation;
  const Template = template =>
    !supported || Template.supported === false
      ? false
      : Template.supported === true
      ? document.createElement('template')
      : (Template.supported = !!(
          (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
        )) && template;
  const escape = /** @type {(source: string) => string} */ (((replace, replacement) => string =>
    replace(string, replacement))(
    RegExp.prototype[Symbol.replace].bind(/[\0-\x1F"\\]/g),
    m => `&#x${m.charCodeAt(0).toString(16)};`,
  ));

  Template.supported = undefined;

  return Object.freeze({supported, native: native$1, implementation, escape, Element, Text, Fragment, Template});
})();

/// INTERFACE

const markupDOM = new MarkupRenderer();

//@ts-check
const CurrentMatch = Symbol('CurrentMatch');
const CurrentToken = Symbol('CurrentToken');
const CreatedToken = Symbol('CreatedToken');
const TotalTokens = Symbol('TotalTokens');
const TotalMatches = Symbol('TotalMatches');
const Next = Symbol('Next');
const Initialize = Symbol('Initialize');
const Finalize = Symbol('Finalize');
const Tokens = Symbol('Tokens');

/** @template {RegExp} T  @implements {MatcherIterator<T>} */
class MatcherState {
  /** @param {Partial<MatcherState<T>> & {initialize?(): void, finalize?(): void}} properties */
  constructor({source, matcher, initialize, finalize, ...properties}) {
    Object.assign(this, properties);

    this.done = false;
    /** @type {*} */
    this.value = undefined;

    /** @type {string} */
    this.source = String(source);
    /** @type {T} */
    this.matcher =
      matcher &&
      (matcher instanceof RegExp
        ? Object.setPrototypeOf(RegExp(matcher.source, matcher.flags || 'g'), matcher)
        : RegExp(matcher, 'g'));

    /** @type {RegExpExecArray} */
    this[CurrentMatch] = undefined;
    this[TotalMatches] = -1;
    this[Next] = this.getNextMatch;
    this[Initialize] =
      typeof initialize === 'function'
        ? () => {
            this.initialize();
            initialize();
          }
        : this.initialize;
    this[Finalize] =
      typeof finalize === 'function'
        ? () => {
            finalize();
            this.finalize();
          }
        : this.finalize;
  }

  initialize() {
    Object.defineProperties(this, {
      source: {value: this.source, writable: false, configurable: true},
      matcher: {value: this.matcher, writable: false, configurable: true},
    });
    this[TotalMatches] = 0;
  }

  finalize() {
    Object.freeze(this);
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.done) return this;
    if (this[TotalMatches] === -1) this[Initialize]();
    if ((this.done = (this.value = this[Next]()) == null)) this[Finalize]();
    else this[TotalMatches]++;
    return this;
  }

  getNextMatch() {
    return !this.done &&
      this.matcher.lastIndex <
        ((this[CurrentMatch] = this.matcher.exec(this.source)) != null /* */
          ? this.matcher.lastIndex + (this[CurrentMatch][0].length === 0 && 1)
          : this.matcher.lastIndex)
      ? this[CurrentMatch]
      : undefined;
  }
}

/** @template {RegExp} T  @extends {MatcherState<T>} */
class TokenizerState extends MatcherState {
  /** @param {Partial<TokenizerState<T>>} properties */
  constructor(properties) {
    super(properties)[Next] = this.getNextToken;
  }

  initialize() {
    super.initialize();
    this[TotalTokens] = 0;
  }

  finalize() {
    super.finalize();
  }

  getNextToken() {
    if (this.done || this.getNextMatch() == null) return;

    this[CurrentToken] = this[CreatedToken];
    this[CreatedToken] = this.createToken(this[CurrentMatch], this);

    if (this[CreatedToken] !== undefined) {
      this[CreatedToken].index = ++this[TotalTokens];
    }

    // Initial design considered holding on to one token
    //   that used to be set to state.nextToken along with
    //   the matching state.nextTokenContext.
    //
    // TODO: Replace graceful holding with construct stacking.
    return this[CurrentToken] || this.getNextToken();
  }

  get [Tokens]() {
    return Object.defineProperty(this, Tokens, {value: [], writable: false, configurable: true})[Tokens];
  }

  /** @template T @returns {T} */
  createToken(match, state) {
    return;
  }
}

TokenizerState.prototype.previousToken = TokenizerState.prototype.nextToken = /** @type {TokenMatcherToken} */ (undefined);

TokenizerState.defaults = {source: undefined, initialize: undefined, finalize: undefined};

//@ts-check

/** Matcher for composable matching */
class Matcher extends RegExp {
  /**
   * @param {MatcherPattern} pattern
   * @param {MatcherFlags} [flags]
   * @param {MatcherEntities} [entities]
   * @param {{currentMatch?:MatcherExecArray|null, lastMatch?:MatcherExecArray|null}} [state]
   */
  constructor(pattern, flags, entities, state) {
    //@ts-ignore
    super(pattern, flags);
    (pattern &&
      pattern.entities &&
      Symbol.iterator in pattern.entities &&
      ((!entities && (entities = pattern.entities)) || entities === pattern.entities)) ||
      Object.freeze(
        Object.assign((entities = (entities && Symbol.iterator in entities && [...entities]) || []), {
          flags,
          meta: Matcher.metaEntitiesFrom(entities),
          identities: Matcher.identityEntitiesFrom(entities),
        }),
      );

    /** @type {MatcherEntities} */
    this.entities = entities;
    this.state = state;
    this.exec = this.exec;
    this.capture = this.capture;

    ({DELIMITER: this.DELIMITER = Matcher.DELIMITER, UNKNOWN: this.UNKNOWN = Matcher.UNKNOWN} = new.target);
  }

  /** @param {MatcherExecArray} match */
  capture(match) {
    // @ts-ignore
    if (match === null) {
      if (this.state) this.state.lastMatch = this.state.currentMatch = null;
      return;
    }

    if (this.state) this.state.currentMatch = match;

    // @ts-ignore
    match.matcher = this;
    match.capture = {};

    //@ts-ignore
    for (
      let i = 0, entity;
      match[++i] === undefined ||
      void (
        (entity = this.entities[(match.entity = i - 1)]) == null ||
        (typeof entity === 'function'
          ? entity(match[0], i, match, this.state)
          : (match.capture[(match.identity = entity)] = match[0]))
      );

    );

    this.state.lastMatch = match;
    this.state.currentMatch = null;

    return match;
  }

  /** @param {string} source */
  exec(source) {
    const match = /** @type {MatcherExecArray} */ (super.exec(source));
    match == null || this.capture(match);
    return match;
  }

  /** @param {string} source */
  matchAll(source) {
    return /** @type {typeof Matcher} */ (this.constructor).matchAll(source, /** @type {any} */ (this));
  }

  /** @returns {entity is MatcherMetaEntity} */
  static isMetaEntity(entity) {
    return typeof entity === 'string' && entity.endsWith('?');
  }

  /** @returns {entity is MatcherIdentityEntity} */
  static isIdentityEntity(entity) {
    return typeof entity === 'string'
      ? entity !== '' && entity.trim() === entity && !entity.endsWith('?')
      : typeof entity === 'symbol';
  }

  static metaEntitiesFrom(entities) {
    return /** @type {MatcherEntitySet<MatcherMetaEntity>} */ (new Set([...entities].filter(Matcher.isMetaEntity)));
  }

  static identityEntitiesFrom(entities) {
    return /** @type {MatcherEntitySet<MatcherIdentityEntity>} */ (new Set(
      [...entities].filter(Matcher.isIdentityEntity),
    ));
  }

  /**
   * @param {MatcherPatternFactory} factory
   * @param {MatcherFlags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(factory, flags, properties) {
    /** @type {MatcherEntities} */
    const entities = [];
    entities.flags = '';
    const pattern = factory(entity => {
      if (entity !== null && entity instanceof Matcher) {
        entities.push(...entity.entities);

        !entity.flags || (entities.flags = entities.flags ? Matcher.flags(entities.flags, entity.flags) : entity.flags);

        return entity.source;
      } else {
        //@ts-ignore
        entities.push(((entity != null || undefined) && entity) || undefined);
      }
    });
    entities.meta = Matcher.metaEntitiesFrom(entities);
    entities.identities = Matcher.identityEntitiesFrom(entities);
    flags = Matcher.flags('g', flags == null ? pattern.flags : flags, entities.flags);
    const matcher = new ((this && (this.prototype === Matcher.prototype || this.prototype instanceof RegExp) && this) ||
      Matcher)(pattern, flags, entities);

    properties && Object.defineProperties(matcher, properties);

    return matcher;
  }

  static flags(...sources) {
    let flags, iterative, sourceFlags;
    flags = '';
    for (const source of sources) {
      sourceFlags =
        (!!source &&
          (typeof source === 'string'
            ? source
            : typeof source === 'object' &&
              typeof source.flags !== 'string' &&
              typeof source.source === 'string' &&
              source.flags)) ||
        undefined;
      if (!sourceFlags) continue;
      for (const flag of sourceFlags)
        (flag === 'g' || flag === 'y' ? iterative || !(iterative = true) : flags.includes(flag)) || (flags += flag);
    }
    return flags;
  }

  static get sequence() {
    const {raw} = String;
    const {replace} = Symbol;

    /**
     * @param {TemplateStringsArray} template
     * @param  {...any} spans
     * @returns {string}
     */
    const sequence = (template, ...spans) =>
      sequence.WHITESPACE[replace](raw(template, ...spans.map(sequence.span)), '');
    // const sequence = (template, ...spans) =>
    //   sequence.WHITESPACE[replace](sequence.COMMENTS[replace](raw(template, ...spans.map(sequence.span)), ''), '');

    /**
     * @param {any} value
     * @returns {string}
     */
    sequence.span = value =>
      (value &&
        // TODO: Don't coerce to string here?
        typeof value !== 'symbol' &&
        `${value}`) ||
      '';

    sequence.WHITESPACE = /^\s+|\s*\n\s*|\s+$/g;
    // sequence.COMMENTS = /(?:^|\n)\s*\/\/.*(?=\n)|\n\s*\/\/.*(?:\n\s*)*$/g;

    Object.defineProperty(Matcher, 'sequence', {value: Object.freeze(sequence), enumerable: true, writable: false});
    return sequence;
  }

  static get join() {
    const {sequence} = this;

    const join = (...values) => values.map(sequence.span).filter(Boolean).join('|');

    Object.defineProperty(Matcher, 'join', {value: Object.freeze(join), enumerable: true, writable: false});

    return join;
  }

  static get matchAll() {
    /** @template {RegExp} T @type {(string: MatcherText, matcher: T) => MatcherIterator<T> } */
    // const matchAll = (string, matcher) => new MatcherState(string, matcher);
    const matchAll = (() =>
      // TODO: Find a cleaner way to reference RegExp.prototype[Symbol.matchAll]
      Function.call.bind(
        String.prototype.matchAll || // TODO: Uncomment eventually
          {
            /**
             * @this {string}
             * @param {RegExp | string} pattern
             */
            *matchAll() {
              const matcher =
                arguments[0] &&
                (arguments[0] instanceof RegExp
                  ? Object.setPrototypeOf(RegExp(arguments[0].source, arguments[0].flags || 'g'), arguments[0])
                  : RegExp(arguments[0], 'g'));
              const string = String(this);

              if (!(matcher.flags.includes('g') || matcher.flags.includes('y')))
                return void (yield matcher.exec(string));

              for (
                let match, lastIndex = -1;
                lastIndex <
                ((match = matcher.exec(string))
                  ? (lastIndex = matcher.lastIndex + (match[0].length === 0))
                  : lastIndex);
                yield match, matcher.lastIndex = lastIndex
              );
            },
          }.matchAll,
      ))();

    Object.defineProperty(Matcher, 'matchAll', {value: Object.freeze(matchAll), enumerable: true, writable: false});

    return matchAll;
  }

  /**
   * @template {Matcher} T
   * @template {T} U
   * @template {{}} V
   * @param {T & V} matcher
   * @param {U} [instance]
   * @returns {U & V}
   */
  static clone(matcher, instance) {
    const {
      constructor: {prototype},
      source,
      flags,
      lastIndex,
      ...properties
    } = matcher;
    const clone = /** @type {U & V} */ (Object.assign(
      instance ||
        (prototype && 'source' in prototype && 'flags' in prototype
          ? RegExp(source, flags || 'g')
          : RegExp(matcher, 'g')),
      properties,
    ));
    // prototype && Object.setPrototypeOf(clone, prototype);
    Object.setPrototypeOf(
      clone,
      prototype || (this && this !== Matcher && this.prototype instanceof Matcher ? this.prototype : Matcher.prototype),
    );
    return clone;
  }

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenMatcherState} [state]
   * @returns {TokenMatcher}
   */
  static create(matcher, state) {
    /** @type {typeof Matcher} */
    const Species = !this || this === Matcher || !(this.prototype instanceof Matcher) ? Matcher : this;

    return Object.defineProperty(
      ((
        state || (state = Object.create(null))
      ).matcher = /** @type {typeof Matcher} */ (matcher &&
      matcher instanceof RegExp &&
      matcher.constructor &&
      'function' !== typeof (/** @type {typeof Matcher} */ (matcher.constructor).clone) // prettier-ignore
        ? matcher.constructor
        : Species === Matcher || typeof Species.clone !== 'function'
        ? Matcher
        : Species).clone(matcher)),
      'state',
      {value: state},
    );
  }
}

// Well-known identities for meaningful debugging which are
//   Strings but could possible be changed to Symbols
//
//   TODO: Revisit Matcher.UNKOWN
//

const {
  /** Identity for delimiter captures (like newlines) */
  DELIMITER = (Matcher.DELIMITER = Matcher.prototype.DELIMITER = /** @type {MatcherIdentityString} */ ('DELIMITER?')),
  /** Identity for unknown captures */
  UNKNOWN = (Matcher.UNKNOWN = Matcher.prototype.UNKNOWN = /** @type {MatcherIdentityString} */ ('UNKNOWN?')),
} = Matcher;

// @ts-check

class Tokenizer {
  constructor() {
    this.finalizeState = /** @type {<S extends TokenizerState>(state: S) => S} */ (undefined);
    this.initializeState = /** @type {<V, S extends TokenizerState>(state: S) => V & S} */ (undefined);
  }

  /** @type {<M extends MatcherArray, T extends {}, S extends TokenizerState>(init: MatcherMatch<M>, state?: S) => TokenMatcherToken} */
  createToken({0: text, identity, capture, index}, state) {
    // @ts-ignore
    return {
      // @ts-ignore
      type: (identity && (identity.description || identity)) || 'text',
      text,
      // @ts-ignore
      lineBreaks: countLineBreaks(text),
      lineInset: (capture && /** @type {any} */ (capture).inset) || '',
      lineOffset: index,
      capture,
    };
  }

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @template V
   * @param {string} string
   * @param {U & Partial<Record<'USE_ITERATOR'|'USE_GENERATOR', boolean>>} properties
   * @param {V} [flags]
   */
  tokenize(string, properties, flags) {
    return this.TokenGenerator(string, properties);
  }

  /** @template {Matcher} T @template {{}} U */
  *TokenGenerator() {
    /** @type {string} */
    const string = `${arguments[0]}`;
    /** @type {TokenMatcher<U>} */
    const matcher = /** @type {any} */ (TokenMatcher.create(/** @type {any} */ (this).matcher, arguments[1] || {}));

    const state = /** @type {TokenizerState<T, U>} */ (matcher.state);

    this.initializeState && this.initializeState(state);
    matcher.exec = matcher.exec;

    for (
      let match, capturedToken, retainedToken, index = 0;
      // BAIL on first failed/empty match
      ((match = matcher.exec(string)) !== null && match[0] !== '') ||
      //   BUT first yield a nextToken if present
      (retainedToken !== undefined && (yield retainedToken), (state.nextToken = undefined));

    ) {
      // @ts-ignore
      if ((capturedToken = this.createToken(match, state)) === undefined) continue;

      // HOLD back one grace token
      //   until createToken(…) !== undefined (ie new token)
      //   set the incremental token index for this token
      //   and keep it referenced directly on the state
      (state.nextToken = capturedToken).index = index++;

      //   THEN yield a previously held token
      if (retainedToken !== undefined) yield retainedToken;

      //   THEN finally clear the nextToken reference
      retainedToken = capturedToken;
      state.nextToken = undefined;
    }

    this.finalizeState && this.finalizeState(state);
  }
}

Object.preventExtensions(Object.setPrototypeOf(Object.freeze(Object.setPrototypeOf(Tokenizer, null)).prototype, null));

// @ts-check

/** @typedef {Object} TokenMatcher.State */

/** @template  U */
class TokenMatcher extends Matcher {
  /**
   * Safely updates the match to reflect the captured identity.
   *
   * NOTE: fault always sets match.flatten to false
   *
   * @template T @param {string} identity @param {T} match @returns {T}
   */
  static capture(identity, match) {
    // @ts-ignore
    match.capture[(match.identity = identity)] = match[0];
    // @ts-ignore
    (match.fault = identity === 'fault') && (match.flatten = false);
    return match;
  }

  /**
   * Safely mutates matcher state to open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} opener - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** open
   */
  static open(opener, state) {
    const {
      context: parentContext,
      context: {
        depth: index,
        goal: initialGoal,
        goal: {
          groups: {[opener]: group},
        },
      },
    } = state;

    if (!group) return initialGoal.type || 'sequence';
    state.groups.splice(index, state.groups.length, group);
    state.groups.closers.splice(index, state.groups.closers.length, group.closer);

    parentContext.contextCount++;

    const goal = group.goal === undefined ? initialGoal : group.goal;
    const forward = state.currentMatch != null && goal.spans != null && goal.spans[opener] != null;

    if (forward) {
      if (
        this.forward(
          goal.spans[opener],
          state,
          // DONE: fix deltas for forwards expressions
          // typeof goal.spans[text] === 'string' ? undefined : false,
        ) === 'fault'
      )
        state.nextFault = true;
      // return 'fault';

      // if (goal.type) state.currentMatch.format = goal.type;
      // if (match[match.format] = state.nextContext.goal.type || 'comment')
    }

    const nextContext = {
      id: `${parentContext.id} ${
        goal !== initialGoal ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}` : group[Symbol.toStringTag]
      }`,
      number: ++state.contexts.count,
      depth: index + 1,
      faults: state.nextFault === true ? 1 : 0,
      parentContext,
      goal,
      group,
      state,
    };

    typeof state.initializeContext === 'function' && state.initializeContext(nextContext);

    state.nextContext = state.contexts[index] = nextContext;

    if (state.nextFault === true && !(state.nextOffset > state.currentMatch.index + state.currentMatch[0].length)) {
      state.nextFault = undefined;
      return 'fault';
    }

    if (!!state.currentMatch.format && !!state.nextContext.goal.type)
      state.currentMatch[state.currentMatch.format] = state.nextContext.goal.type;

    if (state.currentMatch.format === 'punctuator')
      state.currentMatch.punctuator =
        (state.context.goal.punctuation != null && state.context.goal.punctuation[opener]) ||
        state.nextContext.goal.type ||
        undefined;

    if (state.nextContext.goal.flatten === true && state.currentMatch.flatten !== false)
      state.currentMatch.flatten = true;
  }

  /**
   * Safely ensures matcher state can open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} opener - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {boolean}
   */
  static canOpen(opener, state) {
    // const upperCase = text.toUpperCase();
    return /** @type {boolean} */ (state.context.goal.openers != null &&
      state.context.goal.openers[opener] === true &&
      (state.context.goal.spans == null ||
        state.context.goal.spans[opener] == null ||
        // Check if conditional span faults
        this.lookAhead(state.context.goal.spans[opener], state)));
  }
  /**
   * Safely ensures matcher state can open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} closer - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {boolean}
   */
  static canClose(closer, state) {
    // const upperCase = text.toUpperCase();
    return /** @type {boolean} */ (state.context.group.closer === closer ||
      (state.context.goal.closers != null && state.context.goal.closers[closer] === true));
  }

  /**
   * Safely mutates matcher state to close the current context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} closer - Text of the intended { type = "closer" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** closed
   */
  static close(closer, state) {
    // const groups = state.groups;
    const index = state.groups.closers.lastIndexOf(closer);

    // if (index === -1 || index !== state.groups.length - 1) return 'fault';
    if (
      index === -1 ||
      !(state.groups.length - index === 1 || (state.context.faults > 0 && state.groups.length - index === 2))
    )
      return 'fault';

    state.groups.closers.splice(index, state.groups.closers.length);
    state.groups.splice(index, state.groups.length);
    state.nextContext = state.context.parentContext;

    if (!!state.currentMatch.format && !!state.context.goal.type)
      state.currentMatch[state.currentMatch.format] = state.context.goal.type;

    if (state.currentMatch.format === 'punctuator')
      state.currentMatch.punctuator =
        (state.context.goal.punctuation != null && state.context.goal.punctuation[closer]) ||
        state.context.goal.type ||
        undefined;

    if (state.context.goal.flatten === true && state.currentMatch.flatten !== false) state.currentMatch.flatten = true;
  }

  /**
   * Safely mutates matcher state to close the current context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} delimiter - Text of the intended { type = "closer" | "opener" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** closed
   */
  static punctuate(delimiter, state) {
    if (TokenMatcher.canOpen(delimiter, state)) return TokenMatcher.open(delimiter, state) || 'opener';
    else if (TokenMatcher.canClose(delimiter, state)) return TokenMatcher.close(delimiter, state) || 'closer';
  }

  /**
   * Safely mutates matcher state to skip ahead.
   *
   * TODO: Finish implementing forward helper
   *
   * @template {TokenMatcher.State} S
   * @param {string | RegExp} search
   * @param {S} state - Matcher state
   */
  static lookAhead(search, state) {
    return this.forward(search, state, null);
  }
  /**
   * Safely mutates matcher state to skip ahead.
   *
   * TODO: Finish implementing forward helper
   *
   * @template {TokenMatcher.State} S
   * @param {string | RegExp} search
   * @param {S} state - Matcher state
   * @param {number | boolean | null} [delta]
   */
  static forward(search, state, delta) {
    if (typeof search === 'string' && search.length) {
      if (delta === null)
        return (
          state.currentMatch.input.slice(
            state.currentMatch.index + state.currentMatch[0].length,
            state.currentMatch.index + state.currentMatch[0].length + search.length,
          ) === search
        );
      state.nextOffset =
        state.currentMatch.input.indexOf(search, state.currentMatch.index + state.currentMatch[0].length) +
        (0 + /** @type {number} */ (delta) || 0);
    } else if (search != null && typeof search === 'object') {
      search.lastIndex = state.currentMatch.index + state.currentMatch[0].length;
      const matched = search.exec(state.currentMatch.input);
      // console.log(...matched, {matched});
      if (!matched || matched[1] !== undefined) {
        if (delta === null) return false;
        state.nextOffset = search.lastIndex;
        state.nextFault = true;
        return 'fault';
      } else {
        if (delta === null) return true;
        state.nextOffset = search.lastIndex + (0 + /** @type {number} */ (delta) || 0);
      }
    } else {
      throw new TypeError(`forward invoked with an invalid search argument`);
    }
  }

  /**
   * @param {Matcher & {goal?: object}} matcher
   * @param {any} [options]
   */
  static createMode(matcher, options) {
    const tokenizer = (({constructor, ...tokenizerPropertyDescriptors}) =>
      Object.defineProperties({matcher: Object.freeze(TokenMatcher.create(matcher))}, tokenizerPropertyDescriptors))(
      Object.getOwnPropertyDescriptors(Tokenizer.prototype),
    );

    const mode = {syntax: 'matcher', tokenizer};
    options &&
      ({
        syntax: mode.syntax = mode.syntax,
        aliases: mode.aliases,
        preregister: mode.preregister,
        createToken: tokenizer.createToken = tokenizer.createToken,
        ...mode.overrides
      } = options);

    matcher.goal &&
      ({initializeState: tokenizer.initializeState, finalizeState: tokenizer.finalizeState} = matcher.goal);

    Object.freeze(tokenizer);

    return mode;
  }

  /**
   * @param {TokenMatcherPatternDefinitions} definitions
   * @param {MatcherFlags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(definitions, flags, properties) {
    if (typeof definitions === 'function') {
      return super.define(definitions, flags, properties);
    } else if (definitions != null) {
      return super.define(
        entity => TokenMatcher.join(...Object.keys(definitions).map(key => entity(definitions[key]()))),
        flags,
        properties,
      );
    }
    throw TypeError(`TokenMatcher.define invoked with incompatible definitions.`);
  }
}

/** @type {import('../experimental/common/types').Goal|symbol} */
TokenMatcher.prototype.goal = undefined;

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
 * @param {T} [state]
 */
TokenMatcher.openerEntity = (text, capture, match, state) => {
  match.upperCase = text.toUpperCase();
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuators != null && state.context.goal.punctuators[match.upperCase] === true
      ? (match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[match.upperCase]) || 'combinator')
      : TokenMatcher.canOpen(match.upperCase, state)
      ? TokenMatcher.open(match.upperCase, state) ||
        ((match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[match.upperCase]) ||
          state.context.goal.type),
        'opener')
      : // If it is passive sequence we keep only on character
        (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
        state.context.goal.type),
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
 * @param {T} [state]
 */
TokenMatcher.closerEntity = (text, capture, match, state) => {
  match.upperCase = text.toUpperCase();
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuators != null && state.context.goal.punctuators[text] === true
      ? (match.punctuator = 'combinator')
      : TokenMatcher.canClose(match.upperCase, state)
      ? TokenMatcher.close(match.upperCase, state) ||
        ((match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[text]) || state.context.goal.type),
        'closer')
      : state.context.goal.type,
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, punctuator?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.quoteEntity = (text, capture, match, state) => {
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuation[text] === 'quote' && TokenMatcher.canOpen(text, state)
      ? TokenMatcher.open(text, state) || 'opener'
      : state.context.goal.type === 'quote' && state.context.group.closer === text && TokenMatcher.canClose(text, state)
      ? TokenMatcher.close(text, state) || ((match.punctuator = state.context.goal.type || 'quote'), 'closer')
      : state.context.goal.type || 'quote',
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.whitespaceEntity = (text, capture, match, state) => {
  match.format = 'whitespace';
  TokenMatcher.capture(
    state.context.goal.type || state.lineOffset !== match.index
      ? ((match.flatten = state.context.goal.flatten !== false), 'whitespace')
      : ((match.flatten = false), 'inset'),
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.breakEntity = (text, capture, match, state) => {
  match.format = 'whitespace';
  TokenMatcher.capture(
    (state.context.group != null && state.context.group.closer === '\n' && TokenMatcher.close(text, state)) ||
      // NOTE: ‹break› takes precedence over ‹closer›
      (state.context.goal.punctuation != null && state.context.goal.punctuation['\n']) ||
      'break',
    match,
  );
  match.flatten = false;
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean, fault?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.fallthroughEntity = (text, capture, match, state) => {
  TokenMatcher.capture(
    state.context.group.fallthrough !== 'fault' &&
      state.context.goal.fallthrough !== 'fault' &&
      (state.context.goal.span == null || TokenMatcher.forward(state.context.goal.span, state) !== 'fault')
      ? ((match.flatten = true), state.context.goal.type || 'text')
      : 'fault',
    match,
  );
  // match.identity === 'fault' && (match.flatten = false);
};

/**
 * @template {TokenMatcherState} T
 * @param {TokenMatcherMatch} match
 * @param {T} state
 * @returns {TokenMatcherToken}
 */
TokenMatcher.createToken = (match, state) => {
  let currentGoal;
  // let goalName;
  let currentGoalType;
  let contextId;
  let contextNumber;
  let contextDepth;
  let contextGroup;
  let parentContext;
  /** @type {'lastTrivia'|'lastAtom'} */ let tokenReference;
  let tokenContext;
  let nextToken;
  let text;
  /** @type {string} */ let type;
  let fault;
  let punctuator;
  let offset;
  let lineInset;
  let lineBreaks;
  let isOperator;
  let isDelimiter;
  let isComment;
  let isWhitespace;
  let flatten;
  let fold;
  let columnNumber;
  let lineNumber;
  let tokenNumber;
  let captureNumber;
  let hint;

  const {
    context: currentContext,
    nextContext,
    lineIndex,
    lineOffset,
    nextOffset,
    nextFault,
    lastToken,
    lastTrivia,
    lastAtom,
  } = state;

  /* Capture */
  ({
    0: text,
    capture: {inset: lineInset},
    // @ts-ignore
    identity: type,
    flatten,
    fault,
    punctuator,
    index: offset,
  } = match);

  if (!text) return;

  ({
    id: contextId,
    number: contextNumber,
    depth: contextDepth,
    goal: currentGoal,
    group: contextGroup,
    parentContext,
  } = tokenContext = (type === 'opener' && nextContext) || currentContext);

  currentGoalType = currentGoal.type;

  if (nextOffset != null) {
    state.nextOffset = undefined;
    if (nextOffset > offset) {
      text = match.input.slice(offset, nextOffset);
      state.matcher.lastIndex = nextOffset;
    }
  } else if (nextFault != null) {
    state.nextFault = undefined;
    if (nextFault === true) {
      fault = true;
      flatten = false;
      type = 'fault';
      punctuator = undefined;
      // console.log({state: {...state}, match, nextFault});
    }
  }

  lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
  (isOperator = type === 'operator' || type === 'delimiter' || type === 'breaker' || type === 'combinator') ||
    (isDelimiter = type === 'closer' || type === 'opener') ||
    (isWhitespace = type === 'whitespace' || type === 'break' || type === 'inset');

  (isComment = type === 'comment' || punctuator === 'comment')
    ? (type = 'comment')
    : type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

  if (lineBreaks) {
    state.lineIndex += lineBreaks;
    state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
  }

  /* Flattening / Token Folding */

  flatten === false ||
    flatten === true ||
    (flatten = fault !== true && (isDelimiter !== true || currentGoal.fold === true) && currentGoal.flatten === true);

  captureNumber = ++tokenContext.captureCount;
  state.totalCaptureCount++;

  if (
    fault !== true && // type ! 'fault' &&
    (fold = flatten) && // fold only if flatten is allowed
    lastToken != null &&
    ((lastToken.contextNumber === contextNumber && lastToken.fold === true) ||
      (type === 'closer' && flatten === true)) && // never fold across contexts
    (lastToken.type === type ||
      (currentGoal.fold === true && (lastToken.type === currentGoalType || lastToken.punctuator === currentGoalType)))
  ) {
    lastToken.captureCount++;
    lastToken.text += text;
    lineBreaks && (lastToken.lineBreaks += lineBreaks);
  } else {
    // The generator retains this new as state.nextToken
    //   which means tokenContext is state.nextTokenContext
    //   and the fact that we are returning a token here will
    //   yield the current state.nextToken so we need to also
    //   set state.lastTokenContext to match
    //
    //   TODO: Add parity tests for tokenizer's token/context states
    state.lastTokenContext = state.nextTokenContext;
    state.nextTokenContext = tokenContext;

    /* Token Creation */
    flatten = false;
    columnNumber = 1 + (offset - lineOffset || 0);
    lineNumber = 1 + (lineIndex || 0);

    tokenNumber = ++tokenContext.tokenCount;
    state.totalTokenCount++;

    if (fault === true) tokenContext.faults++;

    // hint = `${(isDelimiter ? type : currentGoalType && `in-${currentGoalType}`) ||
    hint = `${
      currentGoalType
        ? isDelimiter && currentGoal.opener === text
          ? `${type}`
          : `in-${currentGoalType}`
        : isDelimiter
        ? type
        : ''
    }\n\n${contextId} #${tokenNumber}\n(${lineNumber}:${columnNumber})`;

    tokenReference = isWhitespace || isComment ? 'lastTrivia' : 'lastAtom';

    nextToken = tokenContext[tokenReference] = state[tokenReference] = tokenContext.lastToken = state.lastToken = {
      text,
      type,
      offset,
      punctuator,
      hint,
      lineOffset,
      lineBreaks,
      lineInset,
      columnNumber,
      lineNumber,
      captureNumber,
      captureCount: 1,
      tokenNumber,
      contextNumber,
      contextDepth,

      isWhitespace,
      isOperator,
      isDelimiter,
      isComment,

      // FIXME: Nondescript
      fault,
      fold,
      flatten,

      goal: currentGoal,
      group: contextGroup,
      state,
      context: tokenContext,
    };
  }
  /* Context */
  !nextContext ||
    ((state.nextContext = undefined), nextContext === currentContext) ||
    ((state.lastContext = currentContext),
    currentContext === nextContext.parentContext
      ? (state.totalContextCount++,
        (nextContext.precedingAtom = lastAtom),
        (nextContext.precedingTrivia = lastTrivia),
        (nextContext.precedingToken = lastToken))
      : ((parentContext.nestedContextCount += currentContext.nestedContextCount + currentContext.contextCount),
        (parentContext.nestedCaptureCount += currentContext.nestedCaptureCount + currentContext.captureCount),
        (parentContext.nestedTokenCount += currentContext.nestedTokenCount + currentContext.tokenCount)),
    (state.context = nextContext));

  return nextToken;
};

Object.freeze(TokenMatcher);

//@ts-check

const RegExpClass = /^(?:\[(?=.*(?:[^\\](?:\\\\)*|)\]$)|)((?:\\.|[^\\\n\[\]]*)*)\]?$/;

class RegExpRange extends RegExp {
  /**
   * @param {string|RegExp} source
   * @param {string} [flags]
   */
  constructor(source, flags) {
    /** @type {string} */
    let range;

    range = (source && typeof source === 'object' && source instanceof RegExp
      ? (flags === undefined && (flags = source.flags), source.source)
      : (typeof source === 'string' ? source : (source = `${source || ''}`)).trim() &&
        (source = RegExpClass[Symbol.replace](source, '[$1]'))
    ).slice(1, -1);

    if (!range || !RegExpClass.test(range)) {
      throw TypeError(`Invalid Regular Expression class range: ${range}`);
    }

    typeof flags === 'string' || (flags = `${flags || ''}` || '');

    flags.includes('u') ||
      //@ts-ignore
      !(source.includes('\\p{') || source.includes('\\u')) ||
      (flags += 'u');

    //@ts-ignore
    super(source, flags);

    // this.arguments = [...arguments];

    Object.defineProperty(this, 'range', {value: range, enumerable: true, writable: false});

    Object.freeze(this);
  }

  /** @type {string} */
  //@ts-ignore
  get range() {
    return `^`;
  }

  toString() {
    return this.range;
  }

  /**
   * @template T
   * @param {TemplateStringsArray} strings
   * @param {... T} values
   */
  static define(strings, ...values) {
    let source = String.raw(strings, ...values);
    let flags;
    // @ts-ignore
    return (
      RegExpRange.ranges[source] ||
      (RegExpRange.ranges[source] = (flags = Matcher.flags(
        ...values.map(value => (value instanceof RegExpRange ? value : undefined)),
      ))
        ? new (this || RegExpRange)(source, flags)
        : new (this || RegExpRange)(source))
    );
  }
}

/** @type {{[name: string]: RegExpRange}} */
RegExpRange.ranges = {};

globalThis.RegExpRange = RegExpRange;

// @ts-check

/**
 * @typedef {Readonly<{symbol: symbol, description: string}>} Definition
 * @extends {Map<string|symbol, Definition>}
 */
class SymbolMap extends Map {
  /**
   * @param {*} description
   * @param {symbol} [symbol]
   * @returns {symbol}
   */
  define(description, symbol) {
    /** @type {Definition} */ let definition;

    description = ((arguments.length > 0 && typeof description !== 'symbol') || undefined) && String(description);

    if (description === undefined) {
      throw new TypeError(
        `Symbols.define invoked with a description (${
          description != null ? typeof arguments[0] : arguments[0]
        }) that is not non-coercible to a valid key.`,
      );
    }

    definition = super.get(description);

    if (symbol != null) {
      if (typeof symbol !== 'symbol') {
        throw new TypeError(
          `Symbols.define invoked with an invalid symbol (${symbol == null ? arguments[1] : typeof arguments[1]}).`,
        );
      }

      if (!definition) {
        definition = super.get(symbol);
      } else if (definition.symbol !== symbol) {
        throw new ReferenceError('Symbols.define invoked with a description argument that is not unique.');
      }

      if (definition && definition.description !== description) {
        throw new ReferenceError('Symbols.define invoked with a symbol argument that is not unique.');
      }
    }

    if (!definition) {
      definition = Object.freeze({symbol: symbol || Symbol(description), description: description});
      super.set(definition.symbol, definition);
      super.set(definition.description, definition);
    }

    return definition.symbol;
  }

  /** @param {symbol | string} key @returns {string} */
  describe(key) {
    return (super.get(key) || SymbolMap.undefined).description;
  }
}

Object.defineProperty(SymbolMap, 'undefined', {value: Object.freeze(Object.create(null)), writable: false});

Object.defineProperties(
  Object.setPrototypeOf(
    SymbolMap.prototype,
    Object.create(Object.prototype, {
      get: Object.getOwnPropertyDescriptor(Map.prototype, 'get'),
      has: Object.getOwnPropertyDescriptor(Map.prototype, 'has'),
      set: Object.getOwnPropertyDescriptor(Map.prototype, 'set'),
    }),
  ),
  {get: {writable: false}, set: {writable: false}},
);

//@ts-check

/** @param {State} state */
// TODO: Document initializeState
const initializeState = state => {
  /** @type {Groups} state */
  (state.groups = []).closers = [];
  state.lineOffset = state.lineIndex = 0;
  state.totalCaptureCount = state.totalTokenCount = 0;

  /** @type {Contexts} */
  const contexts = (state.contexts = Array(100));
  const context = initializeContext({
    id: `«${state.matcher.goal.name}»`,
    number: (contexts.count = state.totalContextCount = 1),
    depth: 0,
    faults: 0,
    parentContext: undefined,
    goal: state.matcher.goal,
    // @ts-ignore
    group: (state.groups.root = Object.freeze({})),
    //@ts-ignore
    state,
    ...(state.USE_CONSTRUCTS === true ? {currentConstruct: new Construct()} : {}),
  });
  state.firstTokenContext = state.nextTokenContext = state.lastContext = state.context = contexts[-1] = context;
  state.lastTokenContext = undefined;
  state.initializeContext = initializeContext;
};

/** @param {State} state */
// TODO: Document finalizeState
const finalizeState = state => {
  const isValidState =
    state.firstTokenContext === state.nextTokenContext &&
    state.nextToken === undefined &&
    state.nextOffset === undefined;

  const {
    flags: {debug = false} = {},
    options: {console: {log = console.log, warn = console.warn} = console} = {},
    error = (state.error = !isValidState ? 'Unexpected end of tokenizer state' : undefined),
  } = state;

  // if (!debug && error) throw Error(error);

  // Finalize latent token artifacts
  state.nextTokenContext = void (state.lastTokenContext = state.nextTokenContext);

  // Finalize tokenization artifacts
  error || (state.context = state.contexts = state.groups = undefined);

  // Output to console when necessary
  debug && (error ? warn : log)(`[tokenizer]: ${error || 'done'} — %O`, state);
};

const initializeContext = (assign =>
  /**
   * @template {Partial<Context>} T
   * @template {{}} U
   * @param {T | Context} context
   * @param {U} [properties]
   * @returns {Context & T & U}
   */
  (context, properties) => {
    //@ts-ignore
    return (
      assign(context, stats, properties),
      context.goal &&
        context.goal.initializeContext &&
        //@ts-ignore
        context.goal.initializeContext(context),
      context
    );
  })(Object.assign);

const symbolMap = new SymbolMap();

/** @type {SymbolMap['define']} */
const defineSymbol = (description, symbol) => symbolMap.define(description, symbol);

/** @type {SymbolMap['describe']} */
const describeSymbol = symbol => symbolMap.describe(symbol);

const generateDefinitions = ({groups = {}, goals = {}, identities = {}, symbols = {}, tokens = {}}) => {
  const seen = new WeakSet();

  for (const symbol of Object.getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    if (!goal || typeof goal != 'object') throw TypeError('generateDefinitions invoked with an invalid goal type');

    if (seen.has(goal)) throw TypeError('generateDefinitions invoked with a redundant goal entry');

    seen.add(goal);

    if (!goal || typeof goal != 'object' || (goal.symbol != null && goal.symbol !== symbol))
      throw Error('generateDefinitions invoked with goal-symbol mismatch');

    if (generateDefinitions.NullGoal == null) throw Error('generateDefinitions invoked with the NullGoal goal');

    if (generateDefinitions.FaultGoal == null) throw Error('generateDefinitions invoked with the FaultGoal goal');
  }

  const FaultGoal = generateDefinitions.FaultGoal;

  const punctuators = Object.create(null);

  for (const opener of Object.getOwnPropertyNames(groups)) {
    // @ts-ignore
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    Object.freeze(group);
  }

  for (const symbol of Object.getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    goal.symbol === symbol || (goal.symbol = symbol);
    goal.name = describeSymbol(symbol).replace(/Goal$/, '');
    symbols[`${goal.name}Goal`] = goal.symbol;
    goal[Symbol.toStringTag] = `«${goal.name}»`;
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.punctuators) {
      for (const punctuator of (goal.punctuators = [...goal.punctuators]))
        punctuators[punctuator] = !(goal.punctuators[punctuator] = true);
      Object.freeze(Object.setPrototypeOf(goal.punctuators, punctuators));
    } else {
      goal.punctuators = punctuators;
    }

    if (goal.closers) {
      for (const closer of (goal.closers = [...goal.closers])) punctuators[closer] = !(goal.closers[closer] = true);
      Object.freeze(Object.setPrototypeOf(goal.closers, punctuators));
    } else {
      goal.closers = generateDefinitions.Empty;
    }

    if (goal.openers) {
      const overrides = {...goal.openers};
      for (const opener of (goal.openers = [...goal.openers])) {
        const group = (goal.groups[opener] = {...groups[opener], ...overrides[opener]});
        typeof group.goal === 'symbol' && (group.goal = goals[group.goal] || FaultGoal);
        typeof group.parentGoal === 'symbol' && (group.parentGoal = goals[group.goal] || FaultGoal);
        punctuators[opener] = !(goal.openers[opener] = true);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
        group.description || (group.description = `${group.opener}…${group.closer}`);
        group[Symbol.toStringTag] = `‹${group.opener}›`;
      }
      Object.freeze(Object.setPrototypeOf(goal.openers, punctuators));
    } else {
      goal.closers = generateDefinitions.Empty;
    }

    // if (goal.punctuation)
    Object.freeze(Object.setPrototypeOf((goal.punctuation = {...goal.punctuation}), null));

    Object.freeze(goal.groups);
    Object.freeze(goal.tokens);
    Object.freeze(goal);
  }

  Object.freeze(punctuators);
  Object.freeze(goals);
  Object.freeze(groups);
  Object.freeze(identities);
  Object.freeze(symbols);

  return Object.freeze({groups, goals, identities, symbols, tokens});

  // if (keywords) {
  //   for (const [identity, list] of entries({})) {
  //     for (const keyword of list.split(/\s+/)) {
  //       keywords[keyword] = identity;
  //     }
  //   }

  //   keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  //   freeze(keywords);
  // }

  /**
   * Creates a symbolically mapped goal-specific token record
   *
   * @template {{}} T
   * @param {Goal} goal
   * @param {string} text
   * @param {string} type
   * @param {T} properties
   */
  function GoalSpecificTokenRecord(goal, text, type, properties) {
    const symbol = defineSymbol(`‹${goal.name} ${text}›`);
    return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
  }
};

generateDefinitions.Empty = Object.freeze({[Symbol.iterator]: (iterator => iterator).bind([][Symbol.iterator])});

const NullGoal = Object.freeze(
  (generateDefinitions.NullGoal = {type: undefined, flatten: undefined, fold: undefined}),
);

const FaultGoal = (generateDefinitions.FaultGoal = {symbol: defineSymbol('FaultGoal'), type: 'fault'});
generateDefinitions({goals: {[FaultGoal.symbol]: FaultGoal}});

Object.freeze(generateDefinitions);

/** @typedef {Record<string, string[]>} Keywords.Mappings */
/** @template {Keywords.Mappings} T @typedef {keyof T} Keywords.Mappings.Identities  */
/** @template {Keywords.Mappings} T @typedef {T[keyof T][number]} Keywords.Mappings.Keywords */
/** @template {Keywords.Mappings} T @typedef {Record<Keywords.Mappings.Keywords<T>, Keywords.Mappings.Identities<T>>} Keywords.Records.Keywords */
/** @template {Keywords.Mappings} T @typedef {Record<Keywords.Mappings.Identities<T>, ReadonlyArray<Keywords.Mappings.Keywords<T>>>} Keywords.Records.Identities */
/** @template {Keywords.Mappings} T @typedef {Iterable<Keywords.Mappings.Keywords<T>> & Readonly<Keywords.Records.Keywords<T>> & Readonly<Keywords.Records.Identities<T>>} Keywords.Records */

/** @template {Keywords.Mappings} T @param {T} mappings@returns {Keywords.Records<T>} */
const Keywords = mappings => {
  const identities = /** @type {any} */ ({});
  const keywords = /** @type {any} */ ({...Keywords.prototype});

  for (const identity in mappings) {
    identities[identity] = Object.freeze([...mappings[identity]]);
    for (const keyword of mappings[identity]) {
      keywords[keyword] = identity;
    }
  }

  return Object.freeze(Object.setPrototypeOf(keywords, Object.freeze(identities)));
};

Keywords.prototype = {
  [Symbol.iterator]() {
    return Object.getOwnPropertyNames(this)[Symbol.iterator]();
  },
};

/** @type {(keywords: string) => string[]} */
Keywords.split = RegExp.prototype[Symbol.split].bind(/\W+/gu);

const Construct = class Construct extends Array {
  constructor() {
    super(...arguments);
    this.text = arguments.length ? this.join(' ') : '';
    this.last = arguments.length ? this[this.length - 1] : '';
  }

  add(text) {
    this.length === 0 ? (this.text = text) : (this.text += ` ${text}`);
    super.push((this.last = text));
  }
  set(text) {
    this.previousText = this.text;
    text === '' || text == null
      ? ((this.last = this.text = ''), this.length === 0 || super.splice(0, this.length))
      : this.length === 0
      ? super.push((this.last = this.text = text))
      : super.splice(0, this.length, (this.last = this.text = text));
  }
  clone() {
    const clone = new Construct(...this);
    clone.text = this.text;
    clone.last = this.last;
    return clone;
  }
};

/**
 * @template {string} K
 * @param {RegExpRange.Factories<K>} factories
 */
const Ranges = factories => {
  /** @type {PropertyDescriptorMap} */
  const descriptors = {
    ranges: {
      get() {
        return ranges;
      },
      enumerable: true,
      configurable: false,
    },
  };

  // TODO: Revisit once unicode classes are stable
  const safeRange = (strings, ...values) => {
    try {
      return RegExpRange.define(strings, ...values);
    } catch (exception) {}
  };

  for (const property in factories) {
    descriptors[property] = {
      get() {
        const value = factories[property](safeRange, ranges);
        if (value === undefined) throw new RangeError(`Failed to define: ${factories[property]}`);
        Object.defineProperty(ranges, property, {value, enumerable: true, configurable: false});
        return value;
      },
      enumerable: true,
      configurable: true,
    };
  }

  /** @type {{ranges: typeof ranges} & Record<K, RegExpRange>} */
  const ranges = Object.create(null, descriptors);

  return ranges;
};

/** @typedef {typeof stats} ContextStats */
const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  nestedCaptureCount: 0,
  nestedContextCount: 0,
  nestedTokenCount: 0,
};

/// Ambient

/** @typedef {import('./types').Match} Match */
/** @typedef {import('./types').Groups} Groups */
/** @typedef {import('./types').Group} Group */
/** @typedef {import('./types').Goal} Goal */
/** @typedef {import('./types').Context} Context */
/** @typedef {import('./types').Contexts} Contexts */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Token} Token */

//@ts-check

const {
  ECMAScriptGoal,
  ECMAScriptCommentGoal,
  ECMAScriptRegExpGoal,
  ECMAScriptRegExpClassGoal,
  ECMAScriptStringGoal,
  ECMAScriptTemplateLiteralGoal,
  ECMAScriptDefinitions,
} = (() => {
  // Avoids TypeScript "always …" style errors
  const DEBUG_CONSTRUCTS = Boolean(false);

  const identities = {
    UnicodeIDStart: 'ECMAScript.UnicodeIDStart',
    UnicodeIDContinue: 'ECMAScript.UnicodeIDContinue',
    HexDigits: 'ECMAScript.HexDigits',
    CodePoint: 'ECMAScript.CodePoint',
    ControlEscape: 'ECMAScript.ControlEscape',
    ContextualWord: 'ECMAScript.ContextualWord',
    RestrictedWord: 'ECMAScript.RestrictedWord',
    FutureReservedWord: 'ECMAScript.FutureReservedWord',
    MetaProperty: 'ECMAScript.MetaProperty',
    Keyword: 'ECMAScript.Keyword',
  };

  const goals = {};
  const symbols = {};

  const ECMAScriptGoal = (goals[(symbols.ECMAScriptGoal = defineSymbol('ECMAScriptGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    // TODO: Properly fault on invalid closer
    closers: ['}', ')', ']'],
    keywords: Keywords({
      // TODO: Let's make those constructs (this.new.target borks)
      [identities.MetaProperty]: ['new.target', 'import.meta'],
      [identities.Keyword]: /** @type {Array<'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'>} */ (Keywords.split(
        'await|break|case|catch|class|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|in|instanceof|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield',
      )),
      [identities.RestrictedWord]: ['interface', 'implements', 'package', 'private', 'protected', 'public'],
      [identities.FutureReservedWord]: ['enum'],
      // NOTE: This is purposely not aligned with the spec
      [identities.ContextualWord]: ['arguments', 'async', 'as', 'from', 'of', 'static', 'get', 'set'],
    }),

    punctuation: {
      '=>': 'combinator',
      '?': 'delimiter',
      ':': 'delimiter',
      ',': 'delimiter',
      ';': 'breaker',
      '"': 'quote',
      "'": 'quote',
      '`': 'quote',
    },

    fallthrough: 'fault',

    ranges: Ranges({
      NullCharacter: range => range`\0`,
      BinaryDigit: range => range`01`,
      DecimalDigit: range => range`0-9`,
      ControlLetter: range => range`A-Za-z`,
      HexLetter: range => range`A-Fa-f`,
      HexDigit: (range, {DecimalDigit, HexLetter}) => range`${DecimalDigit}${HexLetter}`,
      GraveAccent: range => range`${'`'}`,
      ZeroWidthNonJoiner: range => range`\u200c`,
      ZeroWidthJoiner: range => range`\u200d`,
      ZeroWidthNoBreakSpace: range => range`\ufeff`,
      CombiningGraphemeJoiner: range => range`\u034f`,
      Whitespace: (range, {ZeroWidthNoBreakSpace}) => range`\s${ZeroWidthNoBreakSpace}`,
      IdentifierStart: (range, {UnicodeIDStart}) => range`_$${UnicodeIDStart}`,
      IdentifierPart: (range, {UnicodeIDContinue, ZeroWidthNonJoiner, ZeroWidthJoiner, CombiningGraphemeJoiner}) =>
        range`$${UnicodeIDContinue}${ZeroWidthNonJoiner}${ZeroWidthJoiner}${CombiningGraphemeJoiner}`,
      UnicodeIDStart: range =>
        range`\p{ID_Start}` ||
        range`A-Za-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e-\u066f\u0671-\u06d3\u06d5\u06e5-\u06e6\u06ee-\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4-\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc-\u09dd\u09df-\u09e1\u09f0-\u09f1\u09fc\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0-\u0ae1\u0af9\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60-\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0-\u0ce1\u0cf1-\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32-\u0e33\u0e40-\u0e46\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065-\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae-\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5-\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a-\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd-\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5-\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
      UnicodeIDContinue: range =>
        range`\p{ID_Continue}` ||
        range`0-9A-Z_a-z\xaa\xb5\xb7\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u05d0-\u05ea\u05ef-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u07fd\u0800-\u082d\u0840-\u085b\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u08d3-\u08e1\u08e3-\u0963\u0966-\u096f\u0971-\u0983\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7-\u09c8\u09cb-\u09ce\u09d7\u09dc-\u09dd\u09df-\u09e3\u09e6-\u09f1\u09fc\u09fe\u0a01-\u0a03\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0af9-\u0aff\u0b01-\u0b03\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b56-\u0b57\u0b5c-\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82-\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c00-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c58-\u0c5a\u0c60-\u0c63\u0c66-\u0c6f\u0c80-\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1-\u0cf2\u0d00-\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d54-\u0d57\u0d5f-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82-\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2-\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18-\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1369-\u1371\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772-\u1773\u1780-\u17d3\u17d7\u17dc-\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1878\u1880-\u18aa\u18b0-\u18f5\u1900-\u191e\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19da\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1ab0-\u1abd\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1cd0-\u1cd2\u1cd4-\u1cfa\u1d00-\u1df9\u1dfb-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u203f-\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua827\ua840-\ua873\ua880-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua8fd-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\ua9e0-\ua9fe\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabea\uabec-\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe2f\ufe33-\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
    }),

    initializeState: state => {
      state.USE_CONSTRUCTS = state && state.options && state.options.mode ? state.options.mode.USE_CONSTRUCTS : true;
      initializeState(state);
    },

    finalizeState: state => {
      finalizeState(state);
    },
  });

  const ECMAScriptCommentGoal = (goals[(symbols.ECMAScriptCommentGoal = defineSymbol('ECMAScriptCommentGoal'))] = {
    type: 'comment',
    flatten: true,
    fold: true,
    spans: {
      // SINLE-LINE COMMENT
      //
      //    This faults when match[1] === ''
      //    It forwards until ‹\n›
      '//': /.*?(?=\n|($))/g,
      //
      //    Alternative: '\n' ie indexOf(…, lastIndex)
      //
      // MULTI-LINE COMMENT
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹*/›
      '/*': /[^]*?(?=\*\/|($))/g,
      //
      //   Alternative: '*/' ie indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptRegExpGoal = (goals[(symbols.ECMAScriptRegExpGoal = defineSymbol('ECMAScriptRegExpGoal'))] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['(', '{', '['],
    closers: [],
    opener: '/',
    closer: '/',
    punctuators: ['+', '*', '?', '|', '^', '.', '?=', '?:', '?!'],
    punctuation: {
      '[': 'combinator',
      ']': 'combinator',
      '(': 'combinator',
      ')': 'combinator',
      '{': 'combinator',
      '}': 'combinator',
      '\n': 'fault',
    },
    spans: {
      // This faults when match[1] === ''
      //   It forwards thru ‹•\d•,•}› ‹•,•\d•}› or ‹•\d•}› only
      '{': /\s*(?:\d+\s*,\s*\d+|\d+\s*,|\d+|,\s*\d+)\s*}|()/g,
    },
  });

  const ECMAScriptRegExpClassGoal = (goals[
    (symbols.ECMAScriptRegExpClassGoal = defineSymbol('ECMAScriptRegExpClassGoal'))
  ] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: [],
    closers: [']'],
    opener: '[',
    closer: ']',
    punctuators: ['\\', '^', '-'],
    punctuation: {
      '[': 'pattern',
      ']': 'combinator',
      '(': 'pattern',
      ')': 'pattern',
      '{': 'pattern',
      '}': 'pattern',
      '\n': 'fault',
    },
  });

  ECMAScriptRegExpGoal.openers['['] = {
    goal: symbols.ECMAScriptRegExpClassGoal,
    parentGoal: symbols.ECMAScriptRegExpGoal,
  };

  const ECMAScriptStringGoal = (goals[(symbols.ECMAScriptStringGoal = defineSymbol('ECMAScriptStringGoal'))] = {
    type: 'quote',
    flatten: true,
    fold: true,
    spans: {
      // SINGLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹'›
      "'": /(?:[^'\\\n]+?(?=\\[^]|')|\\[^])*?(?='|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
      //
      // DOUBLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹"›
      '"': /(?:[^"\\\n]+?(?=\\[^]|")|\\[^])*?(?="|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptTemplateLiteralGoal = (goals[
    (symbols.ECMAScriptTemplateLiteralGoal = defineSymbol('ECMAScriptTemplateLiteralGoal'))
  ] = {
    type: 'quote',
    flatten: true,
    fold: true,
    openers: ['${'],
    opener: '`',
    closer: '`',
    punctuation: {
      '${': 'opener',
    },
    spans: {
      // GRAVE/BACKTIC QUOTE
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹\n› ‹`› or ‹${›
      '`': /(?:[^`$\\\n]+?(?=\n|\\.|`|\$\{)|\\.)*?(?=\n|`|\$\{|($))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
  });

  {
    const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
    const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
    const constructiveKeywords = new Set(
      'await async function class await delete typeof void yield this new'.split(' '),
    );

    /**
     * Determines if the capture is a valid keyword, identifier or undefined
     * based on matcher state (ie lastAtom, context, intent) and subset
     * of ECMAScript keyword rules of significant.
     *
     * TODO: Refactor or extensively test captureKeyword
     * TODO: Document subset of ECMAScript keyword rules of significant
     *
     * @param {string} text - Matched by /\b(‹text›)\b(?=[^\s$_:]|\s+[^:]|$)
     * @param {State} state
     * @param {string} [intent]
     */
    const captureKeyword = (text, {lastAtom: pre, lineIndex, context}, intent) => {
      //                              (a) WILL BE ‹fault› UNLESS  …
      switch (intent || (intent = context.intent)) {
        //  DESTRUCTURING INTENT  (ie Variable/Class/Function declarations)
        case 'destructuring':
        //  DECLARATION INTENT  (ie Variable/Class/Function declarations)
        case 'declaration':
          return (
            //                        (b)   WILL BE ‹idenfitier›
            //                              AFTER ‹.›  (as ‹operator›)
            (pre !== undefined && pre.text === '.' && 'identifier') ||
            //                        (c)   WILL BE ‹keyword›
            //                              IF DECLARATIVE AND …
            (declarativeKeywords.has(text) &&
              //                      (c1)  NOT AFTER ‹keyword› …
              (pre === undefined ||
                pre.type !== 'keyword' ||
                //                          UNLESS IS DIFFERENT
                (pre.text !== text &&
                  //                        AND NOT ‹export› NOR ‹import›
                  !(text === 'export' || text === 'import') &&
                  //                  (c2)  FOLLOWS ‹export› OR ‹default›
                  (pre.text === 'export' ||
                    pre.text === 'default' ||
                    //                (c3)  IS ‹function› AFTER ‹async›
                    (pre.text === 'async' && text === 'function')))) &&
              'keyword')
          );
        default:
          return (
            //                        (b)   WILL BE ‹idenfitier› …
            (((pre !== undefined &&
              //                      (b1)  AFTER ‹.›  (as ‹operator›)
              pre.text === '.') ||
              //                      (b2)  OR ‹await› (not as ‹keyword›)
              (text === 'await' && context.awaits === false) ||
              //                      (b3)  OR ‹yield› (not as ‹keyword›)
              (text === 'yield' && context.yields === false)) &&
              'identifier') ||
            //                        (c)   WILL BE ‹keyword› …
            ((pre === undefined ||
              //                      (c1)  NOT AFTER ‹keyword›
              pre.type !== 'keyword' ||
              //                      (c2)  UNLESS OPERATIVE
              operativeKeywords.has(pre.text) ||
              //                      (c3)  OR ‹if› AFTER ‹else›
              (text === 'if' && pre.text === 'else') ||
              //                      (c4)  OR ‹default› AFTER ‹export›
              (text === 'default' && pre.text === 'export') ||
              //                      (c5)  NOT AFTER ‹async›
              //                            EXCEPT ‹function›
              ((pre.text !== 'async' || text === 'function') &&
                //                    (c6)  AND NOT AFTER ‹class›
                //                          EXCEPT ‹extends›
                (pre.text !== 'class' || text === 'extends') &&
                //                    (c7)  AND NOT AFTER ‹for›
                //                          EXCEPT ‹await› (as ‹keyword›)
                (pre.text !== 'for' || text === 'await') &&
                //                    (c6)  NOT AFTER ‹return›
                //                          AND IS DIFFERENT
                //                          AND IS NOT ‹return›
                (pre.text !== 'return'
                  ? pre.text !== text
                  : text !== 'return'
                  ? //                (c7)  OR AFTER ‹return›
                    //                      AND IS CONSTRUCTIVE
                    constructiveKeywords.has(text)
                  : //                (c8)  OR AFTER ‹return›
                    //                      AND IS ‹return›
                    //                      WHEN ON NEXT LINE
                    pre.lineNumber < 1 + lineIndex))) &&
              'keyword')
          );
      }
    };

    const EmptyConstruct = Object.freeze(new Construct());
    const initializeContext = context => {
      if (context.state['USE_CONSTRUCTS'] !== true) return;
      context.parentContext == null || context.parentContext.currentConstruct == null
        ? (context.currentConstruct == null && (context.currentConstruct = EmptyConstruct),
          (context.parentConstruct = context.openingConstruct = EmptyConstruct))
        : (context.currentConstruct == null && (context.currentConstruct = new Construct()),
          (context.parentConstruct = context.parentContext.currentConstruct),
          context.parentContext.goal === ECMAScriptGoal && context.parentConstruct.add(context.group.description),
          (context.openingConstruct = context.parentConstruct.clone()),
          DEBUG_CONSTRUCTS === true && console.log(context));
    };

    goals[symbols.ECMAScriptRegExpGoal].initializeContext = goals[
      symbols.ECMAScriptStringGoal
    ].initializeContext = goals[symbols.ECMAScriptTemplateLiteralGoal].initializeContext = initializeContext;

    /** @param {Context} context */
    goals[symbols.ECMAScriptGoal].initializeContext = context => {
      context.captureKeyword = captureKeyword;
      context.state['USE_CONSTRUCTS'] === true && initializeContext(context);
    };
  }

  return {
    ECMAScriptGoal,
    ECMAScriptCommentGoal,
    ECMAScriptRegExpGoal,
    ECMAScriptRegExpClassGoal,
    ECMAScriptStringGoal,
    ECMAScriptTemplateLiteralGoal,
    ECMAScriptDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}'},
        ['(']: {opener: '(', closer: ')'},
        ['[']: {opener: '[', closer: ']'},
        ['//']: {
          opener: '//',
          closer: '\n',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/*']: {
          opener: '/*',
          closer: '*/',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/']: {
          opener: '/',
          closer: '/',
          goal: symbols.ECMAScriptRegExpGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹pattern›',
        },
        ["'"]: {
          opener: "'",
          closer: "'",
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['"']: {
          opener: '"',
          closer: '"',
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['`']: {
          opener: '`',
          closer: '`',
          goal: symbols.ECMAScriptTemplateLiteralGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹template›',
        },
        ['${']: {
          opener: '${',
          closer: '}',
          goal: symbols.ECMAScriptGoal,
          parentGoal: symbols.ECMAScriptTemplateLiteralGoal,
          description: '‹span›',
        },
      },
    }),
  };
})();

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/** @type {TokenMatcher} */
const matcher = TokenMatcher.define(
  {
    Break: () =>
      TokenMatcher.define(entity => TokenMatcher.sequence/* regexp */ `(\r?\n${entity(TokenMatcher.breakEntity)})`),

    Whitespace: () =>
      TokenMatcher.define(entity => TokenMatcher.sequence/* regexp */ `(\s+${entity(TokenMatcher.whitespaceEntity)})`),

    Escape: ({
      fromUnicodeEscape = (fromCodePoint => text => fromCodePoint(parseInt(text.slice(2), 16)))(String.fromCodePoint),
    } = {}) =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          \\u[${ECMAScriptGoal.ranges.HexDigit}][${ECMAScriptGoal.ranges.HexDigit}][${
          ECMAScriptGoal.ranges.HexDigit
        }][${ECMAScriptGoal.ranges.HexDigit}]
          ${entity((text, entity, match, state) => {
            match.format = 'escape';
            TokenMatcher.capture(
              state.context.goal !== ECMAScriptGoal
                ? state.context.goal.type || 'escape'
                : (
                    state.lastToken === null || state.lastToken.type !== 'identifier'
                      ? ECMAScriptGoal.ranges.IdentifierStart.test(fromUnicodeEscape(text))
                      : ECMAScriptGoal.ranges.IdentifierPart.test(fromUnicodeEscape(text))
                  )
                ? ((match.flatten = true), 'identifier')
                : 'fault',
              match,
            );
          })}
        )|(
          \\f|\\n|\\r|\\t|\\v|\\c[${ECMAScriptGoal.ranges.ControlLetter}]
          |\\x[${ECMAScriptGoal.ranges.HexDigit}][${ECMAScriptGoal.ranges.HexDigit}]
          |\\u\{[${ECMAScriptGoal.ranges.HexDigit}]*\}
          |\\[^]
          ${entity((text, entity, match, state) => {
            TokenMatcher.capture(state.context.goal.type || 'escape', match);
            match.capture[ECMAScriptGoal.keywords[text]] = text;
          })}
        )`,
      ),

    Comment: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          //|/\*|\*/
          ${entity((text, entity, match, state) => {
            match.format = 'punctuator';
            TokenMatcher.capture(
              TokenMatcher.punctuate(text, state) ||
                (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                (((match.punctuator = state.context.goal.punctuation && state.context.goal.punctuation[text]) ||
                  (state.context.goal.punctuators && state.context.goal.punctuators[text] === true)) &&
                  'punctuator') ||
                  state.context.goal.type ||
                  'sequence'),
              match,
            );
          })}
        )`,
      ),

    StringLiteral: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `("|'|${'`'}${entity(TokenMatcher.quoteEntity)})`,
      ),

    Opener: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(\$\{|\{|\(|\[${entity(TokenMatcher.openerEntity)})`,
      ),

    Closer: () =>
      TokenMatcher.define(entity => TokenMatcher.sequence/* regexp */ `(\}|\)|\]${entity(TokenMatcher.closerEntity)})`),

    Solidus: () =>
      // TODO: Refine the necessary criteria for RegExp vs Div
      // TEST: [eval('var g;class x {}/1/g'), eval('var g=class x {}/1/g')]
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          \/=|\/
          ${entity((text, entity, match, state) => {
            match.format = 'punctuator';
            TokenMatcher.capture(
              state.context.goal === ECMAScriptRegExpGoal
                ? (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                  (match.punctuator = state.context.goal.type || 'sequence'),
                  state.context.group.closer !== ']'
                    ? TokenMatcher.close(text, state) /* fault? */ || 'closer'
                    : match.punctuator)
                : state.context.goal !== ECMAScriptGoal
                ? state.context.goal.type || 'sequence'
                : state.lastAtom === undefined ||
                  state.lastAtom.type === 'delimiter' ||
                  state.lastAtom.type === 'breaker' ||
                  state.lastAtom.text === '=>' ||
                  (state.lastAtom.type === 'operator'
                    ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                    : state.lastAtom.type === 'closer'
                    ? state.lastAtom.text === '}'
                    : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
                ? TokenMatcher.open(text, state) ||
                  ((match.punctuator =
                    (state.nextContext.goal.punctuation && state.nextContext.goal.punctuation[text]) ||
                    state.nextContext.goal.type ||
                    'pattern'),
                  'opener')
                : (match.punctuator = 'operator'),
              match,
            );
          })}
        )`,
      ),

    Operator: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          ,|;|\.\.\.|\.|:|\?${
            // We're including non-conflicting RegExp atoms here
            '[:=!]?'
          }
          |\+\+|--|=>
          |\+=|-=|\*\*=|\*=
          |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
          |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
          |!==|!=|!|===|==|=
          |\+|-|\*\*|\*
          ${entity((text, entity, match, state) => {
            match.format = 'punctuator';
            TokenMatcher.capture(
              state.context.goal === ECMAScriptGoal
                ? (text === '*' && state.lastAtom && state.lastAtom.text === 'function' && 'keyword') ||
                    ECMAScriptGoal.punctuation[text] ||
                    'operator'
                : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
                ? (match.punctuator =
                    (state.context.goal.punctuation && state.context.goal.punctuation[text]) || 'punctuation')
                : (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                  state.context.goal.type || 'sequence'),
              match,
            );
          })}
        )`,
      ),

    Keyword: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `\b(
          ${TokenMatcher.join(...ECMAScriptGoal.keywords).replace(/\./g, '\\.')}
          ${entity((text, entity, match, state) => {
            match.format = 'identifier';
            TokenMatcher.capture(
              (match.flatten = state.context.goal !== ECMAScriptGoal)
                ? state.context.goal.type || 'sequence'
                : state.lastAtom != null && state.lastAtom.text === '.'
                ? 'identifier'
                : state.context.captureKeyword === undefined
                ? 'keyword'
                : state.context.captureKeyword(text, state) || 'fault',
              match,
            );
          })}
        )\b(?=[^\s$_:]|\s+[^:]|$)`,
      ),

    Number: ({
      //@ts-ignore
      NumericSeparator,
      Digits = NumericSeparator
        ? Digit => TokenMatcher.sequence/* regexp */ `[${Digit}][${Digit}${TokenMatcher.escape(NumericSeparator)}]*`
        : Digit => TokenMatcher.sequence/* regexp */ `[${Digit}]+`,
      DecimalDigits = Digits(ECMAScriptGoal.ranges.DecimalDigit),
      HexDigits = Digits(ECMAScriptGoal.ranges.HexDigit),
      BinaryDigits = Digits(ECMAScriptGoal.ranges.BinaryDigit),
    } = {}) =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `\b(
          ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
          |\.${DecimalDigits}[eE]${DecimalDigits}
          |0[xX]${HexDigits}
          |0[bB]${BinaryDigits}
          |${DecimalDigits}\.${DecimalDigits}
          |\.${DecimalDigits}
          |${DecimalDigits}
          ${entity((text, entity, match, state) => {
            match.format = 'number';
            TokenMatcher.capture(state.context.goal.type || 'number', match); // , text
          })}
        )\b`,
      ),

    Identifier: ({
      RegExpFlags = new RegExp(
        /\w/g[Symbol.replace](
          /*regexp*/ `^(?:g|i|m|s|u|y)+$`,
          /*regexp*/ `$&(?=[^$&]*$)`, // interleaved
        ),
      ),
    } = {}) =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          [${ECMAScriptGoal.ranges.IdentifierStart}][${ECMAScriptGoal.ranges.IdentifierPart}]*
          ${entity((text, entity, match, state) => {
            match.format = 'identifier';
            TokenMatcher.capture(
              state.context.goal !== ECMAScriptGoal
                ? (([text] = text.split(/\b/, 2)),
                  (state.nextOffset = match.index + text.length),
                  (match[0] = text),
                  // identity
                  state.context.goal.type || 'sequence')
                : state.lastToken != null && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
                ? ((match.flatten = true), (match.punctuator = ECMAScriptRegExpGoal.type), 'closer')
                : ((match.flatten = true), 'identifier'),
              match,
            );
          })}
        )`,
        `${ECMAScriptGoal.ranges.IdentifierStart}${ECMAScriptGoal.ranges.IdentifierPart}`.includes('\\p{') ? 'u' : '',
      ),

    Fallthrough: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          .
          ${entity(TokenMatcher.fallthroughEntity)}
        )`,
      ),
  },
  // RegExp flags for this matcher instance
  'gu',
  // Property descriptors for this matcher instance
  {
    goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
  },
);

//@ts-check

//@ts-ignore
const mode = TokenMatcher.createMode(matcher, {
  USE_CONSTRUCTS: true,

  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  createToken: (log => (match, state) => {
    // let construct;
    // const lastAtom = state.lastAtom;
    const token = TokenMatcher.createToken(match, state);

    if (state.USE_CONSTRUCTS === true && token !== undefined) {
      const {type, text, context = state.nextTokenContext} = token;
      //@ts-ignore
      if (token.goal === matcher.goal) {
        switch (type) {
          case 'inset':
          case 'whitespace':
          case 'opener':
          // if (context.currentConstruct.last === '=>') {
          // } else
          // if (text === '{') {
          //   if (context.openingConstruct[context.openingConstruct.length - 2] === '(…)') {
          //     [
          //       ,
          //       context.openingConstruct.block,
          //     ] = /((?:(?:async |)function (?:\* |)(?:\S+ |)|(?:while|for|if|else|catch|switch|with) |)\(…\) \{…\})?$/.exec(
          //       context.openingConstruct.text,
          //     );
          //     log('%s\t%o', text, {...context.openingConstruct});
          //   } else {
          //     // log('%s\t%o', text, [...context.openingConstruct.text]);
          //   }
          // }
          case 'closer':
            break;
          case 'number':
          case 'identifier':
            context.currentConstruct.add(`‹${type}›`);
            break;
          case 'combinator': // ie ‹=>›
          case 'delimiter':
          case 'breaker':
          case 'operator':
            switch (text) {
              case ',':
              case ';':
                context.currentConstruct.add(text);
                context.currentConstruct.set('');
                break;
              case '=>':
              case '.':
                context.currentConstruct.add(text);
                break;
              case ':':
                if (context.currentConstruct.length === 1) {
                  context.currentConstruct.add(text);
                  break;
                }
              default:
                context.currentConstruct.set(text);
                break;
            }
            break;
          case 'break':
            context.currentConstruct.last !== undefined &&
              (context.currentConstruct.last === 'return' ||
                context.currentConstruct.last === 'throw' ||
                context.currentConstruct.last === 'break' ||
                context.currentConstruct.last === 'continue' ||
                context.currentConstruct.last === 'yield' ||
                context.currentConstruct.last === '{…}') &&
              context.currentConstruct.set('');
            break;
          case 'keyword':
            switch (text) {
              case 'for':
              case 'if':
              case 'do':
              case 'while':
              case 'with':
                context.currentConstruct.set(text);
                break;
              default:
                context.currentConstruct.add(text);
            }
            break;
        }
        token.construct = context.currentConstruct.text;
        // typeof log === 'function' &&
        //   ((type === 'opener' && (text === '/' || text === '{')) ||
        //     // Semi
        //     text === ';' ||
        //     // Arrow Function
        //     text === '=>') &&
        //   log(
        //     '%s\t%o\n\t%o\n\t%o',
        //     text,
        //     type === 'breaker'
        //       ? context.currentConstruct.previousText
        //       : type === 'opener'
        //       ? token.context.openingConstruct.text
        //       : token.construct,
        //     lastAtom,
        //     token,
        //   );
      }
      token.isDelimiter || context.currentConstruct == null
        ? context.openingConstruct == null ||
          context.openingConstruct.length === 0 ||
          (token.hint = `${token.hint}\n\n${context.openingConstruct.text}`)
        : context.currentConstruct.length > 0
        ? (token.hint = `${token.hint}\n\n${context.currentConstruct.text}`)
        : context.currentConstruct.previousText &&
          (token.hint = `${token.hint}\n\n${context.currentConstruct.previousText}\n…`);
    }
    return token;
  })(
    /** @type {Console['log']} */
    // null && //
    //@ts-ignore
    (console.internal || console).log,
  ),
});

/** @typedef {import('./types').State} State */

import.meta.url.includes('/es/playground.js') && (mode.USE_CONSTRUCTS = true);

/** @param {import('markup/packages/tokenizer/lib/api').API} markup */
const experimentalES = ((
  sourceURL = './example',
  sourceType = 'es',
  resolveSourceType = (defaultType, {sourceType, resourceType, options}) => {
    if (!sourceType && (resourceType === 'javascript' || resourceType === 'octet')) return 'es';
    return defaultType;
  },
) => async markup => {
  markup.parsers[0].register(mode);
  return {
    sourceURL,
    sourceType,
    resolveSourceType,
    examples: {
      ['html']: {url: `${new URL('../../packages/markup/samples/complex.html', import.meta.url)}`, mode: 'html'},
    },
  };
})();

/** @type {{experimentalESAPI: import('../lib/api').API}} */
const {
  experimentalESAPI: experimentalESAPI,
  experimentalESAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  experimentalESAPI: new TokenizerAPI({
    parsers: [new (createParser())({url: import.meta.url})],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging && console.info('render: %o', {api: experimentalESAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

// Integrate experimental ECMAScript mapping it to the
//   "es" mode and "ecmascript" alias, but leaving the
//   normal JavaScript intact for both "js" and its
//   "javascript" alias.

const overrides = Object.freeze(experimentalES(experimentalESAPI));

export default experimentalESAPI;
export { overrides, parsers, render, tokenize, warmup };
//# sourceMappingURL=tokenizer.browser.es.js.map
