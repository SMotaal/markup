/** Markup (render) @author Saleh Abdel Motaal */
export function markup(source, options, defaults = markup.defaults) {
  let {syntax, renderers = defaults.renderers, ...tokenizerOptions} = options || defaults;

  const elements = [];
  const state = {options: tokenizerOptions};

  for (const token of tokenize(source, state, defaults)) {
    const {type = 'text', text, punctuator} = token;
    const renderer =
      (punctuator && (renderers[punctuator] || renderers.operator)) ||
      (type && renderers[type]) ||
      (text && renderers.text);

    const element = renderer && renderer(text, token);
    element && elements.push(element);
  }

  1 < 0 || 0 > 1;

  return elements;
}

/// REGULAR EXPRESSIONS

/** Non-alphanumeric symbol matching expressions */
export const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
  sequencesAndRegexp: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\B\/(?:[^\\\/\n\t]+|\[(?:\\\S|[^\[]+)+?\]|\\\S|\/[^a-z \n\t\,\.\;)}\]])+\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|[+\-*/&|^%<>~!]=?|[+\-*/&|^%<>~!])/g,
};

/** Special alpha-numeric symbol test expressions */
export const patterns = {
  /** Keyword like symbol (Basic latin only by default) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES

export const syntaxes = {html: {patterns}, css: {patterns}, es: {patterns}};
export const modes = {
  'text/css': {syntax: 'css'},
  'text/javascript': {syntax: 'es'},
  'text/html': {syntax: 'html'},
};

/// DEFAULTS

export const defaults = (markup.defaults = {
  matcher: matchers.sequencesAndRegexp,
  syntax: 'es',
  sourceType: 'text/javascript',
  renderers: {text: String},
  get syntaxes() {
    return syntaxes;
  },
});

/// TOKENIZATION

// TODO: Rethink token folding
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

  const fold = (node, text = node.text, next = node.next, type = node.type) => (
    (node.next = next), (node.type = type), (node.text += text), node
  );

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

  let done; // queued,

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
      punctuators: $punctuators = ($.punctuators = {}),
    } = $;
    while (!done && $syntax === $.syntax) {
      const $grouper = state.grouper || undefined;
      const $$punctuators = ($grouper && $grouper.punctuators) || $punctuators;
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
      let last; // = previous;

      while (!done && $grouper === state.grouper) {
        state.last = last;

        const lastIndex = state.index || 0;
        $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
        match = state.match = $$matcher.exec(source);
        index = state.index = $$matcher.lastIndex;

        if ((done = !match)) break;

        // Update hint from syntax
        !$syntax ||
          (goal || (goal = $syntax), hint && lastSyntax === $syntax) ||
          (hints.add($syntax).delete(lastSyntax),
          (hint = [...hints].join(' ')),
          (context = state.context || (state.context = lastSyntax = $syntax)));

        const {0: text, 1: whitespace = '', 2: sequence = '', index: offset} = match;
        const pre = source.slice(lastIndex, offset);
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';

        // Punctuator
        const closing =
          $$closer && ($$closer === text || (whitespace && whitespace.includes($$closer)));

        const forming = goal === $syntax;

        let punctuator =
          sequence &&
          ((previous &&
            (($assigners && $assigners.includes(text) && 'assigner') ||
              ($combinators && $combinators.includes(text) && 'combinator'))) ||
            ($$punctuators[text] ||
              ($$punctuators[text] =
                ($nonbreakers && $nonbreakers.includes(text) && 'nonbreaker') ||
                ($operators && $operators.includes(text) && 'operator') ||
                (($comments && $comments.includes(text) && 'comment') ||
                  ($$spanners && $$spanners.includes(text) && 'span') ||
                  ($$quotes && $$quotes.includes(text) && 'quote') ||
                  ($closures && $closures.includes(text) && 'closure') ||
                  ($breakers && $breakers.includes(text) && 'breaker')))));

        // Previous "unmatched" string
        if (pre) {
          const text = pre;
          const word = text.trim();
          const offset = lastIndex;

          // Flags
          let nonbreaking, assigning; // , keying;

          // if (forming) {
          //   keying = punctuator && (
          //       punctuator === 'quote' ||
          //       !(nonbreaking = punctuator === 'nonbreaker') ||
          //       !(assigning = punctuator === 'assigner')
          //   ) || (
          //     !last || last.punctuator === 'breaker' || last.punctuator === 'opener' || last.punctuator === 'closer'
          //   );
          // }
          forming &&
            punctuator &&
            ((nonbreaking = punctuator === 'nonbreaker') ||
              (assigning = punctuator === 'assigner'));

          const keying =
            // Keywords are not followed by punctuators;
            forming &&
            ((!previous || previous.punctuator !== 'nonbreaker') &&
              (!last ||
                !last.punctuator ||
                last.punctuator !== 'nonbreaker' ||
                (last.punctuator === 'breaker' ||
                  last.punctuator === 'opener' ||
                  last.punctuator === 'closer') ||
                (!previous ||
                  previous.type !== 'whitespace' ||
                  !previous.previous ||
                  (previous.previous.form === 'keyword' ||
                    previous.previous.form === 'identifier' ||
                    previous.text.includes('\n')))));

          // )
          //   (!last.punctuator ||
          //     )) &&
          //   (!previous ||
          //     (previous.punctuator && previous.punctuator !== 'nonbreaker') ||
          //     (previous.type === 'whitespace' &&
          //       (!previous.previous ||
          //         previous.text.includes('\n') ||
          //         previous.previous.form === 'keyword' ||
          //         previous.previous.form === 'identifier')))));

          const form =
            (forming &&
              ((keying && maybe('keyword', $keywords, word)) ||
                ($patterns &&
                  (maybe('identifier', $patterns.maybeIdentifier, word) ||
                    maybe('word', $patterns.maybeKeyword, word))))) ||
            'text';

          const type = (assigning && 'variable') || form;

          const next = {type, text, form, hint, offset, previous};

          previous && (previous.next = next);
          yield (previous = next);

          // const folding =
          //   previous &&
          //   previous.punctuator === 'nonbreaker' &&
          //   previous.previous &&
          //   previous.previous.form === form;

          // const next = folding
          //   ? fold(previous.previous, previous.text + text, null, type)
          //   : {type, text, form, hint, offset, previous};

          // folding ? (previous = next.previous) : previous && (previous.next = next);

          // if (nonbreaking) {
          //   queued || (queued = next);
          //   previous = next;
          // } else {
          //   while (queued) yield (previous = queued), (queued = queued.next || null);
          //   previous === next || (yield (previous = next));
          // }
        }

        const next =
          (whitespace && {type, text, hint, offset, previous}) ||
          ((punctuator && {type, punctuator, text, hint, offset, previous}) ||
            (sequence && {type, text, hint, offset, previous}) ||
            (text && {type, text, hint, offset, previous})) ||
          null;

        const $$punctuator = $grouper && $grouper.punctuator;
        const $$comment = $$punctuator === 'comment';
        const $$quote = $$punctuator === 'quote';
        const $$span = $$punctuator === 'span';

        // Update hint from punctuator or closer (if not punctuator)
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

            const previous = (grouper = groupings[groupings.length - 1]);
            goal = (previous && previous.goal) || $syntax;
          } else if (!terminator && !$$comment) {
            const group = `${hinter},${text}`;
            grouper = groupers[group];
            let opener, closer, matcher, quotes, created;
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

            created &&
              ((grouper = Object.assign(created, {opener, closer, grouper, hinter, group})),
              (grouper.punctuators = {}),
              punctuator && (grouper.punctuator = punctuator),
              matcher && (grouper.matcher = matcher),
              quotes && (grouper.quotes = quotes));

            if (opened) {
              groupers[group] || (groupers[group] = grouper);
              groupings.push(grouper);
              hints.add(hinter);
              grouper.terminator && (terminator = grouper.terminator);
              goal = (grouper && grouper.goal) || $syntax;
            }
          }

          state.context = context = goal || $syntax;

          if (opened || closed) {
            state.grouper = grouper;
            state.hint = hint = `${[...hints].join(' ')} ${context ? `in-${context}` : ''}`;
          }
        }

        previous && (previous.next = next);
        yield (previous = next);
        // (previous = next) && (queued || (yield next));

        forming && next && !whitespace && (last = next);

        // forming && previous &&
        // previous.type !== 'whitespace' &&
        // previous.punctuator !== 'comment' &&
        // (last = previous); //  || punctuator === 'breaker'

        index = state.index;
      }
    }
  }

  // while (queued) yield (previous = queued), (queued = queued.next || null);
}

// markup.defaults = tokenize.defaults = defaults;
