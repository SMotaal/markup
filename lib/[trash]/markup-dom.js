import * as dom from '../packages/pseudom/index.js';

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
    const {type = 'text', text, punctuator, breaks} = token;
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

  element && token && (token.hint && (element.className += ` ${token.hint}`));
  // token.breaks && (element.breaks = token.breaks),
  // token &&
  // (token.form && (element.className += ` maybe-${token.form}`),
  // token.hint && (element.className += ` ${token.hint}`),
  // element && (element.token = token));

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
  indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
  comment: factory(SPAN, {className: `${CLASS} comment`}),
  code: factory(SPAN, {className: `${CLASS}`}),
});
