//@ts-check
import * as pseudom from '../../pseudom/pseudom.js';
import {each} from './helpers.js';

/// IMPLEMENTATION

class MarkupRenderer {
  constructor(options) {
    this.defaults = new.target.defaults || MarkupRenderer.defaults;

    Object.isFrozen(this.defaults) || Object.freeze((this.defaults = {...this.defaults}));

    this.options = {defaults: this.defaults, ...this.defaults, ...options};

    this.options.MARKUP_CLASS =
      /^\w+$|$/.exec(this.options.MARKUP_CLASS || this.defaults.MARKUP_CLASS)[0].toLowerCase() || 'markup';

    this.classes = {MARKUP_CLASS: this.options.MARKUP_CLASS, ...this.defaults.classes, ...this.options.classes};

    if (this.options.classes !== this.defaults.classes || this.options.MARKUP_CLASS !== this.defaults.MARKUP_CLASS) {
      const prefix = /^\w+(?=-|$)/;
      for (const [key, value] of Object.entries(this.classes)) {
        if (key === 'MARKUP_CLASS') continue;
        if (typeof key !== 'string') continue;
        if (!prefix.test(value) && key.includes('_'))
          throw Error(`Invalid MarkupRenderer class ‹{${key}: ${JSON.stringify(value)}›.`);
        this.classes[key] = /^\w+(?=-|$)/
          [Symbol.replace](
            value || this.defaults.classes[key] || key.toLowerCase().replace(/_/g, '-'),
            this.options.MARKUP_CLASS,
          )
          .toLowerCase();
      }
    }

    this.classes.MARKUP_SPACE = `whitespace ${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_WHITESPACE}`;
    this.classes.MARKUP_COMMENT = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ANNOTATION}`;
    this.classes.MARKUP_KEYWORD = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ENTITY}`;
    this.classes.MARKUP_IDENTIFIER = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_IDENTITY}`;
    this.classes.MARKUP_LITERAL = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-literal`;
    this.classes.MARKUP_SPAN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-span`;
    this.classes.MARKUP_STRING = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-string`;
    this.classes.MARKUP_PATTERN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-pattern`;
    this.classes.MARKUP_PUNCTUATOR = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-punctuator`;

    this.elements = {...this.defaults.elements, ...this.options.elements};

    this.options.classes = Object.freeze(this.classes);

    this.dom = this.options.dom || (this.options.dom = new.target.dom || MarkupRenderer.dom);

    Object.freeze(this.options);

    this.renderers = {
      line: new.target.factory(
        this.elements.LINE,
        {markupHint: '', markupClass: this.classes.MARKUP_LINE},
        this.options,
      ),
      fault: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `fault`, markupClass: this.classes.MARKUP_FAULT},
        this.options,
      ),
      text: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `text`, markupClass: this.classes.MARKUP_TOKEN},
        this.options,
      ),
      sequence: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `sequence`, markupClass: this.classes.MARKUP_TOKEN},
        this.options,
      ),

      whitespace: this.dom.Text,

      inset: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `inset`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
        this.options,
      ),

      break: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `break`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
        this.options,
      ),

      comment: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `comment`, markupClass: this.classes.MARKUP_COMMENT},
        this.options,
      ),

      keyword: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `keyword`, markupClass: this.classes.MARKUP_KEYWORD},
        this.options,
      ),
      identifier: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `identifier`, markupClass: this.classes.MARKUP_IDENTIFIER},
        this.options,
      ),

      literal: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `literal`, markupClass: this.classes.MARKUP_LITERAL},
        this.options,
      ),
      number: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `number`, markupClass: `literal ${this.classes.MARKUP_LITERAL}`},
        this.options,
      ),
      string: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `string`, markupClass: this.classes.MARKUP_STRING},
        this.options,
      ),
      quote: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `quote`, markupClass: `string ${this.classes.MARKUP_STRING}`},
        this.options,
      ),
      pattern: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `pattern`, markupClass: this.classes.MARKUP_PATTERN},
        this.options,
      ),

      punctuator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `punctuator`, markupClass: `${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      operator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `operator`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      assigner: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `assigner`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      combinator: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {
          markupHint: `combinator`,
          markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`,
        },
        this.options,
      ),
      delimiter: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `delimiter`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      punctuation: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `punctuation`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      breaker: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `breaker`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      opener: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `opener`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      closer: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `closer`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
        this.options,
      ),
      span: new.target.factory(
        this.elements.MARKUP_TOKEN,
        {markupHint: `span`, markupClass: `${this.classes.MARKUP_SPAN}`},
        this.options,
      ),
    };
  }

  async render(tokens, fragment) {
    let logs, template, first, elements;
    try {
      fragment || (fragment = MarkupRenderer.dom.Fragment());
      logs = fragment.logs; // || (fragment.logs = []);
      elements = this.renderer(tokens);
      if ((first = await elements.next()) && 'value' in first) {
        template = MarkupRenderer.dom.Template();
        if (!MarkupRenderer.dom.native && template && 'textContent' in fragment) {
          logs && logs.push(`render method = 'text' in template`);
          const body = [first.value];
          first.done || (await each(elements, element => element && body.push(element)));
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);
        } else if ('push' in fragment) {
          logs && logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          first.done || (await each(elements, element => element && fragment.push(element)));
        } else if ('append' in fragment) {
          logs && logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          first.done || (await each(elements, element => element && fragment.append(element)));
        }
      }
      return fragment;
    } finally {
      template && (template.innerHTML = '');
      template = fragment = logs = elements = first = null;
    }
  }

  *renderer(tokens) {
    let renderedLine, LineInset, normalizedLineInset, normalizedLineText, lineBreak, insetHint;
    let type, text, punctuator, hint, lineInset, lineBreaks, renderer;
    const {
      renderers,
      options: {REFLOW: reflows},
    } = this;
    const Lines = /^/gm;
    const Tabs = /\t+/g;
    const createLine = reflows
      ? () => (renderedLine = renderers.line())
      : () => (renderedLine = renderers.line('', 'no-reflow'));
    const emit = (renderer, text, type, hint) => {
      text == null && (text = '');
      (renderedLine || createLine()).appendChild((renderedLine.lastChild = renderer(text, hint || type)));
      if (type === 'inset') {
        renderedLine.style['--markup-line-inset-spaces'] =
          text.length - (renderedLine.style['--markup-line-inset-tabs'] = text.length - text.replace(Tabs, '').length);
        renderedLine.dataset['markup-line-inset'] = text;
      }
    };
    const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint);
    const emitBreak = hint => emit(renderers.break, '\n', 'break', hint);

    for (const token of tokens) {
      if (!token || !token.text) continue;

      ({type = 'text', text, punctuator, hint, lineInset, lineBreaks} = token);

      renderer =
        (punctuator &&
          (renderers[punctuator] || (type && renderers[type]) || renderers.punctuator || renderers.operator)) ||
        (type && (renderers[type] || (type !== 'whitespace' && type !== 'break' && renderers.text))) ||
        MarkupRenderer.dom.Text;

      // Normlize inset for { type != 'inset', inset = /\s+/ }
      if (reflows && lineBreaks && type !== 'break') {
        LineInset = void (lineInset = lineInset || '');
        insetHint = `${hint || ''} in-${type || ''}`;
        for (const normlizedline of text.split(Lines)) {
          (normalizedLineInset = normlizedline.startsWith(lineInset)
            ? normlizedline.slice(0, lineInset.length)
            : normlizedline.match(LineInset || (LineInset = RegExp(`^${lineInset.replace(/./g, '$&?')}|`)))[0]) &&
            emitInset(normalizedLineInset, insetHint);

          (normalizedLineText = normalizedLineInset
            ? normlizedline.slice(normalizedLineInset.length)
            : normlizedline) &&
            ((normalizedLineText === '\n'
              ? ((lineBreak = normalizedLineText), (normalizedLineText = ''))
              : normalizedLineText.endsWith('\n')
              ? ((lineBreak = '\n'),
                (normalizedLineText = normalizedLineText.slice(0, normalizedLineText.endsWith('\r\n') ? -2 : -1)))
              : !(lineBreak = '')) && emit(renderer, normalizedLineText, type, hint),
            lineBreak && (emitBreak(), renderedLine && (renderedLine = void (yield renderedLine))));
        }
      } else {
        // TODO: See if pseudom children can be optimized for WBR/BR clones
        emit(renderer, text, type, hint);
        type === 'break'
          ? renderedLine && (renderedLine = void (yield renderedLine))
          : type === 'whitespace' || renderedLine.appendChild(MarkupRenderer.dom.Element('wbr'));
      }
    }
    renderedLine && (yield renderedLine);
  }

  /**
   * @template {{markupHint: string}} T
   * @param {string} tagName
   * @param {T & Partial<HTMLElement>} properties
   * @param {MarkupRenderer['options']} [options]
   * @param {typeof MarkupRenderer['dom']} [dom]
   */
  static factory(tagName, properties, options, dom) {
    let defaults =
      /** @type {MarkupRenderer['options']} */ ((this &&
        Object.prototype.isPrototypeOf.call(MarkupRenderer, this) &&
        this.defaults) ||
      MarkupRenderer.defaults);
    let markupClass = defaults.MARKUP_CLASS;
    let markupHint = '';
    ({
      0: tagName = 'span',
      2: options = defaults,
      3: dom = options.dom || MarkupRenderer.dom,
    } = /** @type {*} */ (arguments));

    //@ts-ignore
    ({markupClass = options.MARKUP_CLASS || markupClass, markupHint = '', ...properties} = /** @type {*} */ ({
      ...properties,
    }));

    properties.className = `${markupHint ? `${markupClass} ${markupHint}` : markupClass} ${options.MARKUP_CLASS ||
      defaults.MARKUP_CLASS}`;

    return new (this.Factory || MarkupRenderer.Factory)({tagName, options, markupHint, markupClass, properties, dom})
      .render;
  }
}

{
  const defaults = {};

  /** Specifies the intended mode for rendering a token @type {'html'} */
  defaults.MODE = 'html';
  /** Tag name of the element to use for rendering a token. */
  defaults.SPAN = 'span';
  /** Tag name of the element to use for grouping tokens in a single line. */
  defaults.LINE = 'span';
  /** The bare class name for all rendered markup nodes. */
  defaults.MARKUP_CLASS = 'markup';
  /** Enable renderer-side unpacking { inset } || { breaks > 0 } tokens */
  defaults.REFLOW = true;

  defaults.elements = {
    MARKUP_LINE: 'span',
    MARKUP_TOKEN: 'span',
  };

  defaults.classes = {
    /** The bare class name for all rendered markup nodes. */
    MARKUP_CLASS: 'markup',
    /** The prefixed class name for rendered markup lines. */
    MARKUP_LINE: 'markup-line',
    /** The prefixed class name for rendered markup tokens. */
    MARKUP_TOKEN: 'markup-token',
    /** The prefixed class name for rendered markup tokens. */
    MARKUP_FAULT: 'markup-fault',
    /** The prefixed class name for rendered markup whitespace tokens. */
    MARKUP_WHITESPACE: 'markup-whitespace',
    /** The prefixed class name for rendered markup punctuation tokens. */
    MARKUP_PUNCTUATION: 'markup-punctuation',
    /** The prefixed class name for rendered markup annotation tokens. */
    MARKUP_ANNOTATION: 'markup-annotation',
    /** The prefixed class name for rendered markup entity tokens. */
    MARKUP_ENTITY: 'markup-entity',
    /** The prefixed class name for rendered markup identity tokens. */
    MARKUP_IDENTITY: 'markup-identity',
    /** The prefixed class name for rendered markup atoms. */
    MARKUP_ATOM: 'markup-atom',
  };

  MarkupRenderer.defaults = defaults;

  Object.freeze(defaults);
}

MarkupRenderer.Factory = class Factory {
  /** @param {{tagName: string, markupHint: string, markupClass: string, properties: Partial<HTMLElement>, options: MarkupRenderer['options'], dom: typeof MarkupRenderer['dom']}} configuration */
  constructor({tagName, markupHint, markupClass, properties, options, dom}) {
    this.tagName = tagName;
    this.properties = Object.freeze({...properties});
    this.markupHint = markupHint || '';
    this.markupClass = markupClass || MarkupRenderer.defaults.MARKUP_CLASS;
    this.options = options;
    this.dom = dom;
    this.render = this.render.bind(this);
    Object.freeze(this);
  }

  render(content, hint) {
    let element, hintSeparator;

    element =
      (typeof content === 'string' && (content = this.dom.Text(content))) || content != null
        ? this.dom.Element(this.tagName, this.properties, content)
        : this.dom.Element(this.tagName, this.properties);

    typeof hint === 'string' && hint !== '' && (hintSeparator = hint.indexOf('\n\n')) !== -1
      ? ((element.dataset = {
          'markup-hint': `${this.markupHint}${this.dom.escape(hint.slice(hintSeparator))}`,
        }),
        hintSeparator === 0 || (element.className = `${element.className} ${hint.slice(0, hintSeparator)}`))
      : (hint && (element.className = `${element.className} ${hint}`),
        (element.dataset = {'markup-hint': hint || this.markupHint || element.className}));

    return element;
  }
};

MarkupRenderer.dom = (() => {
  /** Uses lightweight proxy objects that can be serialized into HTML text */
  const HTML_MODE = MarkupRenderer.defaults.MODE === 'html';
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
  const escape = /** @type {(source: string) => string} */ (((replace, replacement) => string =>
    replace(string, replacement))(
    RegExp.prototype[Symbol.replace].bind(/[\0-\x1F"\\]/g),
    m => `&#x${m.charCodeAt(0).toString(16)};`,
  ));

  Template.supported = undefined;

  return Object.freeze({supported, native, implementation, escape, Element, Text, Fragment, Template});
})();

/// INTERFACE

export default new MarkupRenderer();
