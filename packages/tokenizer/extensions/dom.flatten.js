import * as pseudom from '../../pseudom/pseudom.js';
export {encodeEntity, encodeEntities} from '../../pseudom/helpers.js';
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

    const {SPAN = 'span', LINE = 'span', CLASS = 'markup', FLATTEN = true, REFLOW = true} = {
      ...defaults,
      ...options,
    };

    const UNFLATTEN = 'unflatten';

    this.renderers = {
      line: factory(LINE, {className: `${CLASS} ${CLASS}-line`}),
      // indent: factory(SPAN, {className: `${CLASS} ${CLASS}-indent whitespace`}),
      inset: factory(SPAN, {className: `${CLASS} inset whitespace`}, UNFLATTEN),
      break: factory(SPAN, {className: `${CLASS} break whitespace`}, UNFLATTEN),
      // break: Text,
      // whitespace: factory(SPAN, {className: `${CLASS} whitespace`}),
      whitespace: Text,
      text: factory(SPAN, {className: CLASS}),

      // variable: factory('var', {className: `${CLASS} variable`}),
      fault: factory(SPAN, {className: `${CLASS} fault`}, UNFLATTEN),
      keyword: factory(SPAN, {className: `${CLASS} keyword`}, UNFLATTEN),
      identifier: factory(SPAN, {className: `${CLASS} identifier`}),
      quote: factory(SPAN, {className: `${CLASS} quote`}, FLATTEN),

      operator: factory(SPAN, {className: `${CLASS} punctuator operator`, UNFLATTEN}, UNFLATTEN),
      assigner: factory(SPAN, {className: `${CLASS} punctuator operator assigner`}, UNFLATTEN),
      combinator: factory(SPAN, {className: `${CLASS} punctuator operator combinator`}, UNFLATTEN),
      punctuation: factory(SPAN, {className: `${CLASS} punctuator punctuation`}, UNFLATTEN),

      breaker: factory(SPAN, {className: `${CLASS} punctuator breaker`}, UNFLATTEN),
      opener: factory(SPAN, {className: `${CLASS} punctuator opener`}, UNFLATTEN),
      closer: factory(SPAN, {className: `${CLASS} punctuator closer`}, UNFLATTEN),
      span: factory(SPAN, {className: `${CLASS} punctuator span`}),
      pattern: factory(SPAN, {className: `${CLASS} pattern`}),
      sequence: factory(SPAN, {className: `${CLASS} sequence`}),
      literal: factory(SPAN, {className: `${CLASS} literal`}, UNFLATTEN),
      // indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
      comment: factory(SPAN, {className: `${CLASS} comment`}),
      // code: factory(SPAN, {className: `${CLASS}`}),
    };

    this.flattens = FLATTEN;
    this.reflows = REFLOW;
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
    const {renderers, flattens, reflows} = this;
    let renderedLine, Inset, normalizedLineInset, normalizedLineText, lineBreak, insetHint;
    // let line, indent, trim, tabSpan;
    // const blank = renderers.line();
    const emit = (renderer, text, type, hint, flatten) => {
      flatten && renderedLine.lastChild && renderer === renderedLine.lastChild.renderer
        ? renderedLine.lastChild.appendChild(Text(text))
        : renderedLine.appendChild((renderedLine.lastChild = renderer(text, hint || type))).childElementCount &&
          (renderedLine.lastChild.renderer = renderer);
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint, false);
    const Lines = /^/gm;
    const LineBreak = /\r?\n$/;
    for (const token of tokens) {
      if (!token || !token.text) continue;

      let {type = 'text', text, lineInset, punctuator, lineBreaks, hint, flatten} = token;
      let renderer =
        (punctuator && (renderers[punctuator] || (type && renderers[type]) || renderers.operator)) ||
        // (punctuator && (renderers[punctuator] ? ((type = punctuator), renderers[punctuator]) : renderers.operator)) ||
        (type && renderers[type]) ||
        (type !== 'whitespace' && type !== 'break' && renderers.text) ||
        Text;

      // Create new line
      // renderedLine || (renderedLine = renderers.line());
      renderedLine || (renderedLine = renderers.line('', (!reflows && 'no-reflow') || ''));

      // flattens && flatten == null && (flatten = renderer.flatten || false);
      flatten == null && (flatten = flattens && renderer.flatten);
      // ({flatten = /fault|opener|closer|break|operator|combinator|whitespace|break|inset/.test(text)} = renderer);

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (lineBreaks && type !== 'break') {
        // reflows &&
        Inset = void (lineInset = lineInset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const line of text.split(Lines)) {
          renderedLine || (renderedLine = renderers.line());
          (normalizedLineInset = line.startsWith(lineInset)
            ? line.slice(0, lineInset.length)
            : line.match(Inset || (Inset = RegExp(`^${lineInset.replace(/./g, '$&?')}`)))[0]) &&
            emitInset(normalizedLineInset, insetHint);

          (normalizedLineText = normalizedLineInset ? line.slice(normalizedLineInset.length) : line) &&
            ((normalizedLineText === '\n'
              ? ((lineBreak = normalizedLineText), (normalizedLineText = ''))
              : normalizedLineText.endsWith('\n')
              ? ((lineBreak = '\n'),
                (normalizedLineText = normalizedLineText.slice(0, normalizedLineText.endsWith('\r\n') ? -2 : -1)))
              : !(lineBreak = '')) && emit(renderer, normalizedLineText, type, hint, flatten),
            lineBreak &&
              (emit(renderers.break, lineBreak, type, hint, false), yield renderedLine, (renderedLine = null)));
        }
      } else {
        // reflow && (hint += ' no-reflow');
        emit(renderer, text, type, hint, flatten); //
        type === 'break' && (yield renderedLine, (renderedLine = null));
      }
    }
    renderedLine && (yield renderedLine);
  }

  /**
   * @param {string} tag
   * @param {Partial<HTMLElement>} [properties]
   * @param {boolean} [unflattened]
   */
  static factory(tagName, elementProperties, flattening) {
    const [tag, properties] = arguments;
    return Object.defineProperties(
      (content, hint) => {
        typeof content === 'string' && (content = Text(content));
        const element = content != null ? Element(tag, properties, content) : Element(tag, properties);
        element &&
          (hint = typeof hint === 'string' && (element.className = `${element.className || ''} ${hint}`)) &&
          (element.dataset = {hint: hint.slice(6)});
        return element;
      },
      {
        flatten: {
          value: !arguments[2] || (/\bunflatten\b/i.test(arguments[2]) ? false : /\bflatten\b/i.test(arguments[2])),
        },
      },
    );
  }
}

MarkupRenderer.defaults = Object.freeze({
  /** Tag name of the element to use for rendering a token. */
  SPAN: 'span',
  /** Tag name of the element to use for grouping tokens in a single line. */
  LINE: 'span',
  /** The class name of the element to use for rendering a token. */
  CLASS: 'markup',
  /** Enable renderer-side packing of similar { flatten = true } tokens */
  FLATTEN: false, // true,
  /** Enable renderer-side unpacking { inset } || { lineBreaks > 0 } tokens */
  REFLOW: true,
});

/// INTERFACE

export default new MarkupRenderer();
