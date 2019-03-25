import {Grouping} from './grouping.js';

/** Tokenizer for a single mode (language) */
export class Tokenizer {
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
    let {match, index = 0, flags} = state;

    // Local tokens
    let previousToken, lastToken, parentToken;
    const top = {type: 'top', text: '', offset: index};

    // let lastContext = context;
    state.context = context;

    state.source = source;

    const tokenize = state.tokenize || (text => [{text}]);

    while (!done) {
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

      while (state.context === (state.context = context)) {
        let next;

        // state.lastToken = lastToken;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex = lastIndex;
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) break;

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // Current quasi-contextual fragment
        const pre = source.slice(lastIndex, offset);
        pre &&
          ((next = token({
            type: 'pre',
            text: pre,
            offset: lastIndex,
            previous: previousToken,
            parent: parentToken,
            hint,
            last: lastToken,
            source,
          })),
          yield (previousToken = next));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        next = token({type, text, offset, previous: previousToken, parent: parentToken, hint, last: lastToken, source});

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer &&
          ($$closer.test ? $$closer.test(text) : $$closer === text || (whitespace && whitespace.includes($$closer)));

        let after;
        let punctuator = next.punctuator;

        if (punctuator || closing) {
          let closed, opened, grouper;

          if (closing) {
            ({after, closed, parent: parentToken = top, grouper} = grouping.close(next, state, context));
          } else if ($$punctuator !== 'comment') {
            ({grouper, opened, parent: parentToken = top, punctuator} = grouping.open(next, context));
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
        yield (previousToken = next);

        // Next reference to last contextual sequence token
        next && !whitespace && forming && (lastToken = next);

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
              previousToken && ((next.previous = previousToken).next = next);
              token && token(next);
              yield (previousToken = next);
            }
            nextIndex > state.index && (state.index = nextIndex);
          }
        }
      }
    }
    flags && flags.debug && console.info('[Tokenizer.tokenize‹state›]: %o', state);
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
      let {
        tokenizer = (context.tokenizer = this.tokenizer(context)),
        token = (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(tokenizer)),
      } = context;
      return context;
    };

    if (!mode.context) {
      const {
        matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
        quotes,
        punctuators = (mode.punctuators = {aggregators: {}}),
        punctuators: {aggregators = (punctuators.aggregators = {})},
        patterns: {
          maybeKeyword = (mode.patterns.maybeKeyword =
            (defaults && defaults.patterns && defaults.patterns.maybeKeyword) || undefined),
        } = (mode.patterns = {maybeKeyword: null}),
        spans: {['(spans)']: spans} = (mode.spans = {}),
      } = mode;

      initialize((mode.context = {mode, punctuators, aggregators, matcher, quotes, spans}));
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
          goal = (grouper.syntax = $syntax),
          punctuator,
          punctuators = (grouper.punctuators = $punctuators),
          aggregators = (grouper.aggregate = $aggregators),
          closer,
          spans,
          matcher = (grouper.matcher = $matcher),
          quotes = (grouper.quotes = $quotes),
          forming = (grouper.forming = goal === $syntax),
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
