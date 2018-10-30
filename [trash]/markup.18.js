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
  md: {patterns},
};
export const modes = {
  '*': {syntax: 'es'},
  css: {syntax: 'css'},
  js: {syntax: 'es'},
  html: {syntax: 'html'},
  md: {syntax: 'md'},

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
    if (!token) continue;
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
  syntax,
  goal = syntax,
  quote,
  comment,
  closure,
  span,
  grouping = comment || closure || span || undefined,

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
  syntax,
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

export function* contextualizer($, defaults) {
  let grouper;

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
    if (
      grouper !== (grouper = yield (grouper && grouper.context) || $.context) &&
      grouper &&
      !grouper.context
    ) {
      const {
        syntax: $syntax,
        matcher: $matcher,
        quotes: $quotes,
        punctuators: $punctuators,
        punctuators: {aggregators: $aggregators},
      } = $;

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

      grouper.context = {
        $,
        punctuator,
        punctuators,
        aggregators,
        closer,
        spans,
        matcher,
        quotes,
        forming,
      };
    }
  }
}

export function* tokenizer(context) {
  let done, next;

  const {
    $: {
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
        breaks, // Linebreaks in next production
        hint, // Hint of next production
        previous, // Previous production
        parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
        last, // Last significant production
        // forming, //
      } = next;

      if (type === 'sequence') {
        (next.punctuator =
          (previous &&
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
            // (!previous || previous.punctuator !== 'nonbreaker') &&
            (!last || last.punctuator !== 'nonbreaker') &&
            (next.type = 'keyword')) ||
            (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
      }

      token = next; // {type, text, offset, punctuator, breaks, hint, previous, parent};
    }

    next = yield token;
  }
}

// TODO: <@SMotaal> Refactor
export function* tokenize(source, state = {}, defaults = markup.defaults) {
  const syntaxes = defaults.syntaxes;

  let {
    match,
    index,
    // matcher = (state.matcher = defaults.matcher),
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
      groupings: [], // sourceMode.groupings || (sourceMode.groupings = []),
      groupers: sourceMode.groupers || (sourceMode.groupers = {}),
      // groupers: {}, // options.mode.groupers || (options.mode.groupers = {}),
    }),
  } = state;

  (state.source === (state.source = source) && index >= 0) ||
    (index = state.index = (index > 0 && index % source.length) || 0);

  let done, parent, last;

  let lastContext, lastMatcher;

  const {
    [(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax],
  } = defaults.syntaxes;

  const $contexting = contextualizer($, defaults);
  let $context = $contexting.next().value;

  while (!done) {
    const {
      $: {syntax, matchers, comments, spans, closures},
      punctuator: $$punctuator,
      closer: $$closer,
      spans: $$spans,
      matcher: $$matcher,
      token = ($context.token = (tokenizer => (
        tokenizer.next(), token => tokenizer.next(token).value
      ))(tokenizer($context))),
      forming = true,
    } = $context;

    // Prime Matcher
    ((state.matcher !== $$matcher && (state.matcher = $$matcher)) ||
      state.index !== $$matcher.lastIndex) &&
      $$matcher.exec(state.source);

    // Initial contextual hint (syntax)
    !syntax ||
      (grouping.goal || (grouping.goal = syntax),
      grouping.hint && grouping.lastSyntax === syntax) ||
      (grouping.hints.add(syntax).delete(grouping.lastSyntax),
      (grouping.hint = [...grouping.hints].join(' ')),
      (grouping.context = state.context || (state.context = grouping.lastSyntax = syntax)));

    const hint = grouping.hint;

    while (lastContext === (lastContext = $context)) {
      let next;

      state.last = last;

      const lastIndex = state.index || 0;

      $$matcher.lastIndex === lastIndex || ($$matcher.lastIndex = lastIndex);
      match = state.match = $$matcher.exec(source);
      done = index === (index = state.index = $$matcher.lastIndex) || !match;

      if (done) return;

      // Current contextual hint (syntax or hint)

      // const forming = grouping.goal === syntax;

      // Current contextual match
      const {0: text, 1: whitespace = '', 2: sequence = '', index: offset} = match;

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
          // forming,
        })),
        previous && (previous.next = next),
        yield (previous = next));

      // Current contextual fragment
      next = token({
        type: (whitespace && 'whitespace') || (sequence && 'sequence') || 'text',
        text: whitespace || sequence || pre || '',
        offset,
        previous,
        parent,
        hint,
        last,
      });

      // Current contextual punctuator (from sequence)
      const closing =
        $$closer &&
        ($$closer.test
          ? $$closer.test(text)
          : $$closer === text || (whitespace && whitespace.includes($$closer)));

      let body;
      let punctuator = next.punctuator;

      if (punctuator || closing) {
        // punctuator text closing next parent
        // syntax matchers closures spans $$spans

        let hinter = punctuator ? `${syntax}-${punctuator}` : grouping.hint;
        let closed, opened, grouper;

        if (closing) {
          closed = grouper = closing && grouping.groupings.pop();
          next.closed = closed;
          grouper &&
            (grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter),
            grouper.terminator && (grouping.terminator = undefined));
          // (closed.closure && (next.punctuator = 'closer')) ||
          (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
            // (closed.punctuator === 'span' && (next.punctuator = 'span')) ||
            // (closed.span && (next.punctuator = 'span')) ||
            (closed.punctuator && (next.punctuator = closed.punctuator));
          body = grouper.close && grouper.close(next, state, grouper);

          const previousGrouper = (grouper = grouping.groupings[grouping.groupings.length - 1]);
          grouping.goal = (previousGrouper && previousGrouper.goal) || syntax;
          parent = (parent && parent.parent) || undefined;
        } else if ($$punctuator !== 'comment') {
          const group = `${hinter},${text}`;
          grouper = grouping.groupers[group];

          if ($$spans && punctuator === 'span') {
            next.punctuator = punctuator = 'span';
            opened =
              grouper ||
              createGrouper({
                syntax,
                goal: syntax,
                span: $$spans[text],
                matcher: (matchers && matchers.span) || undefined,
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
              opened =
                grouper ||
                createGrouper({
                  syntax,
                  goal: punctuator,
                  comment: comments[text],
                  matcher: (matchers && matchers.comment) || undefined,
                  hinter,
                  punctuator,
                });
            } else if (punctuator === 'closure') {
              const closure = (grouper && grouper.closure) || closures[text];
              'opener' !==
                (next.punctuator = punctuator =
                  (closure.open && closure.open(next, state, previous)) || 'opener') ||
                (opened =
                  grouper ||
                  createGrouper({
                    syntax,
                    goal: syntax,
                    closure,
                    matcher: (matchers && matchers.closure) || undefined,
                    hinter,
                    punctuator,
                  }));
            }
          }

          if (opened) {
            grouping.groupers[group] || (grouping.groupers[group] = grouper = opened);
            grouping.groupings.push(grouper);
            grouping.hints.add(hinter);
            grouper.terminator && (grouping.terminator = grouper.terminator);
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
        }
      }

      // Current contextual tail token (yield from sequence)
      previous && (previous.next = next);
      yield (previous = next);

      // Next reference to last contextual sequence token
      next && !whitespace && forming && (last = next);

      if (body && body.length) {
        for (const next of body) {
          previous && (previous.next = next);
          yield (previous = next);
        }
      }
    }
  }
}

// // Matched whitespace of next production
// whitespace,
// // Matched sequence of next production
// sequence,
// // Unmatched sequence before next production
// pre,
// Text for next production
// text, = next.text = whitespace || sequence || pre || '',
// Type of next production
// type, = next.type = (whitespace && 'whitespace') || (sequence && 'sequence') || (pre && 'pre') || 'text',

// $$closer &&
// (($$closer.test && $$closer.test(text)) ||
//   ($$closer.length &&
//     ($$closer === text || (whitespace && whitespace.includes($$closer)))));
// const goal = (grouper && grouper.goal) || $syntax;
// const punctuator = grouper && grouper.punctuator;
// const punctuators = (grouper && grouper.punctuators) || $punctuators;
// const aggregators = (punctuators && punctuators.aggregators) || $aggregators;
// const closer = (grouper && grouper.closer) || undefined;
// const spans = (grouper && grouper.spans) || undefined;
// const matcher = (grouper && grouper.matcher) || $matcher || undefined;
// const quotes = (grouper && grouper.quotes) || $quotes || undefined;
// const forming = goal === $syntax;
