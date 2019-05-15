import * as pseudom from '../../pseudom/pseudom.js';
// export {encodeEntity, encodeEntities} from '../../pseudom/pseudom.js';
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

    const {SPAN = 'span', LINE = 'span', CLASS = 'markup', REFLOW = true} = {
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
      pattern: factory(SPAN, {className: `${CLASS} pattern`}),
      sequence: factory(SPAN, {className: `${CLASS} sequence`}),
      literal: factory(SPAN, {className: `${CLASS} literal`}),
      // indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
      comment: factory(SPAN, {className: `${CLASS} comment`}),
      // code: factory(SPAN, {className: `${CLASS}`}),
    };

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
    const {renderers, reflows} = this;
    let renderedLine, LineInset, lineInset, lineText, lineBreak, insetHint;
    const createLine = reflows
      ? () => (renderedLine = renderers.line())
      : () => (renderedLine = renderers.line('', 'no-reflow'));
    const emit = (renderer, text, type, hint) => {
      (renderedLine || createLine()).appendChild((renderedLine.lastChild = renderer(text, hint || type)));
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint);
    const emitBreak = hint => emit(renderers.break, '\n', 'break', hint);
    const Lines = /^/gm;

    for (const token of tokens) {
      if (!token || !token.text) continue;

      let {type = 'text', text, inset, punctuator, breaks, hint} = token;
      let renderer =
        (punctuator && (renderers[punctuator] || (type && renderers[type]) || renderers.operator)) ||
        (type && renderers[type]) ||
        (type !== 'whitespace' && type !== 'break' && renderers.text) ||
        Text;

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (reflows && breaks && type !== 'break') {
        LineInset = void (inset = inset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const line of text.split(Lines)) {
          (lineInset = line.startsWith(inset)
            ? line.slice(0, inset.length)
            : line.match(LineInset || (LineInset = RegExp(`^${inset.replace(/./g, '$&?')}`)))[0]) &&
            emitInset(lineInset, insetHint);

          (lineText = lineInset ? line.slice(lineInset.length) : line) &&
            ((lineText === '\n'
              ? ((lineBreak = lineText), (lineText = ''))
              : lineText.endsWith('\n')
              ? ((lineBreak = '\n'), (lineText = lineText.slice(0, lineText.endsWith('\r\n') ? -2 : -1)))
              : !(lineBreak = '')) && emit(renderer, lineText, type, hint),
            lineBreak && (emitBreak(), (renderedLine = void (yield renderedLine))));
        }
      } else {
        // TODO: See if pseudom children can be optimized for WBR/BR clones
        emit(renderer, text, type, hint);
        type === 'break'
          ? (renderedLine = void (yield renderedLine))
          : type === 'whitespace' || renderedLine.appendChild(Element('wbr'));
      }
    }
    renderedLine && (yield renderedLine);
  }

  /**
   * @param {string} tag
   * @param {Partial<HTMLElement>} [properties]
   * @param {boolean} [unflattened]
   */
  static factory(tagName, elementProperties) {
    const [tag, properties] = arguments;
    return Object.defineProperties(
      (content, hint) => {
        typeof content === 'string' && (content = Text(content));
        const element = content != null ? Element(tag, properties, content) : Element(tag, properties);
        element &&
          (hint = typeof hint === 'string' && `${element.className || ''} ${hint}`.trim()) &&
          ((element.className = hint.split(/&#x[\da-f];/i, 1)[0]), (element.dataset = {hint: hint.slice(6).trim()}));
        return element;
      },
      {
        // flatten: {
        //   value: !arguments[2] || (/\bunflatten\b/i.test(arguments[2]) ? false : /\bflatten\b/i.test(arguments[2])),
        // },
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
  /** Enable renderer-side unpacking { inset } || { breaks > 0 } tokens */
  REFLOW: true,
});

/// INTERFACE

export default new MarkupRenderer();
