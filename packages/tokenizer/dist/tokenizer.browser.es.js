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

const EmptyTokenArray = (EmptyTokenArray =>
  Object.freeze(
    new (Object.freeze(Object.freeze(Object.setPrototypeOf(EmptyTokenArray.prototype, null)).constructor, null))(),
  ))(
  class EmptyTokenArray {
    *[Symbol.iterator]() {}
  },
);

/** @type {(string: string, sequence: string , index?: number) => number} */
const indexOf = Function.call.bind(String.prototype.indexOf);
/** @type {(string: string) => number} */
const countLineBreaks = text => {
  let lineBreaks = 0;
  for (let index = -1; (index = indexOf(text, '\n', index + 1)) > -1; lineBreaks++);
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

    /** @param {ModeFactory | Mode} mode @param {ModeOptions} [options] */
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
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
 * @typedef { {[name: string]: Mode} } Modes
 * @typedef { {[name: string]: {syntax: string} } } Mappings
 * @typedef { {aliases?: string[], syntax: string} } ModeOptions
 * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
 */

class TokenizerAPI {
  /** @param {API.Options} [options] */
  constructor(options) {
    /** @type {API.Options} */
    const {
      parsers = [],
      tokenize = (source, options = {}, flags) => {
        const state = new TokenizerAPI.State({options, flags: {}});
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
          return (returned = parser.tokenize((this.lastSource = source), (this.lastState = state)));
        } finally {
          returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
        }
      },

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
 * @typedef {import('./parser.js').Parser & {MODULE_URL?: string}} Parser
 * @typedef {Partial<{variant?: number, fragment?: Fragment, [name: string]: any}>} Parser.Options
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

const {assign, defineProperty} = Object;

const document$1 = void null;

class Node {
  get children() {
    return defineProperty(this, 'children', {value: new Set()}).children;
  }
  get childElementCount() {
    return (this.hasOwnProperty('children') && this.children.size) || 0;
  }
  get textContent() {
    return (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || '';
  }
  set textContent(text) {
    this.hasOwnProperty('children') && this.children.size && this.children.clear();
    text && this.children.add(new String(text));
  }
  appendChild(element) {
    return element && this.children.add(element), element;
  }
  append(...elements) {
    if (elements.length) for (const element of elements) element && this.children.add(element);
  }
  removeChild(element) {
    element && this.hasOwnProperty('children') && this.children.size && this.children.delete(element);
    return element;
  }
  remove(...elements) {
    if (elements.length && this.hasOwnProperty('children') && this.children.size)
      for (const element of elements) element && this.children.delete(element);
  }
}

class Element extends Node {
  get innerHTML() {
    return this.textContent;
  }
  set innerHTML(text) {
    this.textContent = text;
  }
  get outerHTML() {
    let classList;
    let {className, tag, innerHTML, dataset} = this;

    className &&
      (className = className.trim()) &&
      ({
        [className]: classList = (className &&
          (Element.classLists[className] = [...new Set(className.split(/\s+/g))].join(' '))) ||
          '',
      } = Element.classLists || (Element.classLists = Object.create(null)));

    const openTag = [tag];

    classList && openTag.push(`class="${classList}"`);

    if (dataset)
      for (const [key, value] of Object.entries(dataset))
        value == null || !key.trim || openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

    return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
  }

  toString() {
    return this.outerHTML;
  }
  toJSON() {
    return this.toString();
  }
}

class DocumentFragment extends Node {
  toString() {
    return this.textContent;
  }
  toJSON() {
    return (this.childElementCount && [...this.children]) || [];
  }
  [Symbol.iterator]() {
    return ((this.childElementCount && this.children) || '')[Symbol.iterator]();
  }
}

class Text extends String {
  toString() {
    return encodeEntities(super.toString());
  }
}

const createElement = (tag, properties, ...children) => {
  const element = assign(new Element(), {
    tag,
    className: (properties && properties.className) || '',
    properties,
  });
  children.length && defineProperty(element, 'children', {value: new Set(children)});
  return element;
};

const createText = (content = '') => new Text(content);
const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;
const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/g, encodeEntity);
const createFragment = () => new DocumentFragment();

const pseudo = /*#__PURE__*/Object.freeze({
  document: document$1,
  Node: Node,
  Element: Element,
  DocumentFragment: DocumentFragment,
  Text: Text,
  createElement: createElement,
  createText: createText,
  encodeEntity: encodeEntity,
  encodeEntities: encodeEntities,
  createFragment: createFragment
});

const {document: document$2, Element: Element$1, Node: Node$1, Text: Text$1, DocumentFragment: DocumentFragment$1} =
  'object' === typeof self && (self || 0).window === self && self;

const {createElement: createElement$1, createText: createText$1, createFragment: createFragment$1} = {
  createElement: (tag, properties, ...children) => {
    const element = document$2.createElement(tag);
    properties && Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  },

  createText: (content = '') => document$2.createTextNode(content),

  createFragment: () => document$2.createDocumentFragment(),
};

const dom = /*#__PURE__*/Object.freeze({
  document: document$2,
  Element: Element$1,
  Node: Node$1,
  Text: Text$1,
  DocumentFragment: DocumentFragment$1,
  createElement: createElement$1,
  createText: createText$1,
  createFragment: createFragment$1
});

// TEST: Trace for ESM testing
typeof process === 'object' && console.info('[ESM]: %o', import.meta.url);

const native = document$2 && dom;

// export {patterns, entities} from '../../grammars/common/patterns.js';

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

/// RUNTIME

/** Uses lightweight proxy objects that can be serialized into HTML text */
const HTML_MODE = true;

const supported = !!native;
const native$1 = !HTML_MODE;
const implementation = pseudo;
const {createElement: Element$2, createText: Text$2, createFragment: Fragment} = implementation;
const Template = template =>
  !supported || Template.supported === false
    ? false
    : Template.supported === true
    ? document.createElement('template')
    : (Template.supported = !!(
        (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
      )) && template;

/// IMPLEMENTATION

class MarkupRenderer {
  constructor(options) {
    // TODO: Consider making Renderer a thing
    const {factory, defaults} = new.target;

    const {SPAN = 'span', LINE = 'span', CLASS: classPrefix = 'markup', REFLOW = true} = {
      ...defaults,
      ...options,
    };

    const PUNCTUATOR = `punctuator`;
    const LITERAL = `literal`;

    this.renderers = {
      line: factory(LINE, {markupHint: `${classPrefix}-line`, markupClass: classPrefix}),

      fault: factory(SPAN, {markupHint: `fault`, markupClass: classPrefix}),
      text: factory(SPAN, {markupHint: classPrefix, markupClass: classPrefix}),

      whitespace: Text$2,
      inset: factory(SPAN, {markupHint: `inset whitespace`, markupClass: classPrefix}),
      break: factory(SPAN, {markupHint: `break whitespace`, markupClass: classPrefix}),

      comment: factory(SPAN, {markupHint: `comment`, markupClass: classPrefix}),

      keyword: factory(SPAN, {markupHint: `keyword`, markupClass: classPrefix}),
      identifier: factory(SPAN, {markupHint: `identifier`, markupClass: classPrefix}),

      sequence: factory(SPAN, {markupHint: `sequence`, markupClass: classPrefix}),

      literal: factory(SPAN, {markupHint: LITERAL, markupClass: classPrefix}),
      number: factory(SPAN, {markupHint: `${LITERAL} number`, markupClass: classPrefix}),
      quote: factory(SPAN, {markupHint: `quote`, markupClass: classPrefix}),
      pattern: factory(SPAN, {markupHint: `pattern`, markupClass: classPrefix}),

      punctuator: factory(SPAN, {markupHint: PUNCTUATOR, markupClass: classPrefix}),
      operator: factory(SPAN, {markupHint: `${PUNCTUATOR} operator`, markupClass: classPrefix}),
      assigner: factory(SPAN, {markupHint: `${PUNCTUATOR} operator assigner`, markupClass: classPrefix}),
      combinator: factory(SPAN, {markupHint: `${PUNCTUATOR} operator combinator`, markupClass: classPrefix}),
      punctuation: factory(SPAN, {markupHint: `${PUNCTUATOR} punctuation`, markupClass: classPrefix}),

      breaker: factory(SPAN, {markupHint: `${PUNCTUATOR} breaker`, markupClass: classPrefix}),
      opener: factory(SPAN, {markupHint: `${PUNCTUATOR} opener`, markupClass: classPrefix}),
      closer: factory(SPAN, {markupHint: `${PUNCTUATOR} closer`, markupClass: classPrefix}),
      span: factory(SPAN, {markupHint: `${PUNCTUATOR} span`, markupClass: classPrefix}),
    };

    this.reflows = REFLOW;
  }

  async render(tokens, fragment) {
    let logs, template, first, elements;
    try {
      fragment || (fragment = Fragment());
      logs = fragment.logs; // || (fragment.logs = []);
      elements = this.renderer(tokens);
      if ((first = await elements.next()) && 'value' in first) {
        template = Template();
        if (!native$1 && template && 'textContent' in fragment) {
          logs && logs.push(`render method = 'text' in template`);
          const body = [first.value];
          first.done || (await each(elements, element => body.push(element)));
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);
        } else if ('push' in fragment) {
          logs && logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          first.done || (await each(elements, element => fragment.push(element)));
        } else if ('append' in fragment) {
          logs && logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          first.done || (await each(elements, element => fragment.append(element)));
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
    const {renderers, reflows} = this;
    const createLine = reflows
      ? () => (renderedLine = renderers.line())
      : () => (renderedLine = renderers.line('', 'no-reflow'));
    const emit = (renderer, text, type, hint) => {
      (renderedLine || createLine()).appendChild((renderedLine.lastChild = renderer(text, hint || type)));
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint);
    const emitBreak = hint => emit(renderers.break, '\n', 'break', hint);
    const Lines = /^/gm;

    for (const token of tokens) {
      if (!token || !token.text) continue;

      ({type = 'text', text, punctuator, hint, lineInset, lineBreaks} = token);

      renderer =
        (punctuator &&
          (renderers[punctuator] || (type && renderers[type]) || renderers.punctuator || renderers.operator)) ||
        (type && (renderers[type] || (type !== 'whitespace' && type !== 'break' && renderers.text))) ||
        Text$2;

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (reflows && lineBreaks && type !== 'break') {
        LineInset = void (lineInset = lineInset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const normlizedline of text.split(Lines)) {
          (normalizedLineInset = normlizedline.startsWith(lineInset)
            ? normlizedline.slice(0, lineInset.length)
            : normlizedline.match(LineInset || (LineInset = RegExp(`^${lineInset.replace(/./g, '$&?')}`)))[0]) &&
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
            lineBreak && (emitBreak(), (renderedLine = void (yield renderedLine))));
        }
      } else {
        // TODO: See if pseudom children can be optimized for WBR/BR clones
        emit(renderer, text, type, hint);
        type === 'break'
          ? (renderedLine = void (yield renderedLine))
          : type === 'whitespace' || renderedLine.appendChild(Element$2('wbr'));
      }
    }
    renderedLine && (yield renderedLine);
  }

  /**
   * @param {string} tag
   * @param {Partial<HTMLElement>} [properties]
   * @param {boolean} [unflattened]
   */
  static factory(tagName, elementProperties) {
    const [
      tag,
      {
        defaults = (this || MarkupRenderer).defaults,
        markupClass = defaults.CLASS || MarkupRenderer.defaults.CLASS || 'markup',
        markupHint = '',
        ...properties
      } = {},
    ] = arguments;
    properties.className = markupHint ? `${markupClass} ${markupHint}` : markupClass;
    Object.freeze(properties);

    return Object.freeze((content, hint) => {
      let element, hintSeparator;

      element =
        (typeof content === 'string' && (content = Text$2(content))) || content != null
          ? Element$2(tag, properties, content)
          : Element$2(tag, properties);

      typeof hint === 'string' && hint !== '' && (hintSeparator = hint.indexOf('\n\n')) !== -1
        ? ((element.dataset = {hint: `${markupHint}${hint.slice(hintSeparator).replace(/\n/g, '&#x000A;')}`}),
          hintSeparator === 0 || (element.className = `${element.className} ${hint.slice(0, hintSeparator)}`))
        : (hint && (element.className = `${element.className} ${hint}`),
          (element.dataset = {hint: hint || markupHint || element.className}));

      // (hint &&
      //   (hint = hint) &&
      //   ((element.className = `${element.className || ''} ${classHint || hint}`),
      //   (element.dataset = {
      //     // hint: (markupHint ? `${markupHint}\n\n${hint}` : hint).replace(/\n/g, '&#x000A;'),
      //     hint: (markupHint ? `${markupHint}\n\n${hint}` : hint).replace(/\n/g, '&#x000A;'),
      //   }))) ||
      //   (element.className && (hint = element.className));

      return element;
    });
  }
}

MarkupRenderer.defaults = Object.freeze({
  /** Tag name of the element to use for rendering a token. */
  SPAN: 'span',
  /** Tag name of the element to use for grouping tokens in a single line. */
  LINE: 'span',
  /** The class name of the element to use for rendering a token. */
  CLASS: 'markup',
  /** Enable renderer-side unpacking { inset } || { breaks > 0 } tokens */
  REFLOW: true,
});

/// INTERFACE

const markupDOM = new MarkupRenderer();

//@ts-check
/// <reference path="./types.d.ts" />

// const trace = /** @type {[function, any[]][]} */ [];

class Matcher extends RegExp {
  /**
   * @template T
   * @param {Matcher.Pattern} pattern
   * @param {Matcher.Flags} [flags]
   * @param {Matcher.Entities} [entities]
   * @param {T} [state]
   */
  constructor(pattern, flags, entities, state) {
    // trace.push([new.target, [...arguments]]);
    //@ts-ignore
    super(pattern, flags);
    // Object.assign(this, RegExp.prototype, new.target.prototype);
    (pattern &&
      pattern.entities &&
      Symbol.iterator in pattern.entities &&
      ((!entities && (entities = pattern.entities)) || entities === pattern.entities)) ||
      Object.freeze((entities = (entities && Symbol.iterator in entities && [...entities]) || []));
    /** @type {MatcherEntities} */
    this.entities = entities;
    /** @type {T} */
    this.state = state;
    this.capture = this.capture;
    this.exec = this.exec;
    // this.test = this.test;
    ({
      // LOOKAHEAD: this.LOOKAHEAD = Matcher.LOOKAHEAD,
      // INSET: this.INSET = Matcher.INSET,
      // OUTSET: this.OUTSET = Matcher.OUTSET,
      DELIMITER: this.DELIMITER = Matcher.DELIMITER,
      UNKNOWN: this.UNKNOWN = Matcher.UNKNOWN,
    } = new.target);
  }

  /**
   * @param {string} source
   * @returns {MatcherMatchResult}
   */
  exec(source) {
    /** @type {MatcherMatchArray} */
    const match = super.exec(source);

    // @ts-ignore
    if (match === null) return null;

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
    // @ts-ignore
    return match;
  }

  /**
   * @param {Matcher.PatternFactory} factory
   * @param {Matcher.Flags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(factory, flags, properties) {
    /** @type {MatcherEntities} */
    const entities = [];
    entities.flags = '';
    // const pattern = factory(entity => void entities.push(((entity != null || undefined) && entity) || undefined));
    const pattern = factory(entity => {
      if (entity !== null && entity instanceof Matcher) {
        entities.push(...entity.entities);

        !entity.flags || (entities.flags = entities.flags ? Matcher.flags(entities.flags, entity.flags) : entity.flags);

        return entity.source;
      } else {
        entities.push(((entity != null || undefined) && entity) || undefined);
      }
    });
    flags = Matcher.flags('g', flags == null ? pattern.flags : flags, entities.flags);
    const matcher = new ((this && (this.prototype === Matcher.prototype || this.prototype instanceof RegExp) && this) ||
      Matcher)(pattern, flags, entities);

    properties && Object.defineProperties(matcher, properties);

    return matcher;
  }

  static flags(...sources) {
    let flags = '',
      iterative;
    for (const source of sources) {
      if (!source || (typeof source !== 'string' && typeof source.flags !== 'string')) continue;
      for (const flag of source.flags || source)
        (flag === 'g' || flag === 'y' ? iterative || !(iterative = true) : flags.includes(flag)) || (flags += flag);
    }
    // console.log('%o: ', flags, ...sources);
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
    /**
     * @param {any} value
     * @returns {string}
     */
    sequence.span = value =>
      (value &&
        // TODO: Don't coerce to string here?
        (typeof value !== 'symbol' && `${value}`)) ||
      '';

    sequence.WHITESPACE = /^\s+|\s*\n\s*|\s+$/g;

    Object.defineProperty(Matcher, 'sequence', {value: Object.freeze(sequence), enumerable: true, writable: false});
    return sequence;
  }

  static get join() {
    const {sequence} = this;

    const join = (...values) =>
      values
        .map(sequence.span)
        .filter(Boolean)
        .join('|');

    Object.defineProperty(Matcher, 'join', {value: Object.freeze(join), enumerable: true, writable: false});

    return join;
  }
}

const {
  // INSET = (Matcher.INSET = /* Symbol.for */ 'INSET'),
  // OUTSET = (Matcher.OUTSET = /* Symbol.for */ 'OUTSET'),
  DELIMITER = (Matcher.DELIMITER = /* Symbol.for */ 'DELIMITER'),
  UNKNOWN = (Matcher.UNKNOWN = /* Symbol.for */ 'UNKNOWN'),
  // LOOKAHEAD = (Matcher.LOOKAHEAD = /* Symbol.for */ 'LOOKAHEAD'),
  escape = (Matcher.escape = /** @type {<T>(source: T) => string} */ ((() => {
    const {replace} = Symbol;
    return source => /[\\^$*+?.()|[\]{}]/g[replace](source, '\\$&');
  })())),
  sequence,
  matchAll = (Matcher.matchAll =
    /**
     * @template {RegExp} T
     * @type {(string: Matcher.Text, matcher: T) => Matcher.Iterator<T> }
     */
    //@ts-ignore
    (() =>
      Function.call.bind(
        // String.prototype.matchAll || // TODO: Uncomment eventually
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

            if (!(matcher.flags.includes('g') || matcher.flags.includes('y'))) return void (yield matcher.exec(string));

            for (
              let match, lastIndex = -1;
              lastIndex <
              ((match = matcher.exec(string)) ? (lastIndex = matcher.lastIndex + (match[0].length === 0)) : lastIndex);
              yield match, matcher.lastIndex = lastIndex
            );
          },
        }.matchAll,
      ))()),
} = Matcher;

const {
  ranges,
  Null,
  BinaryDigit,
  DecimalDigit,
  ControlLetter,
  HexLetter,
  HexDigit,
  GraveAccent,
  ZeroWidthNonJoiner,
  ZeroWidthJoiner,
  ZeroWidthNoBreakSpace,
  Whitespace,
  IdentifierStart,
  IdentifierPart,
  UnicodeIDStart,
  UnicodeIDContinue,
} = (factories => {
  const {String, RegExp, Symbol, Object} = globalThis;
  const {raw} = String;
  const {replace: ReplaceSymbol} = Symbol;
  const {defineProperty, create} = Object;

  const RegExpClass = /^(?:\[(?=.*?\]$)|)((?:\\.|[^\\\n\[\]]*)*)\]?$/;

  class RegExpRange extends RegExp {
    constructor(source, flags) {
      let range;
      range =
        source && typeof source === 'object' && source instanceof RegExp
          ? (flags === undefined && (flags = source.flags), source.source)
          : (typeof source === 'string' ? source : (source = `${source || ''}`)).trim() &&
            (source = RegExpClass[ReplaceSymbol](source, '[$1]'));

      if (!range || !RegExpClass.test(range)) {
        throw TypeError(`Invalid Regular Expression class range: ${range}`);
      }

      typeof flags === 'string' || (flags = `${flags || ''}` || '');

      flags.includes('u') || !(source.includes('\\p{') || source.includes('\\u')) || (flags += 'u');
      super(source, flags);
      defineProperty(this, 'range', {value: range.slice(1, -1), enumerable: true, writable: false});
    }

    toString() {
      return this.range;
    }

    static range(strings, ...values) {
      return new (this || RegExpRange)(raw(strings, ...values));
    }
  }

  const safeRange = (strings, ...values) => {
    try {
      return RegExpRange.range(strings, ...values).source.slice(1, -1);
    } catch (exception) {}
  };

  const descriptors = {
    ranges: {
      get() {
        return ranges;
      },
      enumerable: true,
      configurable: false,
    },
  };

  for (const property in factories) {
    descriptors[property] = {
      get() {
        const value = factories[property](safeRange, ranges);
        defineProperty(ranges, property, {value, enumerable: true, configurable: false});
        return value;
      },
      enumerable: true,
      configurable: true,
    };
  }

  /** @type {Record<keyof factories, string>} */
  const ranges = create(null, descriptors);

  return ranges;
})({
  Null: range => range`\0`,
  BinaryDigit: range => range`01`,
  DecimalDigit: range => range`0-9`,
  ControlLetter: range => range`a-zA-Z`,
  HexLetter: range => range`a-fA-F`,
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
});

//@ts-check

/** @typedef {typeof stats} ContextStats */
const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  nestedCaptureCount: 0,
  nestedContextCount: 0,
  nestedTokenCount: 0,
};

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
    parentContext: undefined,
    goal: state.matcher.goal,
    group: undefined,
    state,
    ...(state.USE_CONSTRUCTS === true ? {currentConstruct: new Construct()} : {}),
  });
  state.firstTokenContext = state.nextTokenContext = state.lastContext = state.context = contexts[-1] = context;
  state.lastTokenContext = undefined;
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
  // NOTE: don't forget to uncomment after debugging
  state.context = state.contexts = state.groups = undefined;

  // Output to console when necessary
  debug && (error ? warn : log)(`[tokenizer]: ${error || 'done'} — %O`, state);
};

/** @param {Match} match @param {State} state @returns {Token}*/
const createToken = (match, state) => {
  let currentGoal,
    // goalName,
    currentGoalType,
    contextId,
    contextNumber,
    contextDepth,
    contextGroup,
    parentContext,
    tokenReference,
    tokenContext,
    nextToken,
    text,
    type,
    fault,
    punctuator,
    offset,
    lineInset,
    lineBreaks,
    isDelimiter,
    isComment,
    isWhitespace,
    flatten,
    fold,
    columnNumber,
    lineNumber,
    tokenNumber,
    captureNumber,
    hint;

  const {
    context: currentContext,
    nextContext,
    lineIndex,
    lineOffset,
    nextOffset,
    lastToken,
    lastTrivia,
    lastAtom,
  } = state;

  /* Capture */
  ({
    0: text,
    capture: {inset: lineInset},
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

  nextOffset &&
    (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
    (state.matcher.lastIndex = nextOffset)));

  lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
  isDelimiter = type === 'closer' || type === 'opener';
  isWhitespace = !isDelimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

  (isComment = type === 'comment' || punctuator === 'comment')
    ? (type = 'comment')
    : type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

  if (lineBreaks) {
    state.lineIndex += lineBreaks;
    state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
  }

  /* Flattening / Token Folding */

  flatten === false || flatten === true || (flatten = !isDelimiter && currentGoal.flatten === true);

  captureNumber = ++tokenContext.captureCount;
  state.totalCaptureCount++;

  if (
    (fold = flatten) && // fold only if flatten is allowed
    lastToken != null &&
    ((lastToken.contextNumber === contextNumber && lastToken.fold === true) ||
      (type === 'closer' && flatten === true)) && // never fold across contexts
    (lastToken.type === type || (currentGoal.fold === true && (lastToken.type = currentGoalType)))
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

      isWhitespace, // whitespace:
      isDelimiter, // delimiter:
      isComment, // comment:

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

const capture = (identity, match, text) => {
  match.capture[(match.identity = identity)] = match[0];
  (match.fault = identity === 'fault') && (match.flatten = false);
  return match;
};

/**
 * Safely mutates matcher state to open a new context.
 *
 * @param {string} text - Text of the intended { type = "opener" } token
 * @param {State} state - Matcher state
 * @returns {undefined | string} - String when context is **not** open
 */
const open = (text, state) => {
  const {
    contexts,
    context: parentContext,
    context: {depth: index, goal: initialGoal},
    groups,
  } = state;
  const group = initialGoal.groups[text];

  if (!group) return initialGoal.type || 'sequence';
  groups.splice(index, groups.length, group);
  groups.closers.splice(index, groups.closers.length, group.closer);

  parentContext.contextCount++;

  const goal = group.goal === undefined ? initialGoal : group.goal;

  state.nextContext = contexts[index] = initializeContext({
    id: `${parentContext.id} ${
      goal !== initialGoal ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}` : group[Symbol.toStringTag]
    }`,
    number: ++contexts.count,
    depth: index + 1,
    parentContext,
    goal,
    group,
    state,
  });
};

/**
 * Safely mutates matcher state to close the current context.
 *
 * @param {string} text - Text of the intended { type = "closer" } token
 * @param {State} state - Matcher state
 * @returns {undefined | string} - String when context is **not** closed
 */
const close = (text, state) => {
  const groups = state.groups;
  const index = groups.closers.lastIndexOf(text);

  if (index === -1 || index !== groups.length - 1) return fault();

  groups.closers.splice(index, groups.closers.length);
  groups.splice(index, groups.length);
  state.nextContext = state.context.parentContext;
};

/**
 * Safely mutates matcher state to skip ahead.
 *
 * TODO: Finish implementing forward helper
 *
 * @param {string | RegExp} search
 * @param {Match} match
 * @param {State} state
 * @param {number} [delta]
 */
const forward = (search, match, state, delta) => {
  if (typeof search === 'string' && search.length) {
    state.nextOffset = match.input.indexOf(search, match.index + match[0].length) + (0 + delta || 0);
  } else if (search != null && typeof search === 'object') {
    search.lastIndex = match.index + match[0].length;
    search.exec(match.input);
    state.nextOffset = search.lastIndex + (0 + delta || 0);
  } else {
    throw new TypeError(`forward invoked with an invalid search argument`);
  }
};

/**
 * @returns {'fault'}
 */
const fault = (text, state) => {
  // console.warn(text, {...state});
  return 'fault';
};

const generateDefinitions = ({groups, goals, identities, symbols, keywords, tokens}) => {
  const {[symbols.FaultGoal]: FaultGoal} = goals;

  const {create, freeze, entries, getOwnPropertySymbols, getOwnPropertyNames, setPrototypeOf} = Object;

  const punctuators = create(null);

  for (const opener of getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    freeze(group);
  }

  for (const symbol of getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    goal.name = (goal.symbol = symbol).description.replace(/Goal$/, '');
    goal[Symbol.toStringTag] = `«${goal.name}»`;
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.punctuators) {
      for (const punctuator of (goal.punctuators = [...goal.punctuators]))
        punctuators[punctuator] = !(goal.punctuators[punctuator] = true);
      freeze(setPrototypeOf(goal.punctuators, punctuators));
    }

    if (goal.closers) {
      for (const closer of (goal.closers = [...goal.closers])) punctuators[closer] = !(goal.closers[closer] = true);
      freeze(setPrototypeOf(goal.closers, punctuators));
    }

    if (goal.openers) {
      for (const opener of (goal.openers = [...goal.openers])) {
        const group = (goal.groups[opener] = {...groups[opener]});
        punctuators[opener] = !(goal.openers[opener] = true);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
        group.description || (group.description = `${group.opener}…${group.closer}`);
        group[Symbol.toStringTag] = `‹${group.opener}›`;
      }
      freeze(setPrototypeOf(goal.openers, punctuators));
    }

    freeze(goal.groups);
    freeze(goal.tokens);
    freeze(goal);
  }

  freeze(punctuators);
  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);

  for (const [identity, list] of entries({})) {
    for (const keyword of list.split(/\s+/)) {
      keywords[keyword] = identity;
    }
  }

  keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  freeze(keywords);

  /**
   * Creates a symbolically mapped goal-specific token record
   *
   * @template {{}} T
   * @param {Goal} goal
   * @param {string} text
   * @param {type} type
   * @param {T} properties
   */
  function GoalSpecificTokenRecord(goal, text, type, properties) {
    const symbol = Symbol(`‹${goal.name} ${text}›`);
    return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
  }
};

/**
 * @template {string} K
 * @template {string} I
 * @param {{[i in I]: K[]}} mappings
 */
const Keywords = mappings => {
  /** @type {{[k in K]: I}} */
  //@ts-ignore
  const keywords = {};

  for (const identity in mappings) {
    for (const keyword of mappings[identity]) {
      keywords[keyword] = identity;
    }
  }
  return keywords;
};

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

/** @typedef {import('./types').Match} Match */
/** @typedef {import('./types').Groups} Groups */
/** @typedef {import('./types').Group} Group */
/** @typedef {import('./types').Goal} Goal */
/** @typedef {import('./types').Context} Context */
/** @typedef {import('./types').Contexts} Contexts */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Token} Token */
/** @typedef {Goal['type']} type */
/** @typedef {{symbol: symbol, text: string, type: type, goal?: Goal, group?: Group}} token */

//@ts-check

const DEBUG_CONSTRUCTS = Boolean(false);

const ECMAScriptGoalSymbol = Symbol('ECMAScriptGoal');
const CommentGoalSymbol = Symbol('CommentGoal');
const RegExpGoalSymbol = Symbol('RegExpGoal');
const StringGoalSymbol = Symbol('StringGoal');
const TemplateLiteralGoalSymbol = Symbol('TemplateLiteralGoal');
const FaultGoalSymbol = Symbol('FaultGoal');

const goals = {};

goals[ECMAScriptGoalSymbol] = {
  type: undefined,
  flatten: undefined,
  fold: undefined,
  openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
  closers: ['}', ')', ']'],
};

goals[CommentGoalSymbol] = {type: 'comment', flatten: true, fold: true};

goals[RegExpGoalSymbol] = {
  type: 'pattern',
  flatten: undefined,
  fold: undefined,
  openers: ['[', '(', '{'],
  closers: [']', ')', '}'],
  opener: '/',
  closer: '/',
  // punctuators: ['+', '*', '?', '|', '^', '{', '}', '(', ')'],
  punctuators: ['+', '*', '?', '|', '^'],
};

goals[StringGoalSymbol] = {type: 'quote', flatten: true, fold: true};

goals[TemplateLiteralGoalSymbol] = {
  type: 'quote',
  flatten: true,
  fold: false,
  openers: ['${'],
  opener: '`',
  closer: '`',
};

goals[FaultGoalSymbol] = {type: 'fault'}; // , groups: {}

const {
  [FaultGoalSymbol]: FaultGoal,
  [ECMAScriptGoalSymbol]: ECMAScriptGoal,
  [CommentGoalSymbol]: CommentGoal,
  [RegExpGoalSymbol]: RegExpGoal,
  [StringGoalSymbol]: StringGoal,
  [TemplateLiteralGoalSymbol]: TemplateLiteralGoal,
} = goals;

const groups = {
  ['{']: {opener: '{', closer: '}'},
  ['(']: {opener: '(', closer: ')'},
  ['[']: {opener: '[', closer: ']'},
  ['//']: {
    opener: '//',
    closer: '\n',
    goal: CommentGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹comment›',
  },
  ['/*']: {
    opener: '/*',
    closer: '*/',
    goal: CommentGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹comment›',
  },
  ['/']: {
    opener: '/',
    closer: '/',
    goal: RegExpGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹pattern›',
  },
  ["'"]: {
    opener: "'",
    closer: "'",
    goal: StringGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹string›',
  },
  ['"']: {
    opener: '"',
    closer: '"',
    goal: StringGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹string›',
  },
  ['`']: {
    opener: '`',
    closer: '`',
    goal: TemplateLiteralGoalSymbol,
    parentGoal: ECMAScriptGoalSymbol,
    description: '‹template›',
  },
  ['${']: {
    opener: '${',
    closer: '}',
    goal: ECMAScriptGoalSymbol,
    parentGoal: TemplateLiteralGoalSymbol,
    description: '‹span›',
  },
};

const identities = {
  UnicodeIDStart: 'ECMAScriptUnicodeIDStart',
  UnicodeIDContinue: 'ECMAScriptUnicodeIDContinue',
  HexDigits: 'ECMAScriptHexDigits',
  CodePoint: 'ECMAScriptCodePoint',
  ControlEscape: 'ECMAScriptControlEscape',
  ContextualWord: 'ECMAScriptContextualWord',
  RestrictedWord: 'ECMAScriptRestrictedWord',
  FutureReservedWord: 'ECMAScriptFutureReservedWord',
  Keyword: 'ECMAScriptKeyword',
  // MetaProperty: 'ECMAScriptMetaProperty',
};

/** @type {ECMAScript.Keywords} */
// @ts-ignore
const keywords = Keywords({
  // TODO: Let's make those constructs (this.new.target borks)
  // [identities.MetaProperty]: 'new.target import.meta',
  [identities.Keyword]: [
    ...['await', 'break', 'case', 'catch', 'class', 'const', 'continue'],
    ...['debugger', 'default', 'delete', 'do', 'else', 'export', 'extends'],
    ...['finally', 'for', 'function', 'if', 'import', 'in', 'instanceof'],
    ...['let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try'],
    ...['typeof', 'var', 'void', 'while', 'with', 'yield'],
  ],
  [identities.RestrictedWord]: ['interface', 'implements', 'package', 'private', 'protected', 'public'],
  [identities.FutureReservedWord]: ['enum'],
  // NOTE: This is purposely not aligned with the spec
  [identities.ContextualWord]: ['arguments', 'async', 'as', 'from', 'of', 'static', 'get', 'set'],
});

{
  const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
  const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
  const constructiveKeywords = new Set('await async function class await delete typeof void yield this new'.split(' '));

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

  goals[RegExpGoalSymbol].initializeContext = goals[StringGoalSymbol].initializeContext = goals[
    TemplateLiteralGoalSymbol
  ].initializeContext = initializeContext;

  /** @param {Context} context */
  goals[ECMAScriptGoalSymbol].initializeContext = context => {
    context.captureKeyword = captureKeyword;
    context.state['USE_CONSTRUCTS'] === true && initializeContext(context);
  };
}

const symbols = {
  ECMAScriptGoal: ECMAScriptGoalSymbol,
  CommentGoal: CommentGoalSymbol,
  RegExpGoal: RegExpGoalSymbol,
  StringGoal: StringGoalSymbol,
  TemplateLiteralGoal: TemplateLiteralGoalSymbol,
  FaultGoal: FaultGoalSymbol,
};

/** Unique token records @type {{[symbol: symbol]: }} */
const tokens = {};

generateDefinitions({groups, goals, identities, symbols, keywords, tokens});

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */

// //@ts-ignore
// const keywords = {};

// function Symbolic(key, description = key) {
//   return (symbols[key] = Symbol(description));
// }

// import {Matcher} from '../../../modules/matcher/matcher.js';

const matcher = (ECMAScript =>
  Matcher.define(
    // Matcher generator for this matcher instance
    entity =>
      Matcher.join(
        entity(ECMAScript.Break()),
        entity(ECMAScript.Whitespace()),
        entity(ECMAScript.Escape()),
        entity(ECMAScript.Comment()),
        entity(ECMAScript.StringLiteral()),
        entity(ECMAScript.TemplateLiteral()),
        entity(ECMAScript.Opener()),
        entity(ECMAScript.Closer()),
        entity(ECMAScript.Solidus()),
        entity(ECMAScript.Operator()),
        entity(ECMAScript.Keyword()),
        entity(ECMAScript.Number()),
        entity(ECMAScript.Identifier()),

        // Defines how to address non-entity character(s):
        entity(
          ECMAScript.Fallthrough({
            type: 'fault',
            flatten: true,
          }),
        ),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {
      goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
    },
  ))({
  Fallthrough: ({fallthrough = '.', type, flatten} = {}) =>
    Matcher.define(
      (typeof fallthrough === 'string' || (fallthrough = '.'), type && typeof type === 'string')
        ? entity => Matcher.sequence`(
            ${fallthrough}
            ${entity((text, entity, match, state) => {
              capture(
                type !== 'fault'
                  ? type || state.context.goal.type || 'sequence'
                  : state.context.goal !== ECMAScriptGoal
                  ? state.context.goal.type || 'sequence'
                  : fault(),
                match,
                // text,
              );
              typeof flatten === 'boolean' && (match.flatten = flatten);
            })}
          )`
        : entity => `${fallthrough}`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          capture(
            state.context.group !== undefined && state.context.group.closer === '\n'
              ? close(text, state) || (state.context.goal === CommentGoal ? 'break' : 'closer')
              : 'break',
            match,
            // text,
          );
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \s+
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          capture((match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset', match); // , text
        })}
      )`,
    ),
  Escape: ({
    IdentifierStartCharacter = RegExp(
      Matcher.sequence`[${IdentifierStart}]`,
      IdentifierPart.includes('\\p{') ? 'u' : '',
    ),
    IdentifierPartSequence = RegExp(Matcher.sequence`[${IdentifierPart}]+`, IdentifierPart.includes('\\p{') ? 'u' : ''),
    fromUnicodeEscape = (fromCodePoint => text => fromCodePoint(parseInt(text.slice(2), 16)))(String.fromCodePoint),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        \\u[${HexDigit}][${HexDigit}][${HexDigit}][${HexDigit}]
        ${entity((text, entity, match, state) => {
          match.format = 'escape';
          capture(
            state.context.goal.type ||
              (state.context.goal === ECMAScriptGoal &&
              state.lastToken != null &&
              (state.lastToken.type === 'identifier'
                ? IdentifierPartSequence.test(fromUnicodeEscape(text))
                : IdentifierStartCharacter.test(fromUnicodeEscape(text)))
                ? ((match.flatten = true), 'identifier')
                : 'escape'),
            match,
            // text,
          );
        })}
      )|(
        \\f|\\n|\\r|\\t|\\v|\\c[${ControlLetter}]
        |\\x[${HexDigit}][${HexDigit}]
        |\\u\{[${HexDigit}]*\}
        |\\[^]
        ${entity((text, entity, match, state) => {
          capture(state.context.goal.type || 'escape', match);
          match.capture[keywords[text]] = text;
        })}
      )`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/|\/\*
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // Safely fast forward to end of comment
                  (text === '//' ? forward('\n', match, state) : forward('*/', match, state),
                  (match.punctuator = CommentGoal.type),
                  'opener')
              : state.context.goal !== CommentGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? CommentGoal.type
              : close(text, state) || (match.punctuator = CommentGoal.type),
            match,
            // text,
          );
        })}
      )`,
    ),
  StringLiteral: ({
    SingleQuoteLookAhead = /(?:[^'\\\n]+?(?=\\.|')|\\.)*?(?:'|$)/g,
    DoubleQuoteLookAhead = /(?:[^"\\\n]+?(?=\\.|")|\\.)*?(?:"|$)/g,
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        "|'
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // Safely fast forward to end of string
                  (forward(text === '"' ? DoubleQuoteLookAhead : SingleQuoteLookAhead, match, state, -1),
                  // (match.flatten = true),
                  (match.punctuator = StringGoal.type),
                  'opener')
              : state.context.goal !== StringGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? StringGoal.type
              : close(text, state) ||
                ((match.punctuator = StringGoal.type),
                // (match.flatten = true),
                'closer'),
            match,
            // text,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${'`'}
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // TODO: Explore fast forward in template string parts
                  ((match.punctuator = TemplateLiteralGoal.type), 'opener')
              : state.context.goal !== TemplateLiteralGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? TemplateLiteralGoal.type
              : close(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'closer'),
            match,
            // text,
          );
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal.punctuators !== undefined && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.openers &&
                state.context.goal.openers[text] === true &&
                (state.context.goal !== RegExpGoal || state.context.group.opener !== '[')
              ? open(text, state) || 'opener'
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Closer: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \}|\)|\]
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.closers &&
                state.context.goal.closers[text] === true &&
                (state.context.goal !== RegExpGoal ||
                  (state.context.group.opener !== '[' || text === state.context.group.closer))
              ? close(text, state) || 'closer'
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Solidus: () =>
    // TODO: Refine the necessary criteria for RegExp vs Div
    // TEST: [eval('var g;class x {}/1/g'), eval('var g=class x {}/1/g')]
    Matcher.define(
      entity => Matcher.sequence`(
        \*\/|\/=|\/
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal === CommentGoal
              ? (state.context.group.closer === text && close(text, state)) ||
                  (match.punctuator = state.context.goal.type)
              : state.context.goal === RegExpGoal && state.context.group.closer !== ']'
              ? close('/', state) || ((match.punctuator = state.context.goal.type), 'closer')
              : state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : text[0] === '*'
              ? fault()
              : state.lastAtom === undefined ||
                (state.lastAtom.type === 'operator'
                  ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                  : state.lastAtom.type === 'closer'
                  ? state.lastAtom.text === '}'
                  : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
              ? open(text, state) || ((match.punctuator = 'pattern'), 'opener')
              : (match.punctuator = 'operator'),
            match,
            // text,
          );
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          capture(
            state.context.goal === ECMAScriptGoal
              ? (text === '*' && state.lastAtom && state.lastAtom.text === 'function' && 'keyword') || 'operator'
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${Matcher.join(...keywords).replace(/\./g, '\\.')}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          capture(
            (match.flatten = state.context.goal !== ECMAScriptGoal)
              ? state.context.goal.type || 'sequence'
              : state.lastAtom !== undefined && state.lastAtom.text === '.'
              ? 'identifier'
              : state.context.captureKeyword === undefined
              ? 'keyword'
              : state.context.captureKeyword(text, state) || fault(),
            match,
            // text,
          );
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({RegExpFlags = /^[gimsuy]+$/} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        [${IdentifierStart}][${IdentifierPart}]*
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          capture(
            state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : state.lastToken !== undefined && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
              ? ((match.flatten = true), (match.punctuator = RegExpGoal.type), 'closer')
              : ((match.flatten = true), 'identifier'),
            match,
            // text,
          );
        })}
      )`,
      `${IdentifierStart}${IdentifierPart}`.includes('\\p{') ? 'u' : '',
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => Matcher.sequence`[${Digit}][${Digit}${Matcher.escape(NumericSeparator)}]*`
      : Digit => Matcher.sequence`[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
    HexDigits = Digits(HexDigit),
    BinaryDigits = Digits(BinaryDigit),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |0[xX]${HexDigits}
        |0[bB]${BinaryDigits}
        |${DecimalDigits}\.${DecimalDigits}
        |\.${DecimalDigits}
        |${DecimalDigits}
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          capture(state.context.goal.type || 'number', match); // , text
        })}
      )\b`,
    ),
});

/// <reference path="./types.d.ts" />

const {
  createTokenFromMatch,
  createMatcherInstance,
  createString,
  createMatcherTokenizer,
  createMatcherMode,
} = (() => {
  const {
    RegExp,
    Object,
    Object: {assign, create, freeze, defineProperty, defineProperties, getOwnPropertyNames, setPrototypeOf},
    String,
  } = globalThis;

  /** @typedef {RegExpConstructor['prototype']} Matcher */

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenizerState<T, U>} [state]
   * @returns {TokenMatcher<U>}
   */
  const createMatcherInstance = (matcher, state) =>
    defineProperty(
      ((state || (state = create(null))).matcher =
        (matcher && matcher instanceof RegExp && createMatcherClone(matcher)) || RegExp(matcher, 'g')),
      'state',
      {value: state},
    );

  /**
   * @template {Matcher} T
   * @template {T} U
   * @template {{}} V
   * @type {(matcher: T & V, instance?: U) => U & V}
   * @param {T} param0
   * @param {U} [param1]
   * @returns {U}
   */
  const createMatcherClone = ({constructor: {prototype}, source, flags, lastIndex, ...properties}, instance) => (
    (instance = assign(instance || RegExp(source, flags || 'g'), properties)),
    prototype && setPrototypeOf(instance, prototype),
    instance
  );

  /** @type {(value: any) => string} */
  const createString = String;

  /**
   * @type {<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>}
   * @param {MatchResult<MatchArray>} param0
   */
  const createTokenFromMatch = ({0: text, identity, capture, index}) => ({
    type: (identity && (identity.description || identity)) || 'text',
    text,
    lineBreaks: countLineBreaks(text),
    lineInset: (capture && capture.inset) || '',
    offset: index,
    capture,
  });

  const tokenizerProperties = Object.getOwnPropertyDescriptors(
    freeze(
      class Tokenizer {
        /** @template {Matcher} T @template {{}} U */
        *tokenize() {
          /** @type {Token<U>} */
          // let next;
          /** @type {{createToken: typeof createTokenFromMatch, initializeState: <V>(state: V) => V & TokenizerState<T, U>}} */
          const createToken = (this && this.createToken) || createTokenFromMatch;
          /** @type {string} */
          const string = createString(Object.keys({[arguments[0]]: 1})[0]);
          /** @type {TokenMatcher<U>} */
          const matcher = createMatcherInstance(this.matcher, assign(arguments[1] || {}, {sourceText: string}));
          /** @type {TokenizerState<T, U>} */
          const state = matcher.state;
          this.initializeState && this.initializeState(state);
          matcher.exec = matcher.exec;

          for (
            let match, capturedToken, retainedToken, index = 0;
            // BAIL on first failed/empty match
            ((match = matcher.exec(string)) !== null && match[0] !== '') ||
            //   BUT first yield a nextToken if present
            (retainedToken !== undefined && (yield retainedToken), (state.nextToken = undefined));

          ) {
            if ((capturedToken = createToken(match, state)) === undefined) continue;

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

          // console.log({...state});
        }
      }.prototype,
    ),
  );

  /**
   * @type { {<T extends Matcher, U extends {} = {}>(sourceText: string, initialState?: Partial<TokenizerState<undefined, U>): IterableIterator<Token<U>>} }
   */
  const createMatcherTokenizer = instance => defineProperties(instance, tokenizerProperties);

  /**
   * @param {import('/modules/matcher/matcher.js').Matcher} matcher
   * @param {any} [options]
   */
  const createMatcherMode = (matcher, options) => {
    const tokenizer = createMatcherTokenizer({
      createToken: createTokenFromMatch,
      /** @type {(state: {}) =>  void} */
      initializeState: undefined,
      finalizeState: undefined,
      matcher: freeze(createMatcherInstance(matcher)),
    });

    const mode = {syntax: 'matcher', tokenizer};
    options &&
      ({
        syntax: mode.syntax = mode.syntax,
        aliases: mode.aliases,
        preregister: mode.preregister,
        createToken: tokenizer.createToken = tokenizer.createToken,
        initializeState: tokenizer.initializeState,
        finalizeState: tokenizer.finalizeState,
        ...mode.overrides
      } = options);

    freeze(tokenizer);

    return mode;
  };

  return {createTokenFromMatch, createMatcherInstance, createString, createMatcherTokenizer, createMatcherMode};
})();

//@ts-check

const mode = createMatcherMode(matcher, {
  USE_CONSTRUCTS: false,

  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  initializeState: state => {
    state.USE_CONSTRUCTS = mode.USE_CONSTRUCTS === true;
    initializeState(state);
  },

  finalizeState: state => {
    finalizeState(state);
  },

  createToken: (match, state) => {
    const token = createToken(match, state);

    if (state.USE_CONSTRUCTS === true && token !== undefined) {
      const {type, text, context} = token;
      if (token.goal === matcher.goal) {
        switch (type) {
          case 'inset':
          case 'whitespace':
          case 'opener':
          case 'closer':
            break;
          case 'number':
          case 'identifier':
            context.currentConstruct.add(`‹${type}›`);
            break;
          case 'operator':
            switch (text) {
              case ',':
              case ';':
                context.currentConstruct.set('');
                break;
              case '?':
              case '=':
                context.currentConstruct.set(text);
                break;
              default:
                context.currentConstruct.add(text);
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
  },
});

/** @typedef {import('./types').State} State */

import.meta.url.includes('/es/playground.js') && (mode.USE_CONSTRUCTS = true);

/**
 * @param {import('/markup/packages/tokenizer/lib/api').API} markup
 */
const experimentalES = ((
  sourceURL = './matcher.js',
  sourceType = 'es',
  resolveSourceType = (defaultType, {sourceType, resourceType, options}) => {
    if (!sourceType && resourceType === 'javascript') return 'es';
  },
) => async markup => {
  markup.parsers[0].register(mode);
  return {sourceURL, sourceType, resolveSourceType};
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
