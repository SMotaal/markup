/// INTERFACE

export const renderers = {};

export const install = defaults =>
  Object.assign(defaults.renderers || (defaults.renderers = {}), renderers);

export const supported =
  typeof document === 'object' && typeof document.createElement === 'function';

/// IMPLEMENTATION
const Element = (tag, properties, ...children) => {
  const element = document.createElement(tag);

  properties && Object.assign(element, properties);
  children.length && element.append(...children);
  return element;
};

const Text = (content = '') => new (window.Text || String)(content);

const factory = (tag, properties) => (content, token) => {
  const textual = typeof content === 'string';
  const element =
    (content && Element(tag, properties, (textual && Text(content)) || content)) || undefined;

  token &&
    (token.hint && (element.classList += ` ${token.hint}`), element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  variable: factory('var', {className: 'markup variable'}),
  keyword: factory('span', {className: 'markup keyword'}),
  whitespace: factory('span', {className: 'markup whitespace'}),
  operator: factory('span', {className: 'markup punctuator operator'}),
  combinator: factory('span', {className: 'markup punctuator combinator'}),
  quote: factory('span', {className: 'markup punctuator quote'}),
  breaker: factory('span', {className: 'markup punctuator breaker'}),
  opener: factory('span', {className: 'markup punctuator opener'}),
  closer: factory('span', {className: 'markup punctuator closer'}),
  span: factory('span', {className: 'markup punctuator span'}),
  punctuation: factory('span', {className: 'markup punctuator punctuation'}),
  sequence: factory('span', {className: 'markup sequence'}),
  literal: factory('span', {className: 'markup literal'}),
  comment: factory('span', {className: 'markup comment'}),
  text: factory('span', {className: 'markup'}),
});

// import * as dom from './markup-dom.js';
// export default dom;

// import * as markup from './markup.js';

// export const install = (defaults) => (defaults.renderers = {...defaults.renderers, ...renderers});
