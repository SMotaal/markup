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
    return (
      (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || ''
    );
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
    element &&
      this.hasOwnProperty('children') &&
      this.children.size &&
      this.children.delete(element);
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
    const {className, tag, innerHTML} = this;
    return `<${tag}${(className && ` class="${className}"`) || ''}>${innerHTML || ''}</${tag}>`;
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
const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/gim, encodeEntity);
const createFragment = () => new DocumentFragment();

var pseudo = /*#__PURE__*/Object.freeze({
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

var dom = /*#__PURE__*/Object.freeze({
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

//@ts-check

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

// export async function next(iterator, previous, received, done) {
//   let result, value;
//   !previous || (await previous);
//   const next = done ? 'return' : 'next';
//   !(iterator && next in iterator && typeof iterator[next] === 'function') ||
//     !((result = received === VOID ? iterator[next]() : iterator[next](received)) && (result = await result)) ||
//     ('done' in result && (done = !!(await result.done)), 'value' in result && (value = await result.value));
//   return {value, done: !!done};
// }

// export const AsyncIterator = (() => {
//   const Done = Symbol('[[Done]]');
//   const Result = Symbol('[[Result]]');
//   const Iterator = Symbol('[[Iterator]]');
//   const DONE = Object.freeze(Object.seal({done: true, value: undefined}));
//   const VOID = Symbol('[[Void]]');
//   const EMPTY = [];
//   const reject = async reason => ({value: Promise.reject(reason), done: true});
//   const next = async (iterator, previous, received, done) => {
//     let result, value;
//     !previous || (await previous);
//     const next = done ? 'return' : 'next';
//     !(iterator && next in iterator && typeof iterator[next] === 'function') ||
//       !((result = received === VOID ? iterator[next]() : iterator[next](received)) && (result = await result)) ||
//       ('done' in result && (done = !!(await result.done)), 'value' in result && (value = await result.value));
//     return {value, done: !!done};
//   };

//   /**
//    * @template T
//    * @implements {AsyncIterableIterator<T>}
//    */
//   class AsyncIterator {
//     /** @param {IterableIterator<T> | AsyncIterableIterator<T>} [iterator] */
//     constructor(iterator) {
//       Object.defineProperty(this, Iterator, {
//         value:
//           (iterator &&
//             (iterator[Iterator] ||
//               (Symbol.iterator in iterator && iterator[Symbol.iterator]()) ||
//               (Symbol.asyncIterator in iterator && iterator[Symbol.asyncIterator]()))) ||
//           EMPTY[Symbol.iterator](),
//       });
//     }

//     [Symbol.asyncIterator]() {
//       return this;
//     }

//     /** @param {T} [value] @returns {Promise<IteratorResult<T>>} */
//     async next(value) {
//       let result;
//       return this[Done]
//         ? this[Result] || DONE
//         : ((this[Done] = (await (result = this[Result] = next(
//             this[Iterator],
//             this[Result],
//             arguments.length ? value : VOID,
//           ))).done),
//           result);
//     }

//     /**
//      * @param {any} [value]
//      * @returns {Promise<IteratorResult>}
//      */
//     async return(value) {
//       return this[Done]
//         ? this[Result] || DONE
//         : (this[Result] = next(this[Iterator], null, arguments.length ? value : VOID, (this[Done] = true)));
//     }

//     /**
//      * @param {any} error
//      * @returns {Promise<IteratorResult>}
//      */
//     async throw(error) {
//       return this[Done] ? this[Result] || DONE : ((this[Done] = true), (this[Result] = reject(error)));
//     }
//   }

//   return AsyncIterator;
// })();

// const x = new AsyncIterator([1]);
// const y = x[Symbol.asyncIterator]();

// export const async = {
//   each: async (iterable, ƒ) => {

//   }
// };

//  * @param {AsyncIterableIterator<T> | AsyncIterator<T>} iterable

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/** Uses lightweight proxy objects that can be serialized into HTML text */
const HTML_MODE = true;
/// INTERFACE

const renderers = {};

function* renderer(tokens, tokenRenderers = renderers) {
  for (const token of tokens) {
    const {type = 'text', text, punctuator, breaks} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    element && (yield element);
  }
}

async function render(tokens, fragment) {
  let logs, template, first, elements;
  try {
    fragment || (fragment = Fragment());
    logs = fragment.logs || (fragment.logs = []);
    elements = renderer(tokens);
    if ((first = await elements.next()) && 'value' in first) {
      template = Template();
      if (!native$1 && template && 'textContent' in fragment) {
        logs.push(`render method = 'text' in template`);
        const body = [first.value];
        first.done || (await each(elements, element => body.push(element)));
        template.innerHTML = body.join('');
        fragment.appendChild(template.content);
      } else if ('push' in fragment) {
        logs.push(`render method = 'push' in fragment`);
        fragment.push(first.value);
        first.done || (await each(elements, element => fragment.push(element)));
      } else if ('append' in fragment) {
        logs.push(`render method = 'append' in fragment`);
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

const supported = !!native;
const native$1 = !HTML_MODE && supported;
const implementation = native$1 ? native : pseudo;
const {createElement: Element$2, createText: Text$2, createFragment: Fragment} = implementation;
const Template = template =>
  !supported || Template.supported === false
    ? false
    : Template.supported === true
    ? document.createElement('template')
    : (Template.supported = !!(
        (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
      )) && template;

/// RENDERERS
const factory = (tag, properties) => (content, token) => {
  if (!content) return;
  typeof content !== 'string' || (content = Text$2(content));
  const element = Element$2(tag, properties, content);
  element && token && (token.hint && (element.className += ` ${token.hint}`));
  return element;
};

Object.assign(renderers, {
  whitespace: Text$2,
  text: factory(SPAN, {className: CLASS}),

  variable: factory('var', {className: `${CLASS} variable`}),
  keyword: factory(SPAN, {className: `${CLASS} keyword`}),
  identifier: factory(SPAN, {className: `${CLASS} identifier`}),
  operator: factory(SPAN, {className: `${CLASS} punctuator operator`}),
  assigner: factory(SPAN, {className: `${CLASS} punctuator operator assigner`}),
  combinator: factory(SPAN, {className: `${CLASS} punctuator operator combinator`}),
  punctuation: factory(SPAN, {className: `${CLASS} punctuator punctuation`}),
  quote: factory(SPAN, {className: `${CLASS} punctuator quote`}),
  breaker: factory(SPAN, {className: `${CLASS} punctuator breaker`}),
  opener: factory(SPAN, {className: `${CLASS} punctuator opener`}),
  closer: factory(SPAN, {className: `${CLASS} punctuator closer`}),
  span: factory(SPAN, {className: `${CLASS} punctuator span`}),
  sequence: factory(SPAN, {className: `${CLASS} sequence`}),
  literal: factory(SPAN, {className: `${CLASS} literal`}),
  indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
  comment: factory(SPAN, {className: `${CLASS} comment`}),
  code: factory(SPAN, {className: `${CLASS}`}),
});

export { renderers, renderer, render, supported, native$1 as native, Element$2 as Element, Text$2 as Text, Fragment, Template };
//# sourceMappingURL=dom.mjs.map
