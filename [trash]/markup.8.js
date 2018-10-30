/** Markup (render) @author Saleh Abdel Motaal */
export function markup(source, options, defaults = markup.defaults) {
  return [...render(source, options, defaults)];
}

/// REGULAR EXPRESSIONS

/** Non-alphanumeric symbol matching expressions */
export const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

/** Special alpha-numeric symbol test expressions */
export const patterns = {
  /** Keyword like symbol (Basic latin only by default) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES

export const syntaxes = {
  '*': {patterns, matcher: matchers.sequences},
  html: {patterns},
  css: {patterns},
  es: {patterns},
};
export const modes = {
  '*': {syntax: 'es'},
  css: {syntax: 'css'},
  js: {syntax: 'es'},
  html: {syntax: 'html'},

  get javascript() {
    return this.js;
  },
};

/// DEFAULTS

export const defaults = (markup.defaults = {
  matcher: matchers.sequences,
  syntax: '*',
  sourceType: '*',
  renderers: {text: String},
  renderer,
  get syntaxes() {
    return syntaxes;
  },
});

/// RENDERING
class Token {
  toString() {
    return this.text;
  }
}
export function* renderer(tokens) {
  for (const token of tokens) {
    yield Object.setPrototypeOf(token, Token.prototype);
  }
}

export function render(source, options, defaults = markup.defaults) {
  let {syntax, renderer = defaults.renderer, ...tokenizerOptions} = options || defaults;
  const state = {options: tokenizerOptions};
  return renderer(tokenize(source, state, defaults));
}

/// TOKENIZATION

// TODO: Refactor segmentation logic
export function* tokenize(source, state = {}, defaults = markup.defaults) {
  const syntaxes = defaults.syntaxes;

  let {
    match,
    index,
    matcher = (state.matcher = defaults.matcher),
    options = (state.options = {}),
    options: {
      sourceType = (options.sourceType = defaults.sourceType),
      mode: sourceMode = (options.mode = modes[sourceType] || modes[defaults.sourceType]),
    },
    previous = null,
    mode = (state.mode = sourceMode),
    mode: {syntax = (mode = {...mode, syntax: defaults.syntax}).syntax},
  } = state;

  (state.source === (state.source = source) && index >= 0) ||
    (index = state.index = (index > 0 && index % source.length) || 0);

  const maybe = (result, expression, text) =>
    (expression &&
      (expression.test
        ? expression.test(text)
        : expression.includes
          ? expression.includes(text)
          : expression === text) &&
      result) ||
    undefined;

  const hints = new Set(),
    groupings = [],
    groupers = {};

  let done, parent;

  while (!done) {
    const {[(state.syntax = mode.syntax)]: $ = syntaxes[defaults.syntax]} = syntaxes;
    let hint, lastSyntax, context, terminator, goal;
    let $syntax = $.syntax;
    const {
      matcher: $matcher = (syntax.matcher = defaults.matcher),
      matchers: $matchers,
      keywords: $keywords,
      assigners: $assigners,
      operators: $operators,
      combinators: $combinators,
      nonbreakers: $nonbreakers,
      comments: $comments,
      quotes: $quotes,
      spans: $spans,
      closures: $closures,
      breakers: $breakers,
      patterns: $patterns,
      punctuators: $punctuators = ($.punctuators = {aggregators: {}}),
      punctuators: {aggregators: $aggregators = ($punctuators.aggregators = {})},
    } = $;

    while (!done && $syntax === $.syntax) {
      const $grouper = state.grouper || undefined;
      const $$punctuators = ($grouper && $grouper.punctuators) || $punctuators;
      const $$aggregators = ($$punctuators && $$punctuators.aggregators) || $aggregators;
      const $$closer = ($grouper && $grouper.closer) || undefined;
      const $$spanners = ($grouper && $grouper.spanners) || undefined;
      const $$matcher = ($grouper && $grouper.matcher) || $matcher || undefined;
      const $$quotes = ($grouper && $grouper.quotes) || $quotes || undefined;

      // Prime Matcher
      (state.matcher !== $$matcher || state.index !== $$matcher.lastIndex) &&
        $$matcher.exec(source);

      // Update State
      state.matcher === $$matcher || (state.matcher = $$matcher);

      // Reset last reference
      let last;

      while (!done && $grouper === state.grouper) {
        state.last = last;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) return;

        // Initial contextual hint (from syntax)
        !$syntax ||
          (goal || (goal = $syntax), hint && lastSyntax === $syntax) ||
          (hints.add($syntax).delete(lastSyntax),
          (hint = [...hints].join(' ')),
          (context = state.context || (state.context = lastSyntax = $syntax)));

        const forming = goal === $syntax;

        // Current contextual sequence
        const {0: text, 1: whitespace = '', 2: sequence = '', index: offset} = match;
        // Current meta-contextual fragment
        const pre = source.slice(lastIndex, offset);

        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer && ($$closer === text || (whitespace && whitespace.includes($$closer)));
        let punctuator =
          sequence &&
          ((previous &&
            ($$aggregators[text] ||
              (!(text in $$aggregators) &&
                ($$aggregators[text] =
                  ($assigners && $assigners.includes(text) && 'assigner') ||
                  ($combinators && $combinators.includes(text) && 'combinator'))))) ||
            ($$punctuators[text] ||
              (!(text in $$punctuators) &&
                ($$punctuators[text] =
                  ($nonbreakers && $nonbreakers.includes(text) && 'nonbreaker') ||
                  ($operators && $operators.includes(text) && 'operator') ||
                  ($comments && $comments.includes(text) && 'comment') ||
                  ($$spanners && $$spanners.includes(text) && 'span') ||
                  ($$quotes && $$quotes.includes(text) && 'quote') ||
                  ($closures && $closures.includes(text) && 'closure') ||
                  ($breakers && $breakers.includes(text) && 'breaker')))));

        // Current meta-contextual head token (yield from fragment)
        if (pre) {
          const text = pre;
          const word = text.trim();
          const offset = lastIndex;
          const assigning = forming && punctuator && punctuator === 'assigner';
          const keywording =
            forming &&
            ((!previous || previous.punctuator !== 'nonbreaker') &&
              (!last ||
                !last.punctuator ||
                (last.punctuator !== 'nonbreaker' && last.punctuator !== 'quote') ||
                !previous ||
                previous.breaks ||
                previous.type !== 'whitespace' ||
                !previous.previous ||
                (!previous.previous.punctuator ||
                  previous.previous.punctuator !== 'nonbreaker' ||
                  !previous.previous.form ||
                  previous.previous.form === 'keyword' ||
                  previous.previous.form === 'identifier')));
          const form =
            (forming &&
              ((keywording && maybe('keyword', $keywords, word)) ||
                ($patterns &&
                  (maybe('identifier', $patterns.maybeIdentifier, word) ||
                    maybe('word', $patterns.maybeKeyword, word))))) ||
            'text';
          const type = (assigning && 'variable') || form;
          const next = {type, text, form, hint, offset, previous, parent};

          previous && (previous.next = next);
          yield (previous = next);
        }

        // Current contextual tail token (from sequence)
        const breaks = (whitespace && whitespace.split('\n').length) || 0;
        const next =
          (whitespace && {type, text, hint, offset, previous, parent, breaks}) ||
          ((punctuator && {type, punctuator, text, hint, offset, previous, parent}) ||
            (sequence && {type, text, hint, offset, previous, parent}) ||
            (text && {type, text, hint, offset, previous, parent})) ||
          null;

        // Next contextual hint (from punctuator and/or closer)
        const $$punctuator = $grouper && $grouper.punctuator;
        const $$comment = $$punctuator === 'comment';
        const $$quote = $$punctuator === 'quote';
        const $$span = $$punctuator === 'span';

        let body;

        if (punctuator || closing) {
          let hinter = punctuator ? `${$syntax}-${punctuator}` : hint;
          let closed, opened;
          let grouper;

          if (closing) {
            closed = grouper = closing && groupings.pop();
            grouper &&
              (groupings.includes(grouper) || hints.delete(grouper.hinter),
              grouper.terminator && (terminator = undefined));
            next.punctuator = closed.closure
              ? 'closer'
              : closed.span
                ? 'span'
                : closed.punctuator || next.punctuator;

            body = grouper.close && grouper.close(next, state, grouper);

            const previousGrouper = (grouper = groupings[groupings.length - 1]);
            goal = (previousGrouper && previousGrouper.goal) || $syntax;
            parent = (parent && parent.parent) || undefined;
          } else if (!terminator && !$$comment) {
            const group = `${hinter},${text}`;
            grouper = groupers[group];
            let opener, closer, matcher, quotes, created, close;
            const canComment = !$$quote;
            const canQuote = canComment && !$$comment;
            const canEnclose = canQuote;
            const canSpan = $$spanners;

            if (canQuote && punctuator === 'quote') {
              const quote = (opener = closer = text);
              const spanners = ($spans && $spans[quote]) || undefined;
              opened =
                grouper ||
                ($matchers && (matcher = $matchers.quote),
                (created = {quote, spanners, goal: 'quote'}));
            } else if (canComment && punctuator === 'comment') {
              const comment = (grouper && grouper.comment) || $comments[text];
              opened =
                grouper ||
                (({
                  opener,
                  closer,
                  matcher = ($matchers && $matchers.comment) || undefined,
                } = comment),
                (created = {comment, terminator: closer, goal: 'comment'}));
            } else if (canEnclose && punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || $closures[text];
              'opener' ===
                (punctuator = (closure.open && closure.open(next, state, previous)) || 'opener') &&
                (opened =
                  grouper ||
                  (({
                    opener,
                    closer,
                    close,
                    quotes,
                    matcher = ($matchers && $matchers.closure) || undefined,
                  } = closure),
                  (created = {closure, goal: $syntax})));
              next.punctuator = punctuator;
            } else if (canSpan && punctuator === 'span') {
              const span = (grouper && grouper.span) || $$spanners[text];
              opened =
                grouper ||
                (({opener, closer, matcher = ($matchers && $matchers.span) || undefined} = span),
                (created = {span, goal: $syntax}));
              next.punctuator = punctuator = 'span';
            }

            matcher || (matcher = undefined);

            if (created) {
              grouper = Object.assign(created, {
                opener,
                closer,
                grouper,
                hinter,
                group,
                punctuator,
                matcher,
                quotes,
                close,
                punctuators: {aggregators: {}},
              });
            }

            if (opened) {
              groupers[group] || (groupers[group] = grouper);
              groupings.push(grouper);
              hints.add(hinter);
              grouper.terminator && (terminator = grouper.terminator);
              goal = (grouper && grouper.goal) || $syntax;
              parent = next;
            }
          }

          state.context = context = goal || $syntax;

          if (opened || closed) {
            state.grouper = grouper;
            state.hint = hint = `${[...hints].join(' ')} ${context ? `in-${context}` : ''}`;
          }
        }

        // Current contextual tail token (yield from sequence)
        previous && (previous.next = next);
        yield (previous = next);

        // Next reference to last contextual sequence token
        forming && next && !whitespace && (last = next);

        if (body && body.length) {
          for (const next of body) {
            // next = token;
            previous && (previous.next = next);
            yield (previous = next);
          }
        }
      }
    }
  }
}
