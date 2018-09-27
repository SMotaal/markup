import {defaults} from './markup.js';

export const Element = (tag, properties, ...children) => {
  const element = document.createElement(tag);

  properties && Object.assign(element, properties);
  children.length && element.append(...children);
  return element;
};

export const Text = (content = '') => new (window.Text || String)(content);

export const factory = (tag, properties) => (content, token) => {
  const textual = typeof content === 'string';
  const element =
    (content &&
      Element(tag, properties, (textual && Text(content)) || content)) ||
    undefined;

  (token) && (
    token.hint && (element.classList += ` ${token.hint}`),
    element && (element.token = token)
  );

  return element;
};
defaults.renderers = {
  ...defaults.renderers,
  variable: factory('var', {className: 'markup variable'}),
  keyword: factory('span', {className: 'markup keyword'}),
  whitespace: factory('span', {className: 'markup whitespace'}),
  operator: factory('span', {className: 'markup punctuator operator'}),
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
  // text: Text,
};
