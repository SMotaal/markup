/** @typedef {import('./tokenizer.mjs').Grouping} Grouping */
/** @typedef {import('./tokenizer.mjs').Tokenizer} Tokenizer */
/** @typedef {import('./tokenizer.mjs').Token} Token */
/** @typedef {import('./tokenizer.mjs')['Tokenizer']} TokenizerClass */
/** @typedef {{[name: string]: Grouping}} Groupers */
/** @typedef {(TokenizerClass)['createGrouper']} createGrouper */

class Grouping {
  /**
   * @param {{syntax: string, groupers: Groupers, createGrouper: createGrouper}} options
   */
  constructor({syntax, groupers, createGrouper, contextualizer}) {
    // console.log(this, {syntax, groupers, createGrouper, contextualizer});
    this.groupers = groupers;
    this.groupings = [];
    this.hints = new Set();
    this.syntax = syntax;
    this.goal = syntax;
    this.hint = syntax;
    this.contextualizer = contextualizer;
    this.context = syntax;
    this.create = createGrouper || Object;
  }

  /**
   * @param {Token} next
   * @param {Token} parent
   * @param state
   * @param context
   */
  close(next, state, context) {
    let after, grouper, parent;
    const {groupings, hints, syntax} = this;

    const closed = groupings.pop();
    grouper = closed;
    groupings.includes(grouper) || hints.delete(grouper.hinter);

    // next &&
    (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
      (closed.punctuator && (next.punctuator = closed.punctuator));

    after = grouper.close && grouper.close(next, state, context);

    const previousGrouper = (grouper = groupings[groupings.length - 1]);

    this.goal = (previousGrouper && previousGrouper.goal) || syntax;
    this.grouper = previousGrouper;

    parent = (next.parent && next.parent.parent) || undefined;

    return {after, grouper, closed, parent};
  }

  open(next, context) {
    let opened, parent, grouper;

    const {groupers, groupings, hints, hint, syntax} = this;
    let {punctuator, text} = next;
    const hinter = punctuator ? `${syntax}-${punctuator}` : hint;
    const group = `${hinter},${text}`;

    grouper = groupers[group];

    const {
      mode: {matchers, comments, spans, closures},
    } = context;

    if (context.spans && punctuator === 'span') {
      const span = context.spans.get(text);
      punctuator = next.punctuator = 'span';
      opened =
        grouper ||
        this.create({
          syntax,
          goal: syntax,
          span,
          matcher: span.matcher || (matchers && matchers.span) || undefined,
          spans: (spans && spans[text]) || undefined,
          hinter,
          punctuator,
        });
    } else if (context.punctuator !== 'quote') {
      if (punctuator === 'quote') {
        // const quote = quotes.get(text);
        opened =
          grouper ||
          this.create({
            syntax,
            goal: punctuator,
            quote: text,
            matcher: (matchers && matchers.quote) || undefined,
            spans: (spans && spans[text]) || undefined,
            hinter,
            punctuator,
          });
      } else if (punctuator === 'comment') {
        const comment = comments.get(text);
        opened =
          grouper ||
          this.create({
            syntax,
            goal: punctuator,
            comment,
            matcher: comment.matcher || (matchers && matchers.comment) || undefined,
            hinter,
            punctuator,
          });
      } else if (punctuator === 'closure') {
        const closure = (grouper && grouper.closure) || closures.get(text);
        punctuator = next.punctuator = 'opener';
        closure &&
          (opened =
            grouper ||
            this.create({
              syntax,
              goal: syntax,
              closure,
              matcher: closure.matcher || (matchers && matchers.closure) || undefined,
              // operators: closure.operators || operators,
              hinter,
              punctuator,
            }));
      }
    }

    if (opened) {
      // after = opened.open && opened.open(next, state, opened);
      groupers[group] || (groupers[group] = grouper = opened);
      groupings.push(grouper), hints.add(hinter);
      this.goal = (grouper && grouper.goal) || syntax;
      parent = next;
    }

    return {grouper, opened, parent, punctuator};
  }
}

/** Tokenizer for a single mode (language) */
class Tokenizer {
  constructor(mode, defaults) {
    this.mode = mode;
    this.defaults = defaults || this.constructor.defaults || undefined;
  }

  /** Token generator from source using tokenizer.mode (or defaults.mode) */
  *tokenize(source, state = {}) {
    let done;

    // TODO: Consider supporting Symbol.species
    const Species = this.constructor;

    // Local context
    const contextualizer = this.contextualizer || (this.contextualizer = Species.contextualizer(this));
    let context = contextualizer.next().value;

    const {mode, syntax, createGrouper = Species.createGrouper || Object} = context;

    // Local grouping
    const groupers = mode.groupers || (mode.groupers = {});

    const grouping =
      state.grouping ||
      (state.grouping = new Grouping({
        syntax: syntax || mode.syntax,
        groupers,
        createGrouper,
        contextualizer,
      }));

    // Local matching
    let {match, index = 0} = state;

    // Local tokens
    let previous, last, parent;
    const top = {type: 'top', text: '', offset: index};

    let lastContext = context;

    state.source = source;

    const tokenize = state.tokenize || (text => [{text}]);

    while (true) {
      const {
        mode: {syntax, matchers, comments, spans, closures},
        punctuator: $$punctuator,
        closer: $$closer,
        spans: $$spans,
        matcher: $$matcher,
        token,
        forming = true,
      } = context;

      // Current contextual hint (syntax or hint)
      const hint = grouping.hint;

      while (lastContext === (lastContext = context)) {
        let next;

        state.last = last;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex = lastIndex;
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) return;

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // Current quasi-contextual fragment
        const pre = source.slice(lastIndex, offset);
        pre &&
          ((next = token({
            type: 'pre',
            text: pre,
            offset: lastIndex,
            previous,
            parent,
            hint,
            last,
            source,
          })),
          yield (previous = next));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        next = token({type, text, offset, previous, parent, hint, last, source});

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer &&
          ($$closer.test ? $$closer.test(text) : $$closer === text || (whitespace && whitespace.includes($$closer)));

        let after;
        let punctuator = next.punctuator;

        if (punctuator || closing) {
          let closed, opened, grouper;

          if (closing) {
            ({after, closed, parent = top, grouper} = grouping.close(next, state, context));
          } else if ($$punctuator !== 'comment') {
            ({grouper, opened, parent = top, punctuator} = grouping.open(next, context));
          }

          state.context = grouping.context = grouping.goal || syntax;

          if (opened || closed) {
            next.type = 'punctuator';
            context = contextualizer.next((state.grouper = grouper || undefined)).value;
            grouping.hint = `${[...grouping.hints].join(' ')} ${grouping.context ? `in-${grouping.context}` : ''}`;
            opened && (after = opened.open && opened.open(next, state, context));
          }
        }

        // Current contextual tail token (yield from sequence)
        yield (previous = next);

        // Next reference to last contextual sequence token
        next && !whitespace && forming && (last = next);

        if (after) {
          let tokens, token, nextIndex;

          if (after.syntax) {
            const {syntax, offset, index} = after;
            const body = index > offset && source.slice(offset, index - 1);
            if (body) {
              body.length > 0 &&
                ((tokens = tokenize(body, {options: {sourceType: syntax}}, this.defaults)), (nextIndex = index));
              const hint = `${syntax}-in-${mode.syntax}`;
              token = token => ((token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token);
            }
          } else if (after.length) {
            const hint = grouping.hint;
            token = token => ((token.hint = `${hint} ${token.type || 'code'}`), context.token(token));
            (tokens = after).end > state.index && (nextIndex = after.end);
          }

          if (tokens) {
            for (const next of tokens) {
              previous && ((next.previous = previous).next = next);
              token && token(next);
              yield (previous = next);
            }
            nextIndex > state.index && (state.index = nextIndex);
          }
        }
      }
    }
  }

  /**
   * Context generator using tokenizer.mode (or defaults.mode)
   */
  get contextualizer() {
    const value = this.constructor.contextualizer(this);
    Object.defineProperty(this, 'contextualizer', {value});
    return value;
  }

  /**
   * Tokenizer context generator
   */
  static *contextualizer(tokenizer) {
    // Local contextualizer state
    let grouper;

    // Tokenizer mode
    const mode = tokenizer.mode;
    const defaults = tokenizer.defaults;
    mode !== undefined || (mode = (defaults && defaults.mode) || undefined);
    if (!mode) throw ReferenceError(`Tokenizer.contextualizer invoked without a mode`);

    // TODO: Refactoring
    const initialize = context => {
      context.token ||
        (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(
          this.tokenizer(context),
        ));
      return context;
    };

    if (!mode.context) {
      const {
        syntax,
        matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
        quotes,
        punctuators = (mode.punctuators = {aggregators: {}}),
        punctuators: {aggregators = ($punctuators.aggregators = {})},
        patterns: {
          maybeKeyword = (mode.patterns.maybeKeyword =
            (defaults && defaults.patterns && defaults.patterns.maybeKeyword) || undefined),
        } = (mode.patterns = {maybeKeyword: null}),
        spans: {['(spans)']: spans} = (mode.spans = {}),
      } = mode;

      initialize(
        (mode.context = {
          mode,
          punctuators,
          aggregators,
          matcher,
          quotes,
          spans,
        }),
      );
    }

    const {
      syntax: $syntax,
      matcher: $matcher,
      quotes: $quotes,
      punctuators: $punctuators,
      punctuators: {aggregators: $aggregators},
    } = mode;

    while (true) {
      if (grouper !== (grouper = yield (grouper && grouper.context) || mode.context) && grouper && !grouper.context) {
        const {
          goal = $syntax,
          punctuator,
          punctuators = $punctuators,
          aggregators = $aggregators,
          closer,
          spans,
          matcher = $matcher,
          quotes = $quotes,
          forming = goal === $syntax,
        } = grouper;

        initialize(
          (grouper.context = {
            mode,
            punctuator,
            punctuators,
            aggregators,
            closer,
            spans,
            matcher,
            quotes,
            forming,
          }),
        );
      }
    }
  }

  static *tokenizer(context) {
    let done, next;

    const {
      mode: {syntax, keywords, assigners, operators, combinators, nonbreakers, comments, closures, breakers, patterns},
      punctuators,
      aggregators,
      spans,
      quotes,
      forming = true,
    } = context;

    const {maybeIdentifier, maybeKeyword, segments} = patterns || false;
    const wording = keywords || maybeIdentifier ? true : false;

    const matchSegment =
      segments &&
      (segments[Symbol.match] ||
        (!(Symbol.match in segments) &&
          (segments[Symbol.match] = (segments => {
            const sources = [];
            const names = [];
            for (const name of Object.getOwnPropertyNames(segments)) {
              const segment = segments[name];
              if (segment && segment.source && !/\\\d/.test(segment.source)) {
                names.push(name);
                sources.push(segment.source.replace(/\\?\((.)/g, (m, a) => (m[0] !== '\\' && a !== '?' && '(?:') || m));
              }
            }
            const {length} = names;
            if (!length) return false;
            const matcher = new RegExp(`(${sources.join('|)|(')}|)`, 'u');
            return text => {
              // OR: for (const segment of names) if (segments[segment].test(text)) return segment;
              const match = matcher.exec(text);
              if (match[0]) for (let i = 1, n = length; n--; i++) if (match[i]) return names[i - 1];
            };
          })(segments))));

    const LineEndings = /$/gm;
    const punctuate = text =>
      (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
      (operators && operators.includes(text) && 'operator') ||
      (comments && comments.includes(text) && 'comment') ||
      (spans && spans.includes(text) && 'span') ||
      (quotes && quotes.includes(text) && 'quote') ||
      (closures && closures.includes(text) && 'closure') ||
      (breakers && breakers.includes(text) && 'breaker') ||
      false;
    const aggregate = text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false;

    while (!done) {
      let token;

      if (next && next.text) {
        const {text, type, hint, previous, parent, last} = next;

        if (type === 'sequence') {
          ((next.punctuator =
            (previous && (aggregators[text] || (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
            (punctuators[text] || (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
            undefined) &&
            (next.type = 'punctuator')) ||
            (matchSegment &&
              (next.type = matchSegment(text)) &&
              (next.hint = `${(hint && `${hint} `) || ''}${next.type}`)) ||
            (next.type = 'sequence');
        } else if (type === 'whitespace') {
          next.breaks = text.match(LineEndings).length - 1;
        } else if (forming && wording) {
          const word = text.trim();
          word &&
            ((keywords &&
              keywords.includes(word) &&
              (!last || last.punctuator !== 'nonbreaker' || (previous && previous.breaks > 0)) &&
              (next.type = 'keyword')) ||
              (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
        } else {
          next.type = 'text';
        }

        previous && (previous.next = next) && (parent || (next.parent = previous.parent));

        token = next;
      }

      next = yield token;
    }
  }

  static createGrouper({
    syntax,
    goal = syntax,
    quote,
    comment,
    closure,
    span,
    grouping = comment || closure || span || undefined,
    punctuator,
    spans = (grouping && grouping.spans) || undefined,
    matcher = (grouping && grouping.matcher) || undefined,
    quotes = (grouping && grouping.quotes) || undefined,
    punctuators = {aggregators: {}},
    opener = quote || (grouping && grouping.opener) || undefined,
    closer = quote || (grouping && grouping.closer) || undefined,
    hinter,
    open = (grouping && grouping.open) || undefined,
    close = (grouping && grouping.close) || undefined,
  }) {
    return {syntax, goal, punctuator, spans, matcher, quotes, punctuators, opener, closer, hinter, open, close};
  }
}

const TOKENIZERS = 'tokenizers';
const MAPPINGS = 'mappings';
const MODES = 'modes';

const none = {
  syntax: 'markup',
  matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/+|\/\*+|\*+\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

const define = (instance, property, value, options) => {
  if (!instance.hasOwnProperty(property))
    return (
      Object.defineProperty(instance, property, {
        value,
        writable: (options && options.writable === true) || false,
        configurable: (options && options.configurable === true) || false,
        enumerable: !options || options.enumerable === true,
      }),
      value
    );
};

class Parser {
  /**
   * @param source {string}
   * @param state {{sourceType?: string}}
   */
  tokenize(source, state = {}) {
    const {
      options: {
        sourceType,
        mode = (state.options.mode = (sourceType && this.get(sourceType)) || none),
      } = (state.options = {}),
    } = state;
    let tokenizer = mode && this[TOKENIZERS].get(mode);
    if (!source || !mode) return [];
    !tokenizer && this[TOKENIZERS].set(mode, (tokenizer = new Tokenizer(mode)));
    state.parser = this;
    state.tokenize = (this.hasOwnProperty('tokenize') && this.tokenize) || (this.tokenize = this.tokenize.bind(this));
    return tokenizer.tokenize(source, state);
  }

  get [TOKENIZERS]() {
    return define(this, TOKENIZERS, new WeakMap());
  }
  get [MAPPINGS]() {
    return define(this, MAPPINGS, Object.create(null));
  }

  get [MODES]() {
    return define(this, MODES, Object.create(null));
  }

  get(id = 'default') {
    const {[MAPPINGS]: mappings, [MODES]: modes} = this;
    if (id in modes) return modes[id];
    let mapping = mappings[id];
    !mapping || mapping.syntax === id || (mapping = mappings[mapping.syntax]);
    if (mapping && mapping.factory) {
      const {syntax, factory, options} = mapping;
      if (options.requires && options.requires.length > 0) {
        const list = [];
        for (const id of options.requires) id in modes || this.get(id) || list.push(id);
        if (list.length) {
          list.length > 1 && list.push(list.splice(-2, 2).join(' and '));
          throw Error(`Cannot initialize "${syntax}" which requires the list mode(s): ${list.join(', ')}`);
        }
      }
      return (mapping.mode = modes[id] = factory(options, modes));
    }
  }

  /**
   * @param mode {ModeFactory | Mode}
   * @param options {ModeOptions}
   */
  register(mode, options) {
    const {[MAPPINGS]: mappings, [MODES]: modes} = this;

    if (!mappings) return;

    const factory = typeof mode === 'function' && mode;

    const {syntax, aliases = (options.aliases = [])} = ({syntax: options.syntax = mode.syntax} = options = {
      syntax: undefined,
      ...factory.defaults,
      ...options,
    });

    if (!syntax || typeof syntax !== 'string')
      throw TypeError(`Cannot register "${syntax}" since it not valid string'`);

    if (mappings[syntax]) {
      if (factory ? factory === mappings[syntax].factory : mode === modes[syntax]) return;
      else throw ReferenceError(`Cannot register "${syntax}" since it is already registered`);
    }

    if (aliases && aliases.length > 0) {
      for (const alias of aliases) {
        if (!alias || typeof alias !== 'string')
          throw TypeError(`Cannot register "${syntax}" since it's alias "${alias}" not valid string'`);
        else if (mappings[alias])
          throw ReferenceError(`Cannot register "${syntax}" since it's alias "${alias}" is already registered`);
      }
    }

    const mapping = factory ? {syntax, factory, options} : {syntax, mode, options};

    const descriptor = {value: mapping, writable: false};
    for (const id of [syntax, ...aliases]) {
      Object.defineProperty(mappings, id, descriptor);
    }
  }

  /**
   * @param mode {string}
   * @param requires {string[]}
   */
  requires(mode, requires) {
    const missing = [];
    for (const mode of requires) mode in this[MAPPINGS] || missing.push(`"${mode}"`);
    if (!missing.length) return;
    throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
  }
}

/**
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
 * @typedef { {[name: string]: Mode} } Modes
 * @typedef { {[name: string]: {syntax: string} } } Mappings
 * @typedef { {aliases?: string[], syntax: string} } ModeOptions
 * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
 */

// * @typedef { typeof helpers } Helpers

export { TOKENIZERS, MAPPINGS, MODES, Parser, Tokenizer };
//# sourceMappingURL=tokenizer.mjs.map
