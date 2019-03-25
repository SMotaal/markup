$context => {
  const {
    mode: {syntax, matchers, comments, spans, closures},
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
      /* yield */ (previous = next));

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
      // punctuator text closing next parent
      // syntax matchers closures spans $$spans

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
            // 'opener' !==
            //   (punctuator =
            //     (closure.open &&
            //       (next = closure.open(next, state, previous) || next).punctuator) ||
            //     (next.punctuator = 'opener')) ||
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
        $context = $contexting.next((state.grouper = grouper || undefined)).value;
        grouping.hint = `${[...grouping.hints].join(' ')} ${
          grouping.context ? `in-${grouping.context}` : ''
        }`;
        opened && (after = opened.open && opened.open(next, state, $context));
      }
    }

    // Current contextual tail token (yield from sequence)
    // yield (previous = next);

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
        token = token => ((token.hint = `${hint} ${token.type || 'code'}`), $context.token(token));
        (tokens = after).end && (nextIndex = after.end);
      }

      if (tokens) {
        // console.log({token, tokens, nextIndex});
        for (const next of tokens) {
          previous && ((next.previous = previous).next = next);
          token && token(next);
          // yield (previous = next);
        }
      }
      nextIndex > index && (state.index = nextIndex);
    }
  }
};
