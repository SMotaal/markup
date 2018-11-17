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
    const contextualizer =
      this.contextualizer || (this.contextualizer = Species.contextualizer(this));
    let context = contextualizer.next().value;

    const {mode, syntax, createGrouper = Species.createGrouper || Object} = context;

    // Local grouping
    const groupers = mode.groupers || (mode.groupers = {});

    const grouping =
      state.grouping ||
      (state.grouping = {
        groupers,
        hints: new Set([syntax]),
        goal: syntax,
        groupings: [syntax],
        context: syntax,
      });

    // Local matching
    let {match, index = 0} = state;

    // Local tokens
    let previous, last, parent;
    const top = {type: 'top', text: '', offset: index};

    let lastContext = context;

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

      // console.log({context, grouping, tokenizer: this});

      while (lastContext === (lastContext = context)) {
        let next;

        state.last = last;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
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
          })),
          yield (previous = next));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        next = token({type, text, offset, previous, parent, hint, last});

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer &&
          ($$closer.test
            ? $$closer.test(text)
            : $$closer === text || (whitespace && whitespace.includes($$closer)));

        let after;
        let punctuator = next.punctuator;

        if (punctuator || closing) {
          let hinter = punctuator ? `${syntax}-${punctuator}` : grouping.hint;
          let closed, opened, grouper;

          if (closing) {
            closed = grouper = closing && grouping.groupings.pop();
            next.closed = closed;
            grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter);
            (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
              (closed.punctuator && (next.punctuator = closed.punctuator));
            after = grouper.close && grouper.close(next, state, context);

            const previousGrouper = (grouper = grouping.groupings[grouping.groupings.length - 1]);
            grouping.goal = (previousGrouper && previousGrouper.goal) || syntax;
            parent = (parent && parent.parent) || top;
          } else if ($$punctuator !== 'comment') {
            const group = `${hinter},${text}`;
            grouper = grouping.groupers[group];

            if ($$spans && punctuator === 'span') {
              const span = $$spans[text];
              next.punctuator = punctuator = 'span';
              opened =
                grouper ||
                createGrouper({
                  syntax,
                  goal: syntax,
                  span,
                  matcher: span.matcher || (matchers && matchers.span) || undefined,
                  spans: (spans && spans[text]) || undefined,
                  hinter,
                  punctuator,
                });
            } else if ($$punctuator !== 'quote') {
              if (punctuator === 'quote') {
                opened =
                  grouper ||
                  createGrouper({
                    syntax,
                    goal: punctuator,
                    quote: text,
                    matcher: (matchers && matchers.quote) || undefined,
                    spans: (spans && spans[text]) || undefined,
                    hinter,
                    punctuator,
                  });
              } else if (punctuator === 'comment') {
                const comment = comments[text];
                opened =
                  grouper ||
                  createGrouper({
                    syntax,
                    goal: punctuator,
                    comment,
                    matcher: comment.matcher || (matchers && matchers.comment) || undefined,
                    hinter,
                    punctuator,
                  });
              } else if (punctuator === 'closure') {
                const closure = (grouper && grouper.closure) || closures[text];
                punctuator = next.punctuator = 'opener';
                closure &&
                  (opened =
                    grouper ||
                    createGrouper({
                      syntax,
                      goal: syntax,
                      closure,
                      matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                      hinter,
                      punctuator,
                    }));
              }
            }

            if (opened) {
              // after = opened.open && opened.open(next, state, opened);
              grouping.groupers[group] || (grouping.groupers[group] = grouper = opened);
              grouping.groupings.push(grouper), grouping.hints.add(hinter);
              grouping.goal = (grouper && grouper.goal) || syntax;
              parent = next;
            }
          }

          state.context = grouping.context = grouping.goal || syntax;

          if (opened || closed) {
            context = contextualizer.next((state.grouper = grouper || undefined)).value;
            grouping.hint = `${[...grouping.hints].join(' ')} ${
              grouping.context ? `in-${grouping.context}` : ''
            }`;
            opened && (after = opened.open && opened.open(next, state, context));
          }
        }

        // Current contextual tail token (yield from sequence)
        yield (previous = next);

        // Next reference to last contextual sequence token
        next && !whitespace && forming && (last = next);

        if (after) {
          let tokens, token, nextIndex; //  = after.end || after.index

          if (after.syntax) {
            const {syntax, offset, index} = after;
            const body = index > offset && source.slice(offset, index - 1);
            if (body) {
              body.length > 0 &&
                ((tokens = tokenize(body, {options: {syntax}}, defaults)), (nextIndex = index));
              const hint = `${syntax}-in-${$.syntax}`;
              token = token => (
                (token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token
              );
            }
          } else if (after.length) {
            const hint = grouping.hint;
            token = token => (
              (token.hint = `${hint} ${token.type || 'code'}`), context.token(token)
            );
            (tokens = after).end && (nextIndex = after.end);
          }

          if (tokens) {
            // console.log({token, tokens, nextIndex});
            for (const next of tokens) {
              previous && ((next.previous = previous).next = next);
              token && token(next);
              yield (previous = next);
            }
          }
          nextIndex > index && (state.index = nextIndex);
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
    let grouper, done;

    // Tokenizer mode
    const mode = tokenizer.mode;
    const defaults = tokenizer.defaults;
    mode !== undefined || (mode = (defaults && defaults.mode) || undefined);
    // (mode = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);
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
        spans: {[syntax]: spans} = (mode.spans = {}),
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
      if (
        grouper !== (grouper = yield (grouper && grouper.context) || mode.context) &&
        grouper &&
        !grouper.context
      ) {
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
      mode: {
        syntax,
        keywords,
        assigners,
        operators,
        combinators,
        nonbreakers,
        comments,
        closures,
        breakers,
        patterns,
      },
      punctuators,
      aggregators,
      spans,
      quotes,
      forming = true,
    } = context;

    const {maybeIdentifier, maybeKeyword} = patterns || context;
    const wording = keywords || maybeIdentifier ? true : false;

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
    const aggregate =
      ((assigners && assigners.length) || (combinators && combinators.length)) &&
      (text =>
        (assigners && assigners.includes(text) && 'assigner') ||
        (combinators && combinators.includes(text) && 'combinator') ||
        false);

    while (!done) {
      let token, punctuator;
      if (next && next.text) {
        const {
          text, // Text for next production
          type, // Type of next production
          // offset, // Index of next production
          // breaks, // Linebreaks in next production
          hint, // Hint of next production
          previous, // Previous production
          parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
          last, // Last significant production
        } = next;

        if (type === 'sequence') {
          (next.punctuator =
            (aggregate &&
              previous &&
              (aggregators[text] ||
                (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
            (punctuators[text] ||
              (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
            undefined) && (next.type = 'punctuator');
        } else if (type === 'whitespace') {
          next.breaks = text.match(LineEndings).length - 1;
        } else if (forming && wording) {
          // type !== 'indent' &&
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

        previous && (previous.next = next);

        token = next;
      }

      next = yield token;
    }
  }

  static createGrouper({
    /* grouper context */
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
    return {
      syntax,
      goal,
      punctuator,
      spans,
      matcher,
      quotes,
      punctuators,
      opener,
      closer,
      hinter,
      open,
      close,
    };
  }
}
