import * as dom from '../packages/pseudom/dom.js';

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/**
 * Intended to prevent unpredictable DOM related overhead by rendering elements
 * using lightweight proxy objects that can be serialized into HTML text.
 */
const HTML_MODE = true;
/// INTERFACE

export const renderers = {};

export async function* renderer(tokens, tokenRenderers = renderers) {
  for await (const token of tokens) {
    const {type = 'text', text, punctuator} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    element && (yield element);
  }
}

export const install = (defaults, newRenderers = defaults.renderers || {}) => {
  Object.assign(newRenderers, renderers);
  defaults.renderers === newRenderers || (defaults.renderers = newRenderers);
  defaults.renderer = renderer;
};

export const supported = !!dom.native;
export const native = !HTML_MODE && supported;
const implementation = native ? dom.native : dom.pseudo;
export const {createElement, createText, createFragment} = implementation;

/// IMPLEMENTATION
const factory = (tag, properties) => (content, token) => {
  if (!content) return;
  typeof content !== 'string' || (content = createText(content));
  const element = createElement(tag, properties, content);

  token &&
    (token.form && (element.className += ` maybe-${token.form}`),
    token.hint && (element.className += ` ${token.hint}`),
    element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  // whitespace: factory(SPAN, {className: `${CLASS} whitespace`}),
  whitespace: createText,
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
  comment: factory(SPAN, {className: `${CLASS} comment`}),
});

// const none = Object.freeze(Object.create(null));

// const dom = {
//   document: (supported && document) || undefined,

//   createElement: (tag, properties, ...children) => {
//     const element = dom.document.createElement(tag);
//     properties && Object.assign(element, properties);
//     if (!children.length) return element;
//     if (element.append) {
//       while (children.length > 500) element.append(...children.splice(0, 500));
//       children.length && element.append(...children);
//     } else if (element.appendChild) {
//       for (const child of children) element.appendChild(child);
//     }
//     return element;
//   },

//   createText: (content = '') => dom.document.createTextNode(content),

//   createFragment: () => dom.document.createDocumentFragment(),
// };

// const html = pseudom;
// const html = (() => {
//   const {assign, defineProperty, freeze, getOwnPropertyDescriptors} = Object;

//   const document = void 0;

//   class Node {
//     get children() {
//       const value = new Set();
//       defineProperty(this, 'children', {value});
//       return value;
//     }

//     get childElementCount() {
//       return (this.hasOwnProperty('children') && this.children.size) || 0;
//     }

//     get textContent() {
//       return (this.childElementCount && [...this.children].join('')) || '';
//     }

//     set textContent(text) {
//       this.childElementCount && this.children.clear();
//       text && this.children.add(new String(text));
//     }

//     appendChild(element) {
//       return element && this.children.add(element), element;
//     }

//     append(...elements) {
//       if (!elements.length) return;
//       for (const element of elements) element && this.children.add(element);
//     }

//     removeChild(element) {
//       element && this.childElementCount && this.children.delete(element);
//       return element;
//     }

//     remove(...elements) {
//       if (!elements.length || !this.childElementCount) return;
//       for (const element of elements) element && this.children.delete(element);
//     }
//   }

//   class Element extends Node {
//     get innerHTML() {
//       return this.textContent;
//     }

//     set innerHTML(text) {
//       this.textContent = text;
//     }

//     get outerHTML() {
//       const {className, tag, innerHTML} = this;
//       return `<${tag}${(className && ` class="${className}"`) || ''}>${innerHTML || ''}</${tag}>`;
//     }

//     toString() {
//       return this.outerHTML;
//     }

//     toJSON() {
//       return this.toString();
//     }
//   }

//   // class DocumentFragment extends Array {}
//   class DocumentFragment extends Node {
//     toString() {
//       return this.textContent;
//     }

//     toJSON() {
//       return (this.childElementCount && [...this.children]) || [];
//     }

//     [Symbol.iterator]() {
//       return ((this.childElementCount && this.children) || '')[Symbol.iterator]();
//     }
//   }

//   class Text extends String {
//     toString() {
//       return encodeEntities(super.toString());
//     }
//   }

//   const createElement = (tag, properties, ...children) => {
//     const element = assign(new Element(), {
//       tag,
//       className: (properties && properties.className) || '',
//       properties,
//     });
//     children.length && defineProperty(element, 'children', {value: new Set(children)});
//     return element;
//   };

//   const createText = (content = '') => new Text(content);

//   const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;
//   const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/gim, encodeEntity);

//   const createFragment = () => new DocumentFragment();

//   const dom = {document, createElement, createFragment, createText};

//   return Object.create(null, {
//     [Symbol.toPrimitive]: {value: 'MarkupOM'},
//     Element: {get: () => Element},
//     DocumentFragment: {get: () => DocumentFragment},
//     Text: {get: () => Text},
//     ...getOwnPropertyDescriptors(freeze(dom)),
//   });
// })();

// export const native = !HTML_MODE && supported;

// const implementation = native ? dom : html;

// export const {createElement, createText, createFragment} = implementation;

// const mixin = (Class, Mixin) => {
//   const prototype = Class.prototype;
//   const mixin = Mixin.prototype;
//   const descriptors = getOwnPropertyDescriptors(mixin);
//   const ownDescriptors = getOwnPropertyDescriptors(mixin);
//   for (const [property, descriptor] in entries(descriptors)) {
//     property in ownDescriptors &&
//       ownDescriptors[property].configurable === false &&
//       delete descriptors[property];
//   }
//   defineProperties(prototype, descriptors);
//   return Class;
// };

// defineProperties(Node.prototype, {
//   add: {value: undefined},
//   delete: {value: undefined},
//   clear: {value: undefined},
// });
// const {add: append, delete: remove, clear} = Set.prototype;

// defineProperty(
//   Element.prototype,
//   'innerHTML',
//   getOwnPropertyDescriptor(Node.prototype, 'textContent'),
// );
