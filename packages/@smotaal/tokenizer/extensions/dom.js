import * as dom from '../../../pseudom/pseudom.js';
export {encodeEntity, encodeEntities} from '../../../pseudom/pseudom.js';
import {each} from './resync.js';

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/** Uses lightweight proxy objects that can be serialized into HTML text */
const HTML_MODE = true;
/// INTERFACE

export const renderers = {};

export function* renderer(tokens, tokenRenderers = renderers) {
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

export async function render(tokens, fragment) {
  let logs, template, first, elements;
  try {
    fragment || (fragment = Fragment());
    logs = fragment.logs; // || (fragment.logs = []);
    elements = renderer(tokens);
    if ((first = await elements.next()) && 'value' in first) {
      template = Template();
      if (!native && template && 'textContent' in fragment) {
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

export const supported = !!dom.native;
export const native = !HTML_MODE && supported;
const implementation = native ? dom.native : dom.pseudo;
export const {createElement: Element, createText: Text, createFragment: Fragment} = implementation;
export const Template = template =>
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
  typeof content !== 'string' || (content = Text(content));
  const element = Element(tag, properties, content);
  element && token && (token.hint && (element.className += ` ${token.hint}`));
  return element;
};

Object.assign(renderers, {
  whitespace: Text,
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
