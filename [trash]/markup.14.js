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
  const {syntax, renderer = defaults.renderer, ...tokenizerOptions} = options || defaults;
  const state = {options: tokenizerOptions};
  return renderer(tokenize(source, state, defaults));
}

/// GROUPING
const Grouper = ({
  /* grouper context */
  quote,
  comment,
  closure,
  span,
  grouping = comment || closure || span || undefined,
  goal = (comment && 'comment') ||
    (closure && 'closure') ||
    (span && 'span') ||
    (quote && 'quote') ||
    punctuator ||
    undefined,

  punctuator,
  terminator = (comment && comment.closer) || undefined,
  spans = (grouping && grouping.spans) || undefined,
  matcher = (grouping && grouping.matcher) || undefined,
  quotes = (grouping && grouping.quotes) || undefined,
  punctuators = {aggregators: {}},
  opener = quote || (grouping && grouping.opener) || undefined,
  closer = quote || (grouping && grouping.closer) || undefined,
  hinter,
  close = (grouping && grouping.close) || undefined,
}) => ({
  goal,
  punctuator,
  terminator,
  spans,
  matcher,
  quotes,
  punctuators,
  opener,
  closer,
  hinter,
  close,
});

const createGrouper = Grouper;

/// TOKENIZATION

export function* contextualize($, defaults) {
  let $grouper, lastGrouper;

  if (!$.context) {
    const {
      matcher = ($.matcher = defaults.matcher),
      quotes,
      punctuators = ($.punctuators = {aggregators: {}}),
      punctuators: {aggregators = ($punctuators.aggregators = {})},
    } = $;
    $.context = {
      $,
      punctuators,
      aggregators,
      matcher,
      quotes,
    };
  }

  while (true) {
    $grouper = yield ($grouper && $grouper.context) || $.context;

    if (lastGrouper !== (lastGrouper = $grouper) && $grouper && !$grouper.context) {
      if ($grouper && !$grouper.context) {
        const {
          matcher: $matcher,
          quotes: $quotes,
          punctuators: $punctuators,
          punctuators: {aggregators: $aggregators},
        } = $;

        const punctuator = $grouper && $grouper.punctuator;
        const punctuators = ($grouper && $grouper.punctuators) || $punctuators;
        const aggregators = (punctuators && punctuators.aggregators) || $aggregators;
        const closer = ($grouper && $grouper.closer) || undefined;
        const spans = ($grouper && $grouper.spans) || undefined;
        const matcher = ($grouper && $grouper.matcher) || $matcher || undefined;
        const quotes = ($grouper && $grouper.quotes) || $quotes || undefined;

        $grouper.context = {
          $,
          punctuator,
          punctuators,
          aggregators,
          closer,
          spans,
          matcher,
          quotes,
        };
      }
    }
  }
}

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
    grouping = (state.grouping = {
      hints: new Set(),
      groupings: [],
      groupers: {}, // options.mode.groupers || (options.mode.groupers = {}),
    }),
  } = state;

  // const tokenize = (source, sourceType) => (source, {sourceType}, defaults);

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

  let done, parent, last;

  const $grouping = state.grouping;

  // const $contexting = contextualize(state, defaults);

  let lastContext, lastMatcher;

  const {
    [(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax],
  } = defaults.syntaxes;

  let $syntax = $.syntax;

  const $contexting = contextualize($, defaults);
  let $context = $contexting.next().value;

  while (!done) {
    const {
      $: {
        syntax: $syntax,
        matcher: $matcher,
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
        punctuators: $punctuators,
        aggregators: $aggregators,
      },
      punctuator: $$punctuator,
      punctuators: $$punctuators,
      aggregators: $$aggregators,
      closer: $$closer,
      spans: $$spans,
      matcher: $$matcher,
      quotes: $$quotes,
    } = $context;

    // Prime Matcher
    ((state.matcher !== $$matcher && (state.matcher = $$matcher)) ||
      state.index !== $$matcher.lastIndex) &&
      $$matcher.exec(state.source);

    while (lastContext === (lastContext = $context)) {
      state.last = last;

      const lastIndex = state.index || 0;

      $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
      match = state.match = $$matcher.exec(source);
      done = index === (index = state.index = $$matcher.lastIndex) || !match;

      if (done) return;

      // Initial contextual hint (from syntax)
      !$syntax ||
        ($grouping.goal || ($grouping.goal = $syntax),
        $grouping.hint && $grouping.lastSyntax === $syntax) ||
        ($grouping.hints.add($syntax).delete($grouping.lastSyntax),
        ($grouping.hint = [...$grouping.hints].join(' ')),
        ($grouping.context = state.context || (state.context = $grouping.lastSyntax = $syntax)));

      const hint = $grouping.hint;
      const forming = $grouping.goal === $syntax;

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
                ($$spans && $$spans.includes(text) && 'span') ||
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
      const next = {type, text, hint, offset, previous, parent};
      (whitespace && (next.breaks = whitespace.split('\n').length || 0)) ||
        (punctuator && (next.punctuator = punctuator));

      let body;

      if (punctuator || closing) {
        // punctuator closing
        // $syntax hint
        //  groupings next
        // terminator $$comment
        //  text $$quote $$spans
        //    $spans $matchers
        //    $closures
        //  parent
        let hinter = punctuator ? `${$syntax}-${punctuator}` : $grouping.hint;
        let closed, opened;
        let grouper;

        if (closing) {
          closed = grouper = closing && $grouping.groupings.pop();
          grouper &&
            ($grouping.groupings.includes(grouper) || $grouping.hints.delete(grouper.hinter),
            grouper.terminator && ($grouping.terminator = undefined));
          (closed.closure && (next.punctuator = 'closer')) ||
            (closed.span && (next.punctuator = 'span')) ||
            (closed.punctuator && (next.punctuator = closed.punctuator));
          body = grouper.close && grouper.close(next, state, grouper);

          const previousGrouper = (grouper = $grouping.groupings[$grouping.groupings.length - 1]);
          $grouping.goal = (previousGrouper && previousGrouper.goal) || $syntax;
          parent = (parent && parent.parent) || undefined;
        } else if ($$punctuator !== 'comment') {
          const group = `${hinter},${text}`;
          grouper = $grouping.groupers[group];

          if ($$spans && punctuator === 'span') {
            next.punctuator = punctuator = 'span';
            opened =
              grouper ||
              createGrouper({
                goal: $syntax,
                span: $$spans[text],
                matcher: ($matchers && $matchers.span) || undefined,
                hinter,
                punctuator,
              });
          } else if ($$punctuator !== 'quote') {
            if (punctuator === 'quote') {
              opened =
                grouper ||
                createGrouper({
                  goal: 'quote',
                  quote: text,
                  matcher: ($matchers && $matchers.quote) || undefined,
                  spans: ($spans && $spans[text]) || undefined,
                  hinter,
                  punctuator,
                });
            } else if (punctuator === 'comment') {
              opened =
                grouper ||
                createGrouper({
                  goal: 'comment',
                  comment: $comments[text],
                  matcher: ($matchers && $matchers.comment) || undefined,
                  hinter,
                  punctuator,
                });
            } else if (punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || $closures[text];
              'opener' !==
                (next.punctuator = punctuator =
                  (closure.open && closure.open(next, state, previous)) || 'opener') ||
                (opened =
                  grouper ||
                  createGrouper({
                    goal: $syntax,
                    closure,
                    matcher: ($matchers && $matchers.closure) || undefined,
                    hinter,
                    punctuator,
                  }));
            }
          }

          if (opened) {
            $grouping.groupers[group] || ($grouping.groupers[group] = grouper = opened);
            $grouping.groupings.push(grouper);
            $grouping.hints.add(hinter);
            grouper.terminator && ($grouping.terminator = grouper.terminator);
            $grouping.goal = (grouper && grouper.goal) || $syntax;
            parent = next;
          }
        }

        state.context = $grouping.context = $grouping.goal || $syntax;

        if (opened || closed) {
          state.grouper = grouper || undefined;
          // $contexting.next(state.grouper);
          $context = $contexting.next(state.grouper).value;
          $grouping.hint = `${[...$grouping.hints].join(' ')} ${
            $grouping.context ? `in-${$grouping.context}` : ''
          }`;
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
