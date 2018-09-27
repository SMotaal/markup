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
    // element && typeof element === 'object' && (element.token = token);
    element && elements.push(element);
  }

  return elements;
}

/// PATTERNS

export const patterns = {
  /** Keyword like symbol (Basic latin only by default) */
  maybeKeyword: /^[a-z](\w*)$/i,
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
  matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|\B\/(?:[^/\n\t](?:\\\/|[^/\n\t]|\/[^a-z \n\t,.)}\]])*?[^\\]).+\/|[+\-*/&|^%=<>~!]+)/g,
  // matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|:\/\/|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%=<>~!]+)/g,

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

  matcher.lastIndex = (index > 0 && index % source.length) || 0;

  const fold = (node, text = node.text, next = node.next, type = node.type) => (
    (node.next = next), (node.type = type), (node.text += text), node
  );

  const hints = new Set(),
    hinters = [],
    groupings = [],
    closers = [],
    groupers = {};

  let queued, done;

  while (!done) {
    const {[(state.syntax = mode.syntax)]: $ = syntaxes[defaults.syntax]} = syntaxes;
    let hint, lastSyntax, context, terminator, goal, grouping;
    let $syntax = $.syntax;
    const {
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
    while ($syntax === $.syntax) {
      let lastIndex = index;
      match = state.match = matcher.exec(source);
      index = state.index = matcher.lastIndex;

      if ((done = !match)) break;

      // Update hint from syntax
      !$syntax ||
        (goal || (goal = $syntax), hint && lastSyntax === $syntax) ||
        (hints.add($syntax).delete(lastSyntax),
        (hint = [...hints].join(' ')),
        (context = lastSyntax = $syntax));

      const {0: text, 1: whitespace = '', 2: sequence = '', index: offset} = match; // 2: expressions,
      // const length = text.length;
      const pre = source.slice(lastIndex, offset);
      const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
      const closer = closers.length && closers[closers.length - 1];
      const grouper = closer && groupings[groupings.length - 1];
      const spanners = grouper && grouper.spanners;
      const closing = closer && (closer === text || (whitespace && whitespace.includes(closer)));

      let punctuator =
        (previous &&
          (($assigners && $assigners.includes(text) && 'assigner') ||
            ($combinators && $combinators.includes(text) && 'combinator'))) ||
        ($nonbreakers && $nonbreakers.includes(text) && 'nonbreaker') ||
        ($operators && $operators.includes(text) && 'operator') ||
        (($comments && $comments.includes(text) && 'comment') ||
          (spanners && spanners.includes(text) && 'span') ||
          ($quotes && $quotes.includes(text) && 'quote') ||
          ($closures && $closures.includes(text) && 'closure') ||
          ($breakers && $breakers.includes(text) && 'breaker'));

      // if (punctuator === 'combinator')
      //   console.log('combinator', previous, pre, text);

      if (pre) {
        const text = pre;
        const word = text.trim();
        const offset = lastIndex;
        // const length = text.length;

        // Flags
        let nonbreaking, assigning;

        const keying =
          // !punctuator ||
          !((nonbreaking = punctuator === 'nonbreaker') || (assigning = punctuator === 'assigner'));

        const form =
          ($keywords && keying && goal === $syntax && $keywords.includes(word) && 'keyword') ||
          ($patterns && ($patterns.maybeKeyword && $patterns.maybeKeyword.test(text) && 'word')) ||
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

      // Update hint from punctuator
      if (punctuator || closing) {
        let hinter = punctuator ? `${$syntax}-${punctuator}` : hint;
        let closed, opened;
        let grouper;
        if (closing) {
          closed = grouper = closing && groupings.pop();
          closers.pop(), hinters.pop();
          grouper &&
            (groupings.includes(grouper) || hints.delete(grouper.hinter),
            grouper.terminator && (terminator = undefined));
          next.punctuator = closed.closure
            ? 'closer'
            : closed.span
              ? 'span'
              : closed.punctuator || next.punctuator;

          const previous = groupings[groupings.length - 1];
          goal = (previous && previous.goal) || $syntax;
        } else if (!terminator) {
          const group = `${hinter},${text}`;
          let grouper = groupers[group];
          {
            let opener, closer;
            const existing = grouper;
            if (punctuator === 'quote') {
              const quote = (opener = closer = text);
              const spanners = ($spans && $spans[quote]) || undefined;
              opened = existing || (grouper = {quote, spanners, goal: 'quote'});
            } else if (punctuator === 'comment') {
              const comment = (grouper && grouper.comment) || $comments[text];
              opened =
                existing ||
                (({opener, closer} = comment),
                (grouper = {comment, terminator: closer, goal: 'comment'}));
            } else if (punctuator === 'span') {
              const span = (grouper && grouper.span) || spanners[text];
              opened = existing || (({opener, closer} = span), (grouper = {span, goal: $syntax}));
              next.punctuator = 'span';
            } else if (punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || $closures[text];
              opened =
                existing || (({opener, closer} = closure), (grouper = {closure, goal: $syntax}));
              next.punctuator = 'opener';
            }
            !opened ||
              existing ||
              Object.assign(opened, {opener, closer, grouper, hinter, group, punctuator});
          }
          if (opened) {
            groupers[group] || (groupers[group] = grouper);
            groupings.push(grouper);
            closers.push(grouper.closer), hinters.push(hinter), hints.add(hinter);
            grouper.terminator && (terminator = grouper.terminator);
            goal = (grouper && grouper.goal) || $syntax;
          }
        }

        if (opened || closed) {
          grouping = hinters.join(' ');
          hint = [...hints].join(' ');
        }
        context = goal || $syntax;
      }

      previous && (previous.next = next);
      (previous = next) && (queued || (yield next));
      matcher.lastIndex = index = state.index;
    }
  }

  while (queued) yield (previous = queued), (queued = queued.next || null);
}

// matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|:\/\/|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%=<>~!]+)/g,
// matcher: /([\s\n]+)|(\/(?:[^/\n\t](?:\\\/|[^/\n\t]|\/[^a-z \n\t,.)}\]])*?[^\\]).+\/)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|:\/\/|::|:|\?|`|"|'|\$\{|\{|\}|<\/|\/>|[+\-*/&|^%=<>~!]+)/g,
// matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\b.\b|::|:|\?|`|"|'|\{|\}|\$\{|<\/|\/>|\B\/(?:[^/\n\t](?:\\\/|[^/\n\t]|\/[^a-z \n\t,.)}\]])*?[^\\]).+\/|[+\-*/&|^%=<>~!]+)/g,
