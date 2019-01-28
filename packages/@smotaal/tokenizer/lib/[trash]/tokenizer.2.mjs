import {Grouping} from './grouping.mjs';

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
    // (state.grouping = {
    //   groupers,
    //   hints: new Set([syntax]),
    //   goal: syntax,
    //   hint: syntax,
    //   groupings: [syntax],
    //   context: syntax,
    // });

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

      // console.log({context, grouping, tokenizer: this});

      while (lastContext === (lastContext = context)) {
        let next;

        state.last = last;

        const lastIndex = state.index || 0;

        // $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
        $$matcher.lastIndex = lastIndex;
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) return;

        // if (!match[0] && (index = state.index--)) continue; //  && (index = state.index++)
        // if (!match[0] && (state.index++)) continue; //  && (index = state.index++)

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // if (match.length > 3 && match.slice(4).find(v => v)) {
        //   console.log(match);
        // }

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
          let tokens, token, nextIndex; //  = after.end || after.index

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
            // console.log({token, tokens, nextIndex});
            // console.log({index, nextIndex, 'state.index': state.index});
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

    // const {segments} = patterns || false;

    const {maybeIdentifier, maybeKeyword, segments} = patterns || false;
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
    const aggregate = text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false;

    while (!done) {
      let token, punctuator;
      if (next && next.text) {
        const {
          text, // Text for next production
          type, // Type of next production
          offset, // Index of next production
          // breaks, // Linebreaks in next production
          hint, // Hint of next production
          previous, // Previous production
          parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
          last, // Last significant production
          source,
        } = next;

        if (type === 'sequence') {
          (next.punctuator =
            (previous && (aggregators[text] || (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
            (punctuators[text] || (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
            undefined) && (next.type = 'punctuator');

          if (!next.punctuator) {
            for (const segment in segments) {
              if (segments[segment].test(next.text)) {
                next.hint += ` ${segment}`;
                next.type = segment;
                break;
              }
            }
            // console.log(next);
          }

          // if (text.startsWith('/') && next.punctuator !== 'comment' && source) {
          //   const br1 = offset - 40; // source.lastIndexOf('\n', offset - 50);
          //   const br2 = source.indexOf('\n', offset);
          //   const line = source.slice(br1, br2);
          //   const pre = line.slice(0, offset - br1).trimStart();
          //   const post = line.slice(offset - br1 + text.length).trimEnd();
          //   console.log('\n%c%s%c%s%c%s\n\n%o', 'color:gray', pre, 'color:blue', text, 'color:gray', post, {text, type: next.type});
          // }
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
