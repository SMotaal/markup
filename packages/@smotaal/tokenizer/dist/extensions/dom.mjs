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

const native = document$2 && dom;

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/** Uses lightweight proxy objects that can be serialized into HTML text */
const HTML_MODE = true;
/// INTERFACE

const renderers = {};

async function* renderer(tokens, tokenRenderers = renderers) {
  for await (const token of tokens) {
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
    fragment || (fragment = createFragment$3());
    logs = fragment.logs || (fragment.logs = []);
    elements = renderer(tokens);
    if ((first = await elements.next()) && 'value' in first) {
      template = createTemplate();
      if (!native$1 && template && 'textContent' in fragment) {
        logs.push(`render method = 'text' in template`);
        const body = [first.value];
        // const body = [first.value, ... elements];
        if (!first.done) for await (const element of elements) body.push(element);
        template.innerHTML = body.join('');
        fragment.appendChild(template.content);
      } else if ('push' in fragment) {
        logs.push(`render method = 'push' in fragment`);
        fragment.push(first.value);
        if (!first.done) for await (const element of elements) fragment.push(element);
      } else if ('append' in fragment) {
        logs.push(`render method = 'append' in fragment`);
        fragment.append(first.value);
        if (!first.done) for await (const element of elements) fragment.append(element);
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
const {createElement: createElement$3, createText: createText$3, createFragment: createFragment$3} = implementation;
const createTemplate = template =>
  !supported || createTemplate.supported === false
    ? false
    : createTemplate.supported === true
    ? document.createElement('template')
    : (createTemplate.supported = !!(
        (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
      )) && template;

/// RENDERERS
const factory = (tag, properties) => (content, token) => {
  if (!content) return;
  typeof content !== 'string' || (content = createText$3(content));
  const element = createElement$3(tag, properties, content);
  element && token && (token.hint && (element.className += ` ${token.hint}`));
  return element;
};

Object.assign(renderers, {
  whitespace: createText$3,
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

export { renderers, renderer, render, supported, native$1 as native, createElement$3 as createElement, createText$3 as createText, createFragment$3 as createFragment, createTemplate };
//# sourceMappingURL=dom.mjs.map
