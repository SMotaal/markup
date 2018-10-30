/// OPTIONS
const HTML_MODE = true;
const NESTED_MODE = false;
const SPAN = 'span';
const SLOT = 'slot';
const CLASS = 'markup';

/// INTERFACE

export const renderers = {};

export async function* renderer(tokens, tokenRenderers = renderers) {
  const parents = [];
  const stack = [];
  for await (const token of tokens) {
    const {type = 'text', text, punctuator, parent} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    try {
      element && (token.element = element);
      if (parent) {
        if (parents.length === 0) {
          parents.push((parents.current = parents.top = token));
        } else if (parent === parents.top) {
          element && stack.push(element);
        } else if (parent === parents.current) {
          element && parents.current.element.appendChild(element);
        } else {
          parents.includes(parent)
            ? parents.splice(parents.indexOf(parent) + 1, parents.length)
            : parent.parent &&
              parent.parent !== parent &&
              parents.includes(parent.parent) &&
              parents.splice(parents.indexOf(parent.parent), parents.length, parent);
          // while((next = next.parent)) index = parents.indexOf(next);
          parents.current = parents[parents.length - 1];
          if (parents.current === parent.top && stack.length) {
            yield* stack.splice(0, stack.length);
          }
        }
      } else {
        throw Error('Unparented!');
      }
    } catch (exception) {
      console.error(exception, parents);
    }

    // element && (
    //   parents.current === parents.top ? (yield element) : parents.current.append(element)
    // );
    // element && (yield element);
  }

  if (stack.length) {
    yield* stack.splice(0, stack.length);
  }
}

// TODO: See how to wire nester with renderer
export function* nester(elements) {
  // let parent, root;
  // root = parentElement = Element(SLOT, {className: CLASS});
  // for (const element of elements) {
  //   const token = element.token;
  //   parent = token.parent || undefined;
  //   parentElement = (parent && parent.element) || root;
  //   parentElement.appendChild(element);
  // }
  // yield root;
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

const constructor = Class =>
  new Proxy(Class, {
    apply: (target, thisArg, args) => new Class(args),
  });

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

const html = {
  document: undefined,

  createElement: (tag, properties, ...children) => {
    const {className = ''} = properties || none;
    const element = {
      tag,
      className,
      properties,
      children,

      append(...elements) {
        // for (const element of elements) element.parentElement = element.parentNode = this;
        this.children.push(...elements);
      },

      appendChild(element) {
        this.children.push(element);
        return element;
      },

      toString() {
        const {tag, className, children = none, properties} = this;
        const classes = className ? `class="${className}"` : '';
        const attributes = `${classes}`.trim();

        return `<${tag}${attributes ? ` ${attributes}` : ''}>${
          children.length > 0 ? children.join('') : ''
        }</${tag}>`;
      },

      toJSON() {
        return this.toString();
      },
    };

    if (children.length) element.children = children;

    return element;
  },

  Text: class Text extends String {}, //constructor(),

  createText: (content = '') =>
    new html.Text(content).replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`),

  Fragment: class DocumentFragment extends Array {}, // constructor(),

  createFragment: () => new html.Fragment(),
};

const api = !HTML_MODE && supported ? dom : html;
// const target = api.document;

export const {createElement, createText, createFragment} = api;
// export {target as document};

const factory = (tag, properties) => (content, token) => {
  const textual = typeof content === 'string';
  const element =
    (content && createElement(tag, properties, (textual && createText(content)) || content)) ||
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

// const Element = createHTML;
// const Element = !HTML_MODE && supported ? createElement : createHTML;
// const createText =
//   Element === createElement
//     ? (content = '') => document.createTextNode(content)
//     : (content = '') =>
//         String(content).replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`);

// const createFragment =
//   (Element === createElement &&
//     document.createDocumentFragment &&
//     (() => document.createDocumentFragment())) ||
//   Array;

// export const Fragment = content => {
//   const fragment = createFragment();

//   if (content) {

//   }
// }

// /// SCOPE
// const scope =
//   // Browser Scope
//   ('object' === typeof self && self === (self || 0).self && self) ||
//   // Node.js Scope
//   ('object' === typeof global && global === (global || 0).global && global) ||
//   // Unknown Scope
//   Object.create(null, {[Symbol.toStringTag]: {value: 'UnknownScope'}});
