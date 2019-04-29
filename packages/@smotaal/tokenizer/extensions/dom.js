import * as pseudom from '../../../pseudom/pseudom.js';
export {encodeEntity, encodeEntities} from '../../../pseudom/pseudom.js';
import {each} from './helpers.js';

/// RUNTIME

/** Uses lightweight proxy objects that can be serialized into HTML text */
const HTML_MODE = true;

const supported = !!pseudom.native;
const native = !HTML_MODE && supported;
const implementation = native ? pseudom.native : pseudom.pseudo;
const {createElement: Element, createText: Text, createFragment: Fragment} = implementation;
const Template = template =>
  !supported || Template.supported === false
    ? false
    : Template.supported === true
    ? document.createElement('template')
    : (Template.supported = !!(
        (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
      )) && template;

/// IMPLEMENTATION

class MarkupRenderer {
  constructor(options) {
    // TODO: Consider making Renderer a thing
    const {factory, defaults} = new.target;

    const {SPAN = 'span', LINE = 'span', CLASS = 'markup', LINE_INDENTS, LINE_REINDENTS} = {
      ...defaults,
      ...options,
    };

    this.LINE_INDENTS =
      LINE_INDENTS != null
        ? !!LINE_INDENTS
        : !defaults || defaults.LINE_INDENTS == null
        ? false
        : !!defaults.LINE_INDENTS;

    this.LINE_REINDENTS =
      LINE_REINDENTS != null
        ? !!LINE_REINDENTS
        : !defaults || defaults.LINE_REINDENTS == null
        ? false
        : !!defaults.LINE_REINDENTS;

    this.renderers = {
      line: factory(LINE, {className: `${CLASS} ${CLASS}-line`}),
      indent: factory(LINE, {className: `${CLASS} whitespace ${CLASS}-indent`}),

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
      // indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
      comment: factory(SPAN, {className: `${CLASS} comment`}),
      code: factory(SPAN, {className: `${CLASS}`}),
    };
  }

  async render(tokens, fragment) {
    let logs, template, first, elements;
    try {
      fragment || (fragment = Fragment());
      logs = fragment.logs; // || (fragment.logs = []);
      elements = this.renderer(tokens);
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

  *renderer(tokens) {
    const {renderers, LINE_INDENTS, LINE_REINDENTS} = this;
    let line, indent, trim;
    let tabSpan;
    const blank = renderers.line();
    for (const token of tokens) {
      let {type = 'text', text, punctuator, breaks, hint} = token;
      let renderer =
        (punctuator && (renderers[punctuator] || renderers.operator)) ||
        (type && renderers[type]) ||
        (text && renderers.text);

      line ||
        // Create new line
        ((line = renderers.line()),
        // Concatenate stripped and leading whitesp into a separate "indent" tokenace
        LINE_INDENTS &&
          // ((indent = `${indent || ''}${text.slice(0, text.indexOf((trim = text.trimLeft())))}`), (text = trim)),
          (([, indent = '', text = ''] = /^([ \t]*)([^]*)$/.exec(`${indent || ''}${text}`)),
          indent &&
            (LINE_REINDENTS &&
              (tabSpan ||
                (([tabSpan] = /^(?: {4}| {2}|)/.exec(indent)) &&
                  tabSpan &&
                  (tabSpan = new RegExp(`${tabSpan}`, 'g')))) &&
              (indent = indent.replace(tabSpan, '\t')),
            indent && (indent = (line.append(renderers.indent(indent)), '')))));

      text &&
        // Strip trailing whitespace
        (LINE_INDENTS && breaks && ([text, indent = ''] = text.split(/([ \t]*$)/, 2)),
        text && line.appendChild(renderer(text, hint)));

      // TODO: Normalize multiple line breaks
      breaks && (yield line, --breaks && (yield* Array(breaks).fill(blank)), (line = null));
    }
    line && (yield line);
  }

  static factory(tag, properties) {
    return (content, hint) => {
      typeof content === 'string' && (content = Text(content));
      const element = Element(tag, properties, content);
      element && typeof hint === 'string' && (element.className += ` ${hint}`);
      return element;
    };
  }
}

MarkupRenderer.defaults = Object.freeze({
  /** Tag name of the element to use for rendering a token. */
  SPAN: 'span',
  /** Tag name of the element to use for grouping tokens in a single line. */
  LINE: 'span',
  /** The class name of the element to use for rendering a token. */
  CLASS: 'markup',
  /** Concatenates leading whitespace into a separate "indent" token */
  LINE_INDENTS: false,
  /** Replaces uniform leading spaces with tabs based on first indent size */
  LINE_REINDENTS: false,
});

/// INTERFACE

export default new MarkupRenderer();
