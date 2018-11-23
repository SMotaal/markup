
export function* contextualizer($, defaults) {
  let done, grouper;

  $ !== undefined ||
    ($ = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);

  const initialize = context => {
    context.token ||
      (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(
        tokenizer(context),
      ));
    context;
  };

  const {
    syntax: $syntax,
    matchers: $matchers,
    matcher: $matcher = ($.matcher = defaults.matcher),
    quotes: $quotes,

    punctuators: $punctuators = ($.punctuators = {aggregators: {}}),
    punctuators: {aggregators: $aggregators = ($.punctuators.aggregators = {})},

    patterns: $patterns = ($.patterns = {maybeKeyword: null}),
    patterns: {
      maybeKeyword = ($.patterns.maybeKeyword =
        ((defaults && defaults.patterns) || patterns).maybeKeyword || undefined),
    },

    spans: $spans = ($.spans = Null),

    keywords: $keywords,
    assigners: $assigners,
    operators: $operators,
    combinators: $combinators,
    nonbreakers: $nonbreakers,
    comments: $comments,
    closures: $closures,
    breakers: $breakers,

    root: $root = ($.root = {
      syntax: $syntax,
      matchers: $matchers,
      keywords: $keywords,
      assigners: $assigners,
      operators: $operators,
      combinators: $combinators,
      nonbreakers: $nonbreakers,
      comments: $comments,
      closures: $closures,
      breakers: $breakers,
      patterns: $patterns,
    }),

    context: $context = initialize(
      ($.context = {
        ...$root,
        punctuators: $punctuators,
        aggregators: $aggregators,
        matcher: $matcher,
        quotes: $quotes,
        spans: $spans[$syntax],
      }),
    ),
  } = $;

  while (true) {
    if (
      grouper !== (grouper = yield (grouper && grouper.context) || $.context) &&
      grouper &&
      !grouper.context
    ) {
      const {
        matchers = $matchers,
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
          ...$root,
          matchers,
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

export function* tokenizer(context) {
  let done, next;

  const {
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
    punctuators,
    aggregators,
    spans,
    quotes,
    forming = true,
  } = context;

  const {maybeIdentifier} = patterns || context;
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

// defaults = markup.defaults
export function* tokenize(source, state = {}) {
  const syntaxes = defaults.syntaxes;

  let {
    match,
    index,
    options: {
      sourceType = (state.options.sourceType = state.options.syntax || defaults.sourceType),
    } = (state.options = {}),
    previous = null,
    mode = (state.mode = modes[sourceType] || modes[defaults.sourceType]),
    mode: {syntax},
    grouping = (state.grouping = {
      hints: new Set(),
      groupings: [],
      groupers: mode.groupers || (mode.groupers = {}),
    }),
  } = state;

  (state.source === (state.source = source) && index >= 0) ||
    (index = state.index = (index > 0 && index % source.length) || 0);

  const top = {type: 'top', text: '', offset: index};

  let done,
    parent = top,
    last;

  let lastContext;

  const {
    [(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax],
  } = defaults.syntaxes;

  const $contexting = contextualizer($, defaults);
  let $context = $contexting.next().value;

  // Initial contextual hint (syntax)
  !syntax ||
    (grouping.goal || (grouping.goal = syntax), grouping.hint && grouping.lastSyntax === syntax) ||
    (grouping.hints.add(syntax).delete(grouping.lastSyntax),
    (grouping.hint = [...grouping.hints].join(' ')),
    (grouping.context = state.context || (state.context = grouping.lastSyntax = syntax)));

  while (true) {
    const {
      matchers,
      syntax,
      comments,
      spans,
      closures,
      punctuator: $$punctuator,
      closer: $$closer,
      spans: $$spans,
      matcher: $$matcher,
      token,
      forming = true,
    } = $context;

    // Current contextual hint (syntax or hint)
    const hint = grouping.hint;

    while (lastContext === (lastContext = $context)) {
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
        ((next = token({type: 'pre', text: pre, offset: lastIndex, previous, parent, hint, last})),
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
          after = grouper.close && grouper.close(next, state, $context);

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
                  matcher: (matchers && (matchers[text] || matchers.quote)) || undefined,
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
            grouping.groupers[group] || (grouping.groupers[group] = grouper = opened);
            grouping.groupings.push(grouper), grouping.hints.add(hinter);
            grouping.goal = (grouper && grouper.goal) || syntax;
            parent = next;
          }
        }

        state.context = grouping.context = grouping.goal || syntax;

        if (opened || closed) {
          $context = $contexting.next((state.grouper = grouper || undefined)).value;
          grouping.hint = `${[...grouping.hints].join(' ')} ${
            grouping.context ? `in-${grouping.context}` : ''
          }`;
          opened && (after = opened.open && opened.open(next, state, $context));
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
            const hint = `${syntax}-in-${$context.syntax}`;
            token = token => (
              (token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token
            );
          }
        } else if (after.length) {
          const hint = grouping.hint;
          token = token => (
            (token.hint = `${hint} ${token.type || 'code'}`), $context.token(token)
          );
          (tokens = after).end && (nextIndex = after.end);
        }

        if (tokens) {
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
