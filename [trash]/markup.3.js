/**
 * Markup
 *
 * Markup is broken down into two main concepts, sequences and groupings.
 *
 * Sequences are meaningful symbols in the right context, groupings provide
 * such contexts, and they in turn are determined in part by sequences.
 *
 * Example: A JavaScript source inhrently starts with that context, the curly
 * braces sequence in that context determines the grouping nature to follow,
 * the grouping in turn determines the context… and so on.
 *
 * Precedence and relevance can affect the significance of certain sequences
 * in different contexts. Yet, the bulk of sequences used in most popular
 * languages can in fact be ecompassed in simple efficient expressions.
 *
 * Grouping on the other hand is where modeling often gets tricky and results
 * in hard to reason about structures that often lead to inefficiencies.
 *
 */
export function markup(source, options = defaults) {
  let {renderers = defaults.renderers, ...tokenizerOptions} = options;

  const elements = [];
  const state = {options: tokenizerOptions};

  for (const token of tokenize(source, state)) {
    const {type = 'text', text, punctuator} = token;
    const renderer =
      (punctuator && (renderers[punctuator] || renderers.operator)) ||
      (type && renderers[type]) ||
      (text && renderers.text);

    const element = renderer && renderer(text, token);
    element && elements.push(element);
  }

  return elements;
}

/// PATTERNS

export const patterns = {
  /** Keyword like symbol (Basic latin only by default) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

export const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%=<>~!]+)/g,
  sequencesAndRegexp: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\B\/(?:[^\\\/\n\t]+|\[(?:\\\S|[^\[]+)+?\]|\\\S|\/[^a-z \n\t\,\.\;)}\]])+\/|\(|\)|\[|\]|,|;|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%<>~!]+={0,3}|=>?|[+\-*/&|^%<>~!])/g,
  // sequencesAndRegexp: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\B\/(?:[^/\n\t](?:\\\/|[^/\n\t]|\/[^a-z \n\t,.)}\]])*?[^\\]).+\/|\(|\)|\[|\]|,|;|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%=<>~!]+)/g,
};

/// SYNTAXES

export const none = Object.freeze([]);
export const syntaxes = {html: {patterns}, css: {patterns}, es: {patterns}};
export const modes = {
  'text/css': {syntax: 'css'},
  'text/javascript': {syntax: 'es'},
  'text/html': {syntax: 'html'},
};

/// DEFAULTS

export const defaults = {
  matcher: matchers.sequencesAndRegexp,
  syntax: 'es',
  sourceType: 'text/javascript',
  renderers: {text: String},
};

/// TOKENIZATION

// TODO: Rethink token folding
// TODO: Refactor segmentation logic
export function* tokenize(source, state = {}) {
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

  // matcher.lastIndex = (index > 0 && index % source.length) || 0;

  const fold = (node, text = node.text, next = node.next, type = node.type) => (
    (node.next = next), (node.type = type), (node.text += text), node
  );

  const hints = new Set(),
    groupings = [],
    groupers = {};

  let queued, done;

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
    } = $;
    while (!done && $syntax === $.syntax) {
      const $grouper = state.grouper;
      const $$closer = $grouper && $grouper.closer;
      const $$spanners = $grouper && $grouper.spanners;
      const $$matcher = ($grouper && $grouper.matcher) || $matcher;

      // Prime Matcher
      (state.matcher !== $$matcher || state.index !== $$matcher.lastIndex) &&
        $$matcher.exec(source);

      // Update State
      state.matcher === $$matcher || (state.matcher = $$matcher);

      while (!done && $grouper === state.grouper) {
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

        let punctuator =
          (previous &&
            (($assigners && $assigners.includes(text) && 'assigner') ||
              ($combinators && $combinators.includes(text) && 'combinator'))) ||
          ($nonbreakers && $nonbreakers.includes(text) && 'nonbreaker') ||
          ($operators && $operators.includes(text) && 'operator') ||
          (($comments && $comments.includes(text) && 'comment') ||
            ($$spanners && $$spanners.includes(text) && 'span') ||
            ($quotes && $quotes.includes(text) && 'quote') ||
            ($closures && $closures.includes(text) && 'closure') ||
            ($breakers && $breakers.includes(text) && 'breaker'));

        // Previous "unmatched" string
        if (pre) {
          const text = pre;
          const word = text.trim();
          const offset = lastIndex;

          // Flags
          let nonbreaking, assigning;

          const keying =
            // !punctuator ||
            !(
              (nonbreaking = punctuator === 'nonbreaker') || (assigning = punctuator === 'assigner')
            );

          const form =
            ($keywords && keying && goal === $syntax && $keywords.includes(word) && 'keyword') ||
            ($patterns &&
              ($patterns.maybeKeyword && $patterns.maybeKeyword.test(text) && 'word')) ||
            'text';
          const type = (assigning && 'variable') || form;

          const folding =
            previous &&
            previous.punctuator === 'nonbreaker' &&
            previous.previous &&
            previous.previous.form === form;

          const next = folding
            ? fold(previous.previous, previous.text + text, null, type)
            : {type, text, form, hint, offset, previous};

          folding ? (previous = next.previous) : previous && (previous.next = next);

          if (nonbreaking) {
            queued || (queued = next);
            previous = next;
          } else {
            while (queued) yield (previous = queued), (queued = queued.next || null);
            previous === next || (yield (previous = next));
          }
        }

        const next =
          (whitespace && {type, text, hint, offset, previous}) ||
          (punctuator && {type, punctuator, text, hint, offset, previous}) ||
          (sequence && {type, text, hint, offset, previous}) ||
          (text && {type, text, hint, offset, previous}) ||
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
            // {
            let opener, closer, matcher, created;
            // let matcher = $matcher;
            // const existing = grouper;
            const canComment = !$$quote;
            const canQuote = canComment && !$$comment;
            const canEnclose = canQuote;
            const canSpan = $$spanners;

            // if (!$$quote) {
            if (canQuote && punctuator === 'quote') {
              const quote = (opener = closer = text);
              const spanners = ($spans && $spans[quote]) || undefined;
              $matchers && (matcher = $matchers.quote);
              opened = grouper || (created = {quote, spanners, goal: 'quote'});
            } else if (canComment && punctuator === 'comment') {
              const comment = (grouper && grouper.comment) || $comments[text];
              $matchers && (matcher = $matchers.comment);
              opened =
                grouper ||
                (({opener, closer, matcher = matcher} = comment),
                (created = {comment, terminator: closer, goal: 'comment'}));
            } else if (canEnclose && punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || $closures[text];
              $matchers && (matcher = $matchers.closure);
              opened =
                grouper ||
                (({opener, closer, matcher = matcher} = closure),
                (created = {closure, goal: $syntax}));
              // next.punctuator = 'opener';
            } else if (canSpan && punctuator === 'span') {
              const span = (grouper && grouper.span) || $$spanners[text];
              $matchers && (matcher = $matchers.span);
              opened =
                grouper ||
                (({opener, closer, matcher = matcher} = span), (created = {span, goal: $syntax}));
              // next.punctuator = 'span';
            }

            matcher || (matcher = undefined); // $matcher || defaults.matcher

            created &&
              (grouper = Object.assign(created, {
                opener,
                closer,
                matcher,
                grouper,
                hinter,
                group,
                punctuator,
              }));
            // !opened ||
            //   existing ||
            //   Object.assign(opened, {opener, closer, matcher, grouper, hinter, group, punctuator});
            // }
            if (opened) {
              groupers[group] || (groupers[group] = grouper);
              groupings.push(grouper);
              hints.add(hinter);
              grouper.terminator && (terminator = grouper.terminator);
              goal = (grouper && grouper.goal) || $syntax;

              // Update Next
              grouper.punctuator && (next.punctuator = grouper.punctuator);
            }
          }

          state.context = context = goal || $syntax;

          if (opened || closed) {
            state.grouper = grouper;
            state.hint = hint = `${[...hints].join(' ')} ${context ? `@${context}` : ''}`;
            // state.matcher = (grouper && grouper.matcher) || undefined;
          }
        }

        previous && (previous.next = next);
        (previous = next) && (queued || (yield next));
        index = state.index;
      }
    }
  }

  while (queued) yield (previous = queued), (queued = queued.next || null);
}
