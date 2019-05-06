import * as pseudom from '../../pseudom/pseudom.js';
export {encodeEntity, encodeEntities} from '../../pseudom/pseudom.js';
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

    const {SPAN = 'span', LINE = 'span', CLASS = 'markup'} = {
      ...defaults,
      ...options,
    };

    this.renderers = {
      line: factory(LINE, {className: `${CLASS} ${CLASS}-line`}),
      // indent: factory(SPAN, {className: `${CLASS} ${CLASS}-indent whitespace`}),
      inset: factory(SPAN, {className: `${CLASS} inset whitespace`}),
      break: factory(SPAN, {className: `${CLASS} break whitespace`}),
      // break: Text,
      // whitespace: factory(SPAN, {className: `${CLASS} whitespace`}),
      whitespace: Text,
      text: factory(SPAN, {className: CLASS}),

      // variable: factory('var', {className: `${CLASS} variable`}),
      fault: factory(SPAN, {className: `${CLASS} fault`}),
      keyword: factory(SPAN, {className: `${CLASS} keyword`}),
      identifier: factory(SPAN, {className: `${CLASS} identifier`}),
      quote: factory(SPAN, {className: `${CLASS} quote`}),

      operator: factory(SPAN, {className: `${CLASS} punctuator operator`}),
      assigner: factory(SPAN, {className: `${CLASS} punctuator operator assigner`}),
      combinator: factory(SPAN, {className: `${CLASS} punctuator operator combinator`}),
      punctuation: factory(SPAN, {className: `${CLASS} punctuator punctuation`}),

      breaker: factory(SPAN, {className: `${CLASS} punctuator breaker`}),
      opener: factory(SPAN, {className: `${CLASS} punctuator opener`}),
      closer: factory(SPAN, {className: `${CLASS} punctuator closer`}),
      span: factory(SPAN, {className: `${CLASS} punctuator span`}),
      sequence: factory(SPAN, {className: `${CLASS} sequence`}),
      literal: factory(SPAN, {className: `${CLASS} literal`}),
      // indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
      comment: factory(SPAN, {className: `${CLASS} comment`}),
      fault: factory(SPAN, {className: `${CLASS} fault`}),
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
    let renderedLine, Inset, lineInset, lineText, insetHint;
    // let line, indent, trim, tabSpan;
    const blank = renderers.line();
    const emit = (renderer, text, type, hint, flatten) => {
      flatten && renderedLine.lastChild && renderer === renderedLine.lastChild.renderer
        ? renderedLine.lastChild.appendChild(Text(text))
        : renderedLine.appendChild((renderedLine.lastChild = renderer(text, hint || type))).childElementCount &&
          (renderedLine.lastChild.renderer = renderer);
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint, false);
    const Lines = /^/gm;
    for (const token of tokens) {
      let {type = 'text', text, inset, punctuator, breaks, hint} = token;
      let renderer =
        (punctuator && (renderers[punctuator] || renderers.operator)) ||
        (type && renderers[type]) ||
        (type !== 'whitespace' && type !== 'break' && renderers.text) ||
        Text;

      if (!text) continue;

      // Create new line
      renderedLine || (renderedLine = renderers.line());

      const flatten = !punctuator && type !== 'fault' && type !== 'opener' && type !== 'closer' && type !== 'break';

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (breaks && type !== 'break') {
        Inset = void (inset = inset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const line of text.split(Lines)) {
          renderedLine || (renderedLine = renderers.line());
          (lineInset = line.startsWith(inset)
            ? line.slice(0, inset.length)
            : line.match(Inset || (Inset = RegExp(`^${inset.replace(/./g, '$&?')}`)))[0]) &&
            emitInset(lineInset, insetHint);
          (lineText = lineInset ? line.slice(lineInset.length) : line) &&
            (emit(renderer, lineText, type, hint, flatten),
            lineText.endsWith('\n') && (yield renderedLine, (renderedLine = null)));
        }
        // console.log(lines);
        // emit(renderer, text, type, hint, punctuator);
      } else {
        emit(renderer, text, type, hint, flatten);
        type === 'break' && (yield renderedLine, (renderedLine = null));
      }

      // Strip trailing whitespace
      // !punctuator && type !== 'opener' && type !== 'closer' && line.lastChild && renderer === line.lastChild.renderer
      //   ? line.lastChild.appendChild(Text(text))
      //   : line.appendChild((line.lastChild = renderer(text, hint))).childElementCount &&
      //     (line.lastChild.renderer = renderer);

      // TODO: Normalize multiple line breaks
      // breaks && (yield line, --breaks && (yield* Array(breaks).fill(blank)), (line = null));
    }
    renderedLine && (yield renderedLine);
  }

  static factory(tag, properties) {
    return (content, hint) => {
      typeof content === 'string' && (content = Text(content));
      const element = content != null ? Element(tag, properties, content) : Element(tag, properties);
      // element &&
      //   (element.className = [...new Set(`${element.className || ''} ${hint || ''}`.trim().split(/\s+/g))].join(' '));
      element && typeof hint === 'string' && (element.className = `${element.className || ''} ${hint}`);
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
});

/// INTERFACE

export default new MarkupRenderer();
