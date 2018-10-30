/// OPTIONS
const HTML_MODE = true;
const NESTED_MODE = false;
const SPAN = 'span';
const SLOT = 'slot';
const CLASS = 'markup';

/// INTERFACE

export const renderers = {};

export function* renderer(tokens, tokenRenderers = renderers) {
  for (const token of tokens) {
    const {type = 'text', text, punctuator} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    element && (yield element);
  }
}

// TODO: See how to wire nester with renderer
export function* nester(elements) {
  let parent, root;
  root = parentElement = Element(SLOT, {className: CLASS});
  for (const element of elements) {
    const token = element.token;
    parent = token.parent || undefined;
    parentElement = (parent && parent.element) || root;
    parentElement.appendChild(element);
  }
  yield root;
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

const createElement = (tag, properties, ...children) => {
  const element = document.createElement(tag);

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
};

const createHTML = (tag, properties, ...children) => {
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
    }
  };

  if (children.length) element.children = children;

  return element;
};

// const Element = createHTML;
const Element = !HTML_MODE && supported ? createElement : createHTML;
const Text =
  Element === createElement
    ? (content = '') => document.createTextNode(content)
    : (content = '') =>
        String(content).replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`);

const factory = (tag, properties) => (content, token) => {
  const textual = typeof content === 'string';
  const element =
    (content && Element(tag, properties, (textual && Text(content)) || content)) || undefined;

  token &&
    (token.form && (element.className += ` maybe-${token.form}`),
    token.hint && (element.className += ` ${token.hint}`),
    element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  // whitespace: factory(TAG, {className: `${CLASS} whitespace`}),
  whitespace: Text,
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
