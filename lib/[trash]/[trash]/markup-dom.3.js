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

export const supported =
  typeof document === 'object' && document !== null && typeof document.createElement === 'function';

/// IMPLEMENTATION
const none = Object.freeze(Object.create(null));

const dom = {
  document: (supported && document) || undefined,

  createElement: (tag, properties, ...children) => {
    const element = dom.document.createElement(tag);

    properties && Object.assign(element, properties);

    if (children.length) {
      if (element.append) {
        while (children.length > 500) element.append(...children.splice(0, 500));
        children.length && element.append(...children);
      } else if (element.appendChild) {
        for (const child of children) element.appendChild(child);
      }
    }

    return element;
  },

  createText: (content = '') => dom.document.createTextNode(content),

  createFragment: () => dom.document.createDocumentFragment(),
};

const html = (() => {
  const {defineProperties, entries, freeze, getOwnPropertyDescriptors} = Object;

  const {add: append, delete: remove, clear} = Set.prototype;

  const mixin = (Class, Mixin) => {
    const prototype = Class.prototype;
    const mixin = Mixin.prototype;
    const descriptors = getOwnPropertyDescriptors(mixin);
    const ownDescriptors = getOwnPropertyDescriptors(mixin);
    for (const [property, descriptor] in entries(descriptors)) {
      property in ownDescriptors &&
        ownDescriptors[property].configurable === false &&
        delete descriptors[property];
    }
    defineProperties(prototype, descriptors);
    return Class;
  };

  const document = void 0;

  class Node extends Set {
    get textContent() {
      return `${this}`;
    }

    set textContent(text) {
      clear.call(this);
      text && append.call(this, new String(text));
    }

    appendChild(element) {
      // element &&
      //   (element.parentElement &&
      //     element.parentElement.removeChild &&
      //     element.parentElement.removeChild(element),
      //   'parentElement' in element && (element.parentElement = this),
      //   super.add(element));
      return element && super.add(element), element;
    }

    append(...elements) {
      for (const element of elements) element && this.appendChild(element);
    }

    removeChild(element) {
      // element &&
      //   super.delete(element) &&
      //   'parentElement' in element &&
      //   (element.parentElement = undefined);
      return super.delete(element), element;
    }

    remove(...elements) {
      if (this.size) for (const element of elements) super.delete(element);
      // element &&
      //   this.delete(element) &&
      //   'parentElement' in element &&
      //   (element.parentElement = undefined);
    }
  }

  // const appendChild = Function.call.bind(Node.prototype.appendChild);

  defineProperties(Node.prototype, {
    add: {value: undefined},
    delete: {value: undefined},
    clear: {value: undefined},
  });

  class Element extends Node {
    get innerHTML() {
      return this.textContent;
    }

    set innerHTML(text) {
      this.textContent = text;
    }

    toString() {
      const {tag, className, children, properties} = this;
      const classes = className ? `class="${className}"` : '';
      const attributes = `${classes}`.trim();
      return `<${tag}${attributes ? ` ${attributes}` : ''}>${
        children && children.length > 0 ? children.join('') : ''
      }</${tag}>`;
    }

    toJSON() {
      return this.toString();
    }
  }

  // class DocumentFragment extends Array {}
  class DocumentFragment extends Element {
    toString() {
      return [...this].join('');
    }

    toJSON() {
      return [...this];
    }
  }

  class Text extends String {
    toString() {
      return super.toString().replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`);
    }
  }

  const createElement = (tag, properties, ...children) => {
    const {className = ''} = properties || none;
    const element = Object.assign(new Element(), {
      tag,
      className,
      properties,
      children,
    });
    return element;
  };

  const createText = (content = '') => new Text(content);
    // new Text(`${content}`.replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`));

  const createFragment = () => new DocumentFragment();

  // Element, Text, DocumentFragment,

  const dom = {createElement, createFragment, createText}; // document,

  return Object.create(null, {
    [Symbol.toPrimitive]: {value: 'MarkupOM'},
    ...getOwnPropertyDescriptors(freeze(dom)),
  });
})();

// const html = {
// Text: class Text extends String {},

// Fragment: class DocumentFragment extends Array {},

// Element: class Element {
//   append(...elements) {
//     // (this.children || (this.children = [])).push(...elements);
//   }

//   appendChild(element) {
//     return (this.children || (this.children = [])).push(element), element;
//   }

//   toString() {
//     const {tag, className, children, properties} = this;
//     const classes = className ? `class="${className}"` : '';
//     const attributes = `${classes}`.trim();
//     return `<${tag}${attributes ? ` ${attributes}` : ''}>${
//       children && children.length > 0 ? children.join('') : ''
//     }</${tag}>`;
//   }

//   toJSON() {
//     return this.toString();
//   }
// },

// document: undefined,

// createElement: (tag, properties, ...children) => {
//   const {className = ''} = properties || none;
//   const element = Object.assign(new html.Element(), {
//     tag,
//     className,
//     properties,
//     children,
//   });
//   return element;
// },

// createText: (content = '') =>
//   new html.Text(content).replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`),

// createFragment: () => new html.Fragment(),
// };

const implementation = !HTML_MODE && supported ? dom : html;

export const {createElement, createText, createFragment} = implementation;

const factory = (tag, properties) => (content, token) => {
  const element =
    (content &&
      createElement(
        tag,
        properties,
        (typeof content === 'string' && createText(content)) || content,
      )) ||
    undefined;

  token &&
    (token.form && (element.className += ` maybe-${token.form}`),
    token.hint && (element.className += ` ${token.hint}`),
    element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  // whitespace: factory(TAG, {className: `${CLASS} whitespace`}),
  whitespace: createText,
  // text: Text,
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
