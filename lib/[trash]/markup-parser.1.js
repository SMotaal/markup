/** Markup (render) @author Saleh Abdel Motaal */
export function markup(source, options, defaults = markup.defaults) {
  return [...render(source, options, defaults)];
}

/// REGULAR EXPRESSIONS

/** Non-alphanumeric symbol matching expressions (inteded to be extended) */
export const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

/** Special alpha-numeric symbol test expressions (inteded to be extended) */
export const patterns = {
  /** Basic latin Keyword like symbol (inteded to be extended) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES
/** Syntax definitions (inteded to be extended) */
export const syntaxes = {default: {patterns, matcher: matchers.sequences}};

/** Mode states (inteded to be extended) */
export const modes = {default: {syntax: 'default'}};

/// DEFAULTS
/** Parsing defaults (inteded to be extended) */
export const defaults = (markup.defaults = {
  matcher: matchers.sequences,
  syntax: 'default',
  sourceType: 'default',
  renderers: {text: String},
  renderer,
  get syntaxes() {
    return syntaxes;
  },
  set syntaxes(value) {
    if (this !== defaults)
      throw Error(
        'Invalid assignment: direct assignment to defaults is not allowed. Use Object.create(defaults) to create a mutable instance of defaults first.',
      );
    Object.defineProperty(this, 'syntaxes', {value});
  },
});

const Null = Object.freeze(Object.create(null));

/// RENDERING
/** Token prototype (inteded to be extended) */
class Token {
  toString() {
    return this.text;
  }
}

export async function* renderer(tokens) {
  let i = 0;
  for await (const token of tokens) {
    if (!token) continue;
    // i++ % 100 || (await 0);
    i++ % 10 || (await new Promise(r => setTimeout(r, 1)));
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
  // terminator = (comment && comment.closer) || undefined,
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
  // terminator,
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
  let done, grouper;

  $ !== undefined ||
    ($ = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);

  if (!$.context) {
    const {
      syntax,
      matcher = ($.matcher = defaults.matcher),
      quotes,
      punctuators = ($.punctuators = {aggregators: {}}),
      punctuators: {aggregators = ($punctuators.aggregators = {})},
      patterns: {
        maybeKeyword = ($.patterns.maybeKeyword =
          ((defaults && defaults.patterns) || patterns).maybeKeyword || undefined),
      } = ($.patterns = {maybeKeyword: null}),
      spans: {[syntax]: spans} = Null,
    } = $;

    $.context = {
      $,
      punctuators,
      aggregators,
      matcher,
      quotes,
      spans,
    };
  }

  const {
    syntax: $syntax,
    matcher: $matcher,
    quotes: $quotes,
    punctuators: $punctuators,
    punctuators: {aggregators: $aggregators},
  } = $;

  while (true) {
    if (
      grouper !== (grouper = yield (grouper && grouper.context) || $.context) &&
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

// TODO: <@SMotaal> Refactor
export function* tokenize(source, state = {}, defaults = markup.defaults) {
  const syntaxes = defaults.syntaxes;

  let {
    match,
    index,
    // matcher = (state.matcher = defaults.matcher),
    options: {
      sourceType = (options.sourceType = options.syntax || defaults.sourceType),
      // mode: sourceMode = (options.mode = modes[sourceType] || modes[defaults.sourceType]),
    } = (state.options = {}),
    previous = null,
    // mode = (state.mode = sourceMode),
    mode = (state.mode = modes[sourceType] || modes[defaults.sourceType]),
    mode: {syntax},
    // mode: {syntax = (mode = {syntax: defaults.syntax, ...sourceMode}).syntax},
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
          grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter);
          (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
            (closed.punctuator && (next.punctuator = closed.punctuator));
          body = grouper.close && grouper.close(next, state, grouper);

          const previousGrouper = (grouper = grouping.groupings[grouping.groupings.length - 1]);
          grouping.goal = (previousGrouper && previousGrouper.goal) || syntax;
          parent = (parent && parent.parent) || top;
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
                (punctuator =
                  (closure.open &&
                    (next = closure.open(next, state, previous) || next).punctuator) ||
                  (next.punctuator = 'opener')) ||
                (opened =
                  grouper ||
                  createGrouper({
                    syntax,
                    goal: syntax,
                    closure,
                    matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                    // matcher: (matchers && (matchers[`closure,${text}`] || matchers.closure)) || undefined,
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
        }
      }

      // Current contextual tail token (yield from sequence)
      yield (previous = next);

      // Next reference to last contextual sequence token
      next && !whitespace && forming && (last = next);

      if (body) {
        // if (body.syntax && body.text) {
        //   const {syntax, text} = body;
        //   const state = {options: {syntax}};
        //   const tokens = tokenize(text, state, defaults);
        //   for (const token of tokens) yield token;
        // }
        if (body.length) {
          for (const next of body) {
            previous && (previous.next = next);
            yield (previous = next);
          }
        }
      }
    }
  }
}

// (next.punctuator = punctuator =
//   (closure.open &&
//     closure.open(next, state, previous) &&
//     (next.punctuator || punctuator)) ||
//   'opener') ||
// (next.punctuator = punctuator =
//   (closure.open && closure.open(next, state, previous)) || 'opener') ||
