export const MODULE_URL = import.meta.url;

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
  xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<\?|\?>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
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
    i++ % 10 || (await new Promise(r => setTimeout(r, 1)));
    yield Object.setPrototypeOf(token, Token.prototype);
  }
}

export function render(source, options, defaults = markup.defaults) {
  const {syntax, renderer = defaults.renderer, ...tokenizerOptions} = options || defaults;
  const state = {options: tokenizerOptions};
  return renderer((options.tokenize || tokenize)(source, state, defaults));
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
  open = (grouping && grouping.open) || undefined,
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
  open,
  close,
});

const createGrouper = Grouper;

/// TOKENIZATION

export function* contextualizer($, defaults) {
  let done, grouper;

  $ !== undefined || ($ = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);

  const initialize = context => {
    context.token ||
      (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(tokenizer(context)));
    context;
  };

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

    // matcher.matcher ||
    //   (matcher.matcher = new RegExp(matcher.source, matcher.flags.replace('g', 'y')));

    initialize(
      ($.context = {
        // ... $,
        $,
        punctuators,
        aggregators,
        // matcher: matcher.matcher,
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
  } = $;

  while (true) {
    if (grouper !== (grouper = yield (grouper && grouper.context) || $.context) && grouper && !grouper.context) {
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

      // !matcher ||
      //   matcher.matcher ||
      //   (matcher.matcher = new RegExp(matcher.source, matcher.flags.replace('g', 'y')));

      initialize(
        (grouper.context = {
          // ... $.context,
          $,
          punctuator,
          punctuators,
          aggregators,
          closer,
          spans,
          // matcher: matcher && matcher.matcher,
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
    $: {syntax, keywords, assigners, operators, combinators, nonbreakers, comments, closures, breakers, patterns},
    punctuators,
    aggregators,
    spans,
    quotes,
    forming = true,

    // syntax,
    // keywords,
    // assigners,
    // operators,
    // combinators,
    // nonbreakers,
    // comments,
    // closures,
    // breakers,
    // patterns,
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
    ((assigners && assigners.size) || (combinators && combinators.size)) &&
    (text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false);

  // const seen = tokenizer.seen || new WeakSet();
  // let unseen;
  // seen.has(context) ||
  //   (seen.add(
  //     Object.values(
  //       (unseen = {context}),
  //       !aggregators || (unseen.aggregators = aggregators),
  //       !punctuators || (unseen.punctuators = punctuators),
  //       unseen,
  //     ),
  //   ) && console.log(unseen));

  while (!done) {
    let token, punctuator;
    if (next && next.text) {
      const {
        text, // Text for next production
        type, // Type of next production
        // offset, // Index of next production
        // lineBreaks, // Linebreaks in next production
        hint, // Hint of next production
        previous, // Previous production
        parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
        last, // Last significant production
      } = next;

      if (type === 'sequence') {
        (next.punctuator =
          (aggregate &&
            previous &&
            (aggregators[text] || (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
          (punctuators[text] || (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
          undefined) && (next.type = 'punctuator');
      } else if (type === 'whitespace') {
        next.lineBreaks = text.match(LineEndings).length - 1;
      } else if (forming && wording) {
        // type !== 'indent' &&
        const word = text.trim();
        word &&
          ((keywords &&
            keywords.includes(word) &&
            (!last || last.punctuator !== 'nonbreaker' || (previous && previous.lineBreaks > 0)) &&
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

  const {[(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax]} = defaults.syntaxes;

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
      // syntax, matchers, comments, spans, closures,

      punctuator: $$punctuator,
      closer: $$closer,
      spans: $$spans,
      // matcher: $$matcher,
      matcher: {
        matcher: $$matcher = ($context.matcher.matcher = new RegExp(
          $context.matcher.source,
          $context.matcher.flags, // .replace('g', 'y'),
        )),
      },
      token,
      // token = ($context.token = (tokenizer => (
      //   tokenizer.next(), token => tokenizer.next(token).value
      // ))(tokenizer($context))),
      forming = true,
    } = $context;

    // Prime Matcher
    // ((state.matcher !== $$matcher && (state.matcher = $$matcher)) ||
    //   state.index !== $$matcher.lastIndex) &&
    //   $$matcher.exec(state.source);

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
        ($$closer.test ? $$closer.test(text) : $$closer === text || (whitespace && whitespace.includes($$closer)));

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
            // const span = $$spans[text];
            const span = $$spans.get(text);
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
              // const comment = comments[text];
              const comment = comments.get(text);
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
              // const closure = (grouper && grouper.closure) || closures[text];
              const closure = (grouper && grouper.closure) || closures.get(text);
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
          grouping.hint = `${[...grouping.hints].join(' ')} ${grouping.context ? `in-${grouping.context}` : ''}`;
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
            body.length > 0 && ((tokens = tokenize(body, {options: {syntax}}, defaults)), (nextIndex = index));
            const hint = `${syntax}-in-${$.syntax}`;
            token = token => ((token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token);
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
            yield (previous = next);
          }
        }
        nextIndex > index && (state.index = nextIndex);
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
// if (body.syntax && body.text) {
//   const {syntax, text} = body;
//   const state = {options: {syntax}};
//   const tokens = tokenize(text, state, defaults);
//   for (const token of tokens) yield token;
// }

// const aggregate =
//   assigners || combinators
//     ? ((...aggregators) => {
//         const aggregates = {};
//         if (aggregators.length) {
//           let aggregated = 0;
//           for (const aggregate of aggregators)
//             if (aggregate)
//               for (const symbol of aggregate[1])
//                 !symbol ||
//                   aggregates[symbol] ||
//                   ((aggregates[symbol] = aggregate[0]), aggregated++);
//           if (!aggregated) return false;
//         }
//         const aggregator = text => aggregates[text] || false;
//         aggregator.aggregates = aggregates;
//         return aggregator;
//       })(
//         assigners && (assigners.size > 0 || assigners.length > 0) && ['assigner', assigners],
//         combinators &&
//           (combinators.size > 0 || combinators.length > 0) && ['combinator', combinators],
//       )
//     : false;
