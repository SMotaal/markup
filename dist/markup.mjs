/** Markup (render) @author Saleh Abdel Motaal */
function markup(source, options, defaults = markup.defaults) {
  return [...render(source, options, defaults)];
}

/// REGULAR EXPRESSIONS

/** Non-alphanumeric symbol matching expressions (inteded to be extended) */
const matchers = {
  escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
  comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
  quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
  xml: /([\s\n]+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
  sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
};

/** Special alpha-numeric symbol test expressions (inteded to be extended) */
const patterns = {
  /** Basic latin Keyword like symbol (inteded to be extended) */
  maybeKeyword: /^[a-z](\w*)$/i,
};

/// SYNTAXES
/** Syntax definitions (inteded to be extended) */
const syntaxes = {default: {patterns, matcher: matchers.sequences}};

/** Mode states (inteded to be extended) */
const modes = {default: {syntax: 'default'}};

/// DEFAULTS
/** Parsing defaults (inteded to be extended) */
const defaults = (markup.defaults = {
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

async function* renderer(tokens) {
  let i = 0;
  for await (const token of tokens) {
    if (!token) continue;
    i++ % 10 || (await new Promise(r => setTimeout(r, 1)));
    yield Object.setPrototypeOf(token, Token.prototype);
  }
}

function render(source, options, defaults = markup.defaults) {
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

function* contextualizer($, defaults) {
  let grouper;

  $ !== undefined ||
    ($ = (defaults && defaults.syntaxes && defaults.syntaxes.default) || syntaxes.default);

  const initialize = context => {
    context.token ||
      (context.token = (tokenizer => (tokenizer.next(), token => tokenizer.next(token).value))(
        tokenizer(context),
      ));
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

function* tokenizer(context) {
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
    let token;
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
        // type !== 'indent' &&
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
function* tokenize(source, state = {}, defaults = markup.defaults) {
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
            const hint = `${syntax}-in-${$.syntax}`;
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

var parser = /*#__PURE__*/Object.freeze({
  markup: markup,
  matchers: matchers,
  patterns: patterns,
  syntaxes: syntaxes,
  modes: modes,
  defaults: defaults,
  renderer: renderer,
  render: render,
  contextualizer: contextualizer,
  tokenizer: tokenizer,
  tokenize: tokenize
});

/// Helpers
const raw = String.raw;

/**
 * Create a sequence match expression from patterns.
 *
 * @param  {...Pattern} patterns
 */
const sequence = (...patterns) =>
  new RegExp(Reflect.apply(raw, null, patterns.map(p => (p && p.source) || p || '')), 'g');

/**
 * Create a maybeIdentifier test (ie [<first>][<other>]*) expression.
 *
 * @param  {Entity} first - Valid ^[<…>] entity
 * @param  {Entity} other - Valid [<…>]*$ entity
 * @param  {string} [flags] - RegExp flags (defaults to 'u')
 * @param  {unknown} [boundary]
 */
const identifier = (
  first,
  other = first,
  flags = 'u',
  boundary = /yg/.test(flags) && '\\b',
) => new RegExp(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

/**
 * Create a sequence pattern from patterns.
 *
 * @param  {...Pattern} patterns
 */
const all$1 = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

/// Symbols

class Symbols$1 extends Set {
  static from(...sources) {
    const Species = this || Symbols$1;
    const symbols = (sources.length && Species.split(sources)) || [];
    return new Species(symbols);
  }

  get(symbol) {
    if (this.has(symbol)) return symbol;
  }

  static split(...sources) {
    const Species = this || Symbols$1;
    const symbols = [];
    for (const source of sources.flat()) {
      source &&
        (typeof source === 'string'
          ? symbols.push(...source.split(/ +/))
          : Symbol.iterator in source && symbols.push(...Species.split(...source)));
    }
    return symbols;
  }
}

{
  const {has} = Object.getOwnPropertyDescriptors(Set.prototype);
  const {map} = Object.getOwnPropertyDescriptors(Array.prototype);
  Object.defineProperties(Symbols$1.prototype, {includes: has, map});
}

/// Closures

class Closure extends String {
  constructor(opener, closer = opener) {
    if (!opener || !closer) throw Error(`Cannot construct closure from "${opener}" … "${closer}"`);
    super(`${opener}…${closer}`);
    this.opener = opener;
    this.closer = closer;
  }
}

class Closures extends Map {
  static from(...sources) {
    const Species = this || Closures;
    const closures = (sources.length && Species.split(sources)) || [];
    return new Species(closures);
  }
  static split(...sources) {
    const Species = this || Closures;
    const Member = Species.Element || Closure;
    const closures = [];
    for (const source of sources.flat()) {
      if (source) {
        switch (typeof source) {
          case 'object': {
            if (source instanceof Member) {
              closures.push([source.opener, source]);
            } else if (source instanceof Species) {
              closures.push(...source);
            }
            break;
          }
          case 'string': {
            for (const pair of source.split(/ *?([^ ]+…[^ ]+|[^ …]+) *?/)) {
              if (!pair) continue;
              const [opener, closer] = pair.split('…');
              const closure = new Member(opener, closer);
              closures.push([opener, closure]);
            }
            break;
          }
        }
      }
    }
    return closures;
  }
}

{
  const {has} = Object.getOwnPropertyDescriptors(Map.prototype);
  Object.defineProperties(Closures.prototype, {includes: has});
}

// export const Symbols = Object.defineProperty(
//   source =>
//     (source &&
//       ((typeof source === 'string' && source.split(/ +/)) ||
//         (Symbol.iterator in source && [...source]))) ||
//     [],
//   'from',
//   {value: (...args) => [...new Set([].concat(...args.map(Symbols)))]},
// );
// export const Symbols = Object.defineProperty(source => Symbols.from(source), 'from', {
//   value: (...args) => Symbols.from(...args),
// });

// export const closures = string => {
//   const pairs = Symbols.from(string);
//   const array = new Array(pairs.size);
//   const entries = {};
//   array.pairs = pairs;
//   let i = 0;
//   for (const pair of pairs) {
//     const [opener, closer] = pair.split('…');
//     // array[(array[i++] = opener)] = {opener, closer};
//     entries[(array[i++] = opener)] = {opener, closer};
//   }
//   array.get = opener => entries[opener];
//   array.toString = () => string;
//   return array;
// };

// export const lines = string => string.split(/\n+/),

var helpers = /*#__PURE__*/Object.freeze({
  raw: raw,
  sequence: sequence,
  identifier: identifier,
  all: all$1,
  Symbols: Symbols$1,
  Closure: Closure,
  Closures: Closures
});

/** @typedef {RegExp|string} Pattern - Valid /(…)/ sub expression */

/// Entities

/**
 * The collection of Regular Expressions used to match specific
 * markup sequences in a given context or to test matched sequences verbosely
 * in order to further categorize them. Full support for Unicode Classes and
 * Properties has been included in the ECMAScript specification but certain
 * engines are still implementing them.
 *
 * @type {{[name: string]: {[name: string]: Entity}}}
 */
const entities = {
  es: {
    /** http://www.ecma-international.org/ecma-262/9.0/#prod-IdentifierStart */
    IdentifierStart: raw`_$\p{ID_Start}`,
    /** http://www.ecma-international.org/ecma-262/9.0/#prod-IdentifierPart */
    IdentifierPart: raw`_$\u200c\u200d\p{ID_Continue}`,
  },
};

/** Interoperability (for some browsers) */
(Ranges => {
  const transforms = [];

  if (!supports(raw`\p{ID_Start}`, 'u')) {
    const UnicodePropertyEscapes = /\\p{ *(\w+) *}/g;
    UnicodePropertyEscapes.replace = (m, propertyKey) => {
      if (propertyKey in Ranges) return Ranges[propertyKey].toString();
      throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
    };
    transforms.push(expression => {
      let flags = expression && expression.flags;
      let source = expression && `${expression.source || expression || ''}`;
      source &&
        UnicodePropertyEscapes.test(source) &&
        (source = source.replace(UnicodePropertyEscapes, UnicodePropertyEscapes.replace));
      return (flags && new RegExp(source, flags)) || source;
    });
  }

  if (!transforms.length) return;

  for (const key in entities) {
    const sources = entities[key];
    const changes = {};
    for (const id in sources) {
      let source = sources[id];
      if (!source || typeof source !== 'string') continue;
      for (const transform of transforms) source = transform(source);
      !source || source === sources[id] || (changes[id] = source);
    }
    Object.assign(sources, changes);
  }

  // prettier-ignore
  function supports() {try {return !!RegExp(... arguments)} catch (e) { }}
})({
  ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
  ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
});

// /// Regular Expressions
// export const RegExpUnicodeProperties = /\\p{ *(\w+) *}/g;

// RegExpUnicodeProperties.replace = (m, propertyKey) => {
//   // const property = ASCII[propertyKey] || Unicode[propertyKey];
//   const property = Ranges[propertyKey];
//   if (property) return property.toString();
//   throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
// };

// RegExpUnicodeProperties.rewrite = expression => {
//   let flags = expression && expression.flags;
//   let source = expression && `${expression.source || expression || ''}`;
//   source &&
//     RegExpUnicodeProperties.test(source) &&
//     (source = source.replace(RegExpUnicodeProperties, RegExpUnicodeProperties.replace));
//   return (flags && new RegExp(source, flags)) || source;
// };

// /// Interoperability
// export const supported =
//   // TODO: Remove when ssupporting non-unicode runtimes [not in scope]
//   new RegExp(raw`\uFFFF`, 'u') &&
//   supports(
//     UnicodeProperties => new RegExp(raw`\p{L}`, 'u'),
//     UnicodeClasses => new RegExp(raw`\p{ID_Start}\p{ID_Continue}`, 'u'),
//   );

// async function replaceUnsupportedExpressions() {
//   // await Unicode.initialize(); console.log(Unicode);
//   for (const key in entities) {
//     const sources = entities[key];
//     const replacements = {};
//     for (const id in sources)
//       !sources[id] ||
//         typeof (sources[id].source || sources[id]) !== 'string' ||
//         (replacements[id] = RegExpUnicodeProperties.rewrite(sources[id]));
//     Object.assign(sources, replacements);
//   }
//   return;
// }

// function supports(feature, ...features) {
//   if (feature) {
//     try {
//       feature();
//     } catch (exception) {
//       return false;
//     }
//   }
//   return !features.length || Reflect.apply(supports, null, features);
// }

// // TODO: Fix UnicodeRange.merge if not implemented in Firefox soon
// // import {Unicode} from './unicode/unicode.js';

// // TODO: Remove Ranges once UnicodeRange is working
// const Ranges = {
//   // L: 'a-zA-Z',
//   // N: '0-9',
//   ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
//   ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
// };

// /// Bootstrap
// export const ready = (entities.ready = supported
//   ? Promise.resolve()
//   : replaceUnsupportedExpressions());

const defaults$1 = {
  aliases: ['ps', 'eps'],
  syntax: 'postscript',
};

const keywords =
  'abs add aload anchorsearch and arc arcn arct arcto array ashow astore atan awidthshow begin bind bitshift bytesavailable cachestatus ceiling charpath clear cleartomark cleardictstack clip clippath closefile closepath colorimage concat concatmatrix condition configurationerror copy copypage cos count countdictstack countexecstack counttomark cshow currentblackgeneration currentcacheparams currentcmykcolor currentcolor currentcolorrendering currentcolorscreen currentcolorspace currentcolortransfer currentcontext currentdash currentdevparams currentdict currentfile currentflat currentfont currentglobal currentgray currentgstate currenthalftone currenthalftonephase currenthsbcolor currentlinecap currentlinejoin currentlinewidth currentmatrix currentmiterlimit currentobjectformat currentpacking currentpagedevice currentpoint currentrgbcolor currentscreen currentshared currentstrokeadjust currentsystemparams currenttransfer currentundercolorremoval currentuserparams curveto cvi cvlit cvn cvr cvrs cvs cvx def defaultmatrix definefont defineresource defineusername defineuserobject deletefile detach deviceinfo dict dictfull dictstack dictstackoverflow dictstackunderflow div dtransform dup echo eexec end eoclip eofill eoviewclip eq erasepage errordict exch exec execform execstack execstackoverflow execuserobject executeonly executive exit exp false file filenameforall fileposition fill filter findencoding findfont findresource flattenpath floor flush flushfile FontDirectory for forall fork ge get getinterval globaldict GlobalFontDirectory glyphshow grestore grestoreall gsave gstate gt handleerror identmatrix idiv idtransform if ifelse image imagemask index ineofill infill initclip initgraphics initmatrix initviewclip instroke internaldict interrupt inueofill inufill inustroke invalidaccess invalidcontext invalidexit invalidfileaccess invalidfont invalidid invalidrestore invertmatrix ioerror ISOLatin1Encoding itransform join kshow known languagelevel le length limitcheck lineto ln load lock log loop lt makefont makepattern mark matrix maxlength mod monitor moveto mul ne neg newpath noaccess nocurrentpoint not notify null nulldevice or packedarray pathbbox pathforall pop print printobject product prompt pstack put putinterval quit rand rangecheck rcurveto read readhexstring readline readonly readstring realtime rectclip rectfill rectstroke rectviewclip renamefile repeat resetfile resourceforall resourcestatus restore reversepath revision rlineto rmoveto roll rootfont rotate round rrand run save scale scalefont scheck search selectfont serialnumber setbbox setblackgeneration setcachedevice setcachedevice2 setcachelimit setcacheparams setcharwidth setcmykcolor setcolor setcolorrendering setcolorscreen setcolorspace setcolortransfer setdash setdevparams setfileposition setflat setfont setglobal setgray setgstate sethalftone sethalftonephase sethsbcolor setlinecap setlinejoin setlinewidth setmatrix setmiterlimit setobjectformat setoverprint setpacking setpagedevice setpattern setrgbcolor setscreen setshared setstrokeadjust setsystemparams settransfer setucacheparams setundercolorremoval setuserparams setvmthreshold shareddict show showpage sin sqrt srand stack stackoverflow stackunderflow StandardEncoding start startjob status statusdict stop stopped store string stringwidth stroke strokepath sub syntaxerror systemdict timeout transform translate true truncate type typecheck token uappend ucache ucachestatus ueofill ufill undef undefined undefinedfilename undefineresource undefinedresult undefinefont undefineresource undefinedresource undefineuserobject unmatchedmark unregistered upath userdict UserObjects usertime ustroke ustrokepath version viewclip viewclippath VMerror vmreclaim vmstatus wait wcheck where widthshow write writehexstring writeobject writestring wtranslation xcheck xor xshow xyshow yield yshow';
// const quotes = `(…) <…> <~…~>`;
const enclosures = `{…} […] <<…>> (…) <~…~> <…>`;

/// PATTERNS
const COMMENTS = /%/;
const OPERATORS = /\/\/|\/|={1,2}/;
const ENCLOSURES = /<<|>>|{|}|\[|\]/;
const QUOTES = /<~|~>|<|>|\(|\)/;
const WHITESPACE = /[\s\n]+/; // /[\0\x09\x0A\x0C\x0D\x20]/;

// NUMBERS
const DECIMAL = /[+\-]?\d+\.?|[+\-]?\d*\.\d+/;
const EXPONENTIAL = /\d+[eE]\-?\d+|\d+\.\d+[eE]\-?\d+/;
const RADIX = /[2-9]#\d+|1\d#[\da-jA-J]+|2\d#[\da-tA-T]+|3[0-6][\da-zA-Z]+/;

// NAMES
const NAME = /[\da-zA-Z$@.\-]+/;
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]|\\.|.)*?\)[^()]+\))\)/
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]|\\.|.)*\)[^()]+\))\)/
// const STRING = /\((?:[^\\]|\\.|\((?:[^\\]*?|\\.)*?\)[^()\\]*\))+?\)/
// const STRING = /\((?:[^()]*|\(.*?\)[^()]*\))*\)/

const postscript = Object.defineProperties(
  ({symbols, closures, sequence}, {aliases, syntax} = defaults$1) => ({
    syntax,
    keywords: Symbols.from(keywords),
    quotes: closures(quotes),
    closures: closures(enclosures),
    patterns: {
      maybeIdentifier: new RegExp(`^${NAME.source}$`),
    },
    matcher: sequence`(${WHITESPACE})|(${all(COMMENTS, OPERATORS, ENCLOSURES, QUOTES)})|(${all(
      DECIMAL,
      EXPONENTIAL,
      RADIX,
      NAME,
    )})`,
    matchers: {
      // '(': /(\\?\n)|(\\.|(?:[^()]+|\(.*\)|))/
    },
  }),
  {
    defaults: {get: () => ({...defaults$1})},
  },
);

// ...(modes[syntax] = {syntax}),

// ...(modes.html = {syntax: 'html'}),
// keywords: symbols('DOCTYPE doctype'),
// comments: closures('<!--…-->'),
// quotes: [],
// closures: closures('<%…%> <!…> <…/> </…> <…>'),
// patterns: {
//   ...patterns,
//   closeTag: /<\/\w[^<>{}]*?>/g,
//   maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
// },
// matcher: matchers.xml,
// matchers: {
//   quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
//   comment: /(\n)|(-->)/g,
// },
// if (aliases) for (const mode of postscript.aliases) modes[id] = modes[syntax];



var extensions = /*#__PURE__*/Object.freeze({
  postscript: postscript
});

/// INTERFACE
const definitions = {};

const install = (defaults$$1, newSyntaxes = defaults$$1.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes$1);
  Object.defineProperties(newSyntaxes, definitions);
  defaults$$1.syntaxes === newSyntaxes || (defaults$$1.syntaxes = newSyntaxes);
};

const syntaxes$1 = {};

/// DEFINITIONS
Syntaxes: {
  const {Closures: Closures$$1, Symbols, sequence: sequence$$1, all, raw: raw$$1} = helpers;

  CSS: {
    const css = (syntaxes$1.css = {
      ...(modes.css = {syntax: 'css'}),
      comments: Closures$$1.from('/*…*/'),
      closures: Closures$$1.from('{…} (…) […]'),
      quotes: Symbols.from(`' "`),
      assigners: Symbols.from(`:`),
      combinators: Symbols.from('> :: + :'),
      nonbreakers: Symbols.from(`-`),
      breakers: Symbols.from(', ;'),
      patterns: {...patterns},
      matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|any|any-link|backdrop|before|checked|default|defined|dir|disabled|empty|enabled|first|first-child|first-letter|first-line|first-of-type|focus|focus-visible|focus-within|fullscreen|host|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|required|right|root|scope|target|valid|visited))/g,
      matchers: {
        quote: matchers.escapes,
        comment: matchers.comments,
      },
    });
  }

  HTML: {
    const html = (syntaxes$1.html = {
      ...(modes.html = {syntax: 'html'}),
      keywords: Symbols.from('DOCTYPE doctype'),
      comments: Closures$$1.from('<!--…-->'),
      closures: Closures$$1.from('<%…%> <!…> <…/> </…> <…>'),
      quotes: [],
      patterns: {
        ...patterns,
        closeTag: /<\/\w[^<>{}]*?>/g,
        maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
      },
      matcher: matchers.xml,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
        comment: /(\n)|(-->)/g,
      },
    });

    {
      const DOCTAGS = Symbols.from('SCRIPT STYLE');
      const TAG = /^[a-z]+$/i;
      // TODO: Check if custom/namespace tags ever need special close logic
      // const TAGLIKE = /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/i;

      const HTMLTagClosure = html.closures.get('<');

      HTMLTagClosure.close = (next, state, context) => {
        const parent = next && next.parent;
        const first = parent && parent.next;
        const tag = first && first.text && TAG.test(first.text) && first.text.toUpperCase();

        if (tag && DOCTAGS.includes(tag)) {
          // TODO: Uncomment once token buffering is implemented
          // tag && (first.type = 'keyword');

          let {source, index} = state;
          const $$matcher = syntaxes$1.html.patterns.closeTag;

          let match; //  = $$matcher.exec(source);
          $$matcher.lastIndex = index;

          // TODO: Check if `<script>`…`</SCRIPT>` is still valid!
          const $$closer = new RegExp(raw$$1`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

          let syntax = (tag === 'STYLE' && 'css') || '';

          if (!syntax) {
            const openTag = source.slice(parent.offset, index);
            const match = /\stype=.*?\b(.+?)\b/.exec(openTag);
            syntax =
              tag === 'SCRIPT' && (!match || !match[1] || /^module$|javascript/i.test(match[1]))
                ? 'es'
                : '';
            // console.log({syntax, tag, match, openTag});
          }

          while ((match = $$matcher.exec(source))) {
            if ($$closer.test(match[0])) {
              if (syntax) {
                return {offset: index, index: match.index, syntax};
              } else {
                const offset = index;
                const text = source.slice(offset, match.index - 1);
                state.index = match.index;
                return [{text, offset, previous: next, parent}];
              }
            }
          }
        }
      };
      HTMLTagClosure.quotes = Symbols.from(`' "`);
      HTMLTagClosure.closer = /\/?>/;

      // TODO: Allow grouping-level patterns for HTML attributes vs text
      // html.closures['<'].patterns = { maybeIdentifier: TAGLIKE };
    }
  }

  Markdown: {
    const BLOCK = '```…``` ~~~…~~~';
    const INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
    const CLOSURES = `${BLOCK} ${INLINE}`;

    const html = syntaxes$1.html;
    const md = (syntaxes$1.md = {
      ...(modes.markdown = modes.md = {syntax: 'md'}),
      comments: Closures$$1.from('<!--…-->'),
      quotes: [],
      closures: Closures$$1.from(html.closures, CLOSURES),
      patterns: {...html.patterns},
      matcher: /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|--+|==+|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|\b([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)/gim,
      spans: undefined,
      matchers: {comment: /(\n)|(-->)/g},
    });

    if (md.closures) {

      const previousTextFrom = (token, matcher) => {
        const text = [];
        if (matcher != null) {
          if (matcher.test)
            do token.text && text.push(token.text), (token = token.previous);
            while (!token.text || !matcher.test(token.text));
          else if (matcher.includes)
            do token.text && text.push(token.text), (token = token.previous);
            while (!token.text || !matcher.includes(token.text));
          text.length && text.reverse();
        }
        return text.join('');
      };

      const indenter = (indenting, tabs = 2) => {
        let source = indenting;
        const indent = new RegExp(raw$$1`(?:\t|${' '.repeat(tabs)})`, 'g');
        source = source.replace(/\\?(?=[\(\)\:\?\[\]])/g, '\\');
        source = source.replace(indent, indent.source);
        return new RegExp(`^${source}`, 'm');
      };
      {
        const open = (parent, state, grouper) => {
          const {source, index: start} = state;
          const fence = parent.text;
          const fencing = previousTextFrom(parent, '\n');
          const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
          let end = source.indexOf(`\n${fencing}`, start);
          const INDENT = indenter(indenting);
          const CLOSER = new RegExp(raw$$1`\n${INDENT.source.slice(1)}${fence}`, 'g');

          CLOSER.lastIndex = start;
          let closerMatch = CLOSER.exec(source);
          if (closerMatch && closerMatch.index >= start) {
            end = closerMatch.index + 1;
          } else {
            const FENCE = new RegExp(raw$$1`\n?[\>\|\s]*${fence}`, 'g');
            FENCE.lastIndex = start;
            const fenceMatch = FENCE.exec(source);
            if (fenceMatch && fenceMatch.index >= start) {
              end = fenceMatch.index + 1;
            } else return;
          }

          if (end > start) {
            let offset = start;
            let text;

            const body = source.slice(start, end) || '';
            const tokens = [];
            tokens.end = end;
            {
              const [head, ...lines] = body.split(/(\n)/g);
              if (head) {
                tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
              }
              for (const line of lines) {
                const [indent] = INDENT.exec(line) || '';
                const inset = (indent && indent.length) || 0;
                if (inset) {
                  for (const text of indent.split(/(\s+)/g)) {
                    const type = (text.trim() && 'sequence') || 'whitespace';
                    tokens.push({text, type, offset, parent});
                    offset += text.length;
                  }
                  text = line.slice(inset);
                } else {
                  text = line;
                }
                tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
              }
            }
            // console.log({fencing, body, start, end, offset, lines, tokens});
            if (tokens.length) return tokens;
          }
        };

        const quotes = html.closures.get('<');
        for (const opener of ['```', '~~~']) {
          const FenceClosure = md.closures.get(opener);
          if (FenceClosure) {
            FenceClosure.matcher = new RegExp(
              raw$$1`/(\s*\n)|(${opener}(?=${opener}\s|${opener}$)|^(?:[\s>|]*\s)?\s*)|.*$`,
              'gm',
            );
            FenceClosure.quotes = quotes;
            FenceClosure.open = open;
          }
        }
      }
    }
  }

  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (syntaxes$1.es = {
      ...(modes.javascript = modes.es = modes.js = modes.ecmascript = {syntax: 'es'}),
      comments: Closures$$1.from('//…\n /*…*/'),
      quotes: Symbols.from(`' " \``),
      closures: Closures$$1.from('{…} (…) […]'),
      spans: {'`': Closures$$1.from('${…}')},
      keywords: Symbols.from(
        // abstract enum interface package  namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
      ),
      assigners: Symbols.from('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: Symbols.from(
        '>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :',
      ),
      nonbreakers: Symbols.from('.'),
      operators: Symbols.from('++ -- !! ^ ~ ! ...'),
      breakers: Symbols.from(', ;'),
      patterns: {...patterns},
      matcher: sequence$$1`([\s\n]+)|(${all(
        REGEXPS,
        raw$$1`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...raw$$1`\+ \- \* & \|`.split(' ').map(s => `${s}${s}|${s}=|${s}`),
        ...raw$$1`! \*\* % << >> >>> < > \^ ~`.split(' ').map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
        // quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        // quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        // "'": /(\n)|(')|(\\.)/g,
        // '"': /(\n)|(")|(\\.)/g,
        // '`': /(\n)|(`|\$\{)|(\\.)/g,
        comment: matchers.comments,
      },
    });

    ECMAScriptExtensions: {
      // const HASHBANG = /^\#\!.*\n/g; // [^] === (?:.*\n)
      // TODO: Undo $ matching once fixed
      const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
      const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n/g; // [^] === (?:.*\n)
      const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
      const BLOCKLEVEL = sequence$$1`([\s\n]+)|(${STATEMENTS})`;
      const TOPLEVEL = sequence$$1`([\s\n]+)|(${STATEMENTS})`;
      const CLOSURE = sequence$$1`(\n+)|(${STATEMENTS})`;
      const ESM = sequence$$1`${TOPLEVEL}|\bexport\b|\bimport\b`;
      const CJS = sequence$$1`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
      const ESX = sequence$$1`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

      const {quotes, closures, spans} = es;
      const syntax = {quotes, closures, spans};
      const matchers$$1 = {};
      ({quote: matchers$$1.quote} = es.matchers);

      const esm = (syntaxes$1.esm = {
        ...(modes.esm = {syntax: 'esm'}),
        keywords: Symbols.from('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers$$1, closure: CLOSURE},
      });
      const cjs = (syntaxes$1.cjs = {
        ...(modes.cjs = {syntax: 'cjs'}),
        keywords: Symbols.from('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers$$1, closure: CJS},
      });
      const esx = (syntaxes$1.esx = {
        ...(modes.esx = {syntax: 'esx'}),
        keywords: Symbols.from(esm.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers$$1, closure: ESX},
      });
    }
  }
}

/// Extensions
{
  for (const mode in extensions) {
    /**
     * @typedef {Partial<typeof syntaxes[keyof syntaxes]>} mode
     * @typedef {typeof helpers} helpers
     * @typedef {{aliases?: string[], syntax: string}} defaults
     * @type {(helpers: helpers, defaults: defaults) => mode}
     */
    const factory = extensions[mode];
    const defaults$$1 = {syntax: mode, ...factory.defaults};
    const {syntax, aliases} = defaults$$1;

    definitions[syntax] = {
      get() {
        return (this[syntax] = factory(helpers, defaults$$1));
      },
      set(value) {
        Reflect.defineProperty(this, syntax, {value});
      },
      configurable: true,
      enumerable: true,
    };

    modes[syntax] = {syntax};

    if (aliases && aliases.length) {
      for (const alias of aliases) {
        modes[alias] = modes[syntax];
      }
    }
  }
}
/// Bootstrap
const ready$1 = (async () => {
  await entities.ready;
  syntaxes$1.es.patterns.maybeIdentifier = identifier(
    entities.es.IdentifierStart,
    entities.es.IdentifierPart,
  );
  // setTimeout(() => console.log('Syntaxes: %O', syntaxes), 1000);
  // console.log({maybeIdentifier: `${syntaxes.es.patterns.maybeIdentifier}`});
})();

const {assign, defineProperty} = Object;

const document$1 = void null;

class Node {
  get children() {
    return defineProperty(this, 'children', {value: new Set()}).children;
  }
  get childElementCount() {
    return (this.hasOwnProperty('children') && this.children.size) || 0;
  }
  get textContent() {
    return (
      (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || ''
    );
  }
  set textContent(text) {
    this.hasOwnProperty('children') && this.children.size && this.children.clear();
    text && this.children.add(new String(text));
  }
  appendChild(element) {
    return element && this.children.add(element), element;
  }
  append(...elements) {
    if (elements.length) for (const element of elements) element && this.children.add(element);
  }
  removeChild(element) {
    element &&
      this.hasOwnProperty('children') &&
      this.children.size &&
      this.children.delete(element);
    return element;
  }
  remove(...elements) {
    if (elements.length && this.hasOwnProperty('children') && this.children.size)
      for (const element of elements) element && this.children.delete(element);
  }
}

class Element extends Node {
  get innerHTML() {
    return this.textContent;
  }
  set innerHTML(text) {
    this.textContent = text;
  }
  get outerHTML() {
    const {className, tag, innerHTML} = this;
    return `<${tag}${(className && ` class="${className}"`) || ''}>${innerHTML || ''}</${tag}>`;
  }
  toString() {
    return this.outerHTML;
  }
  toJSON() {
    return this.toString();
  }
}

class DocumentFragment extends Node {
  toString() {
    return this.textContent;
  }
  toJSON() {
    return (this.childElementCount && [...this.children]) || [];
  }
  [Symbol.iterator]() {
    return ((this.childElementCount && this.children) || '')[Symbol.iterator]();
  }
}

class Text extends String {
  toString() {
    return encodeEntities(super.toString());
  }
}

const createElement = (tag, properties, ...children) => {
  const element = assign(new Element(), {
    tag,
    className: (properties && properties.className) || '',
    properties,
  });
  children.length && defineProperty(element, 'children', {value: new Set(children)});
  return element;
};

const createText = (content = '') => new Text(content);
const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;
const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/gim, encodeEntity);
const createFragment = () => new DocumentFragment();

var pseudo = /*#__PURE__*/Object.freeze({
  document: document$1,
  Node: Node,
  Element: Element,
  DocumentFragment: DocumentFragment,
  Text: Text,
  createElement: createElement,
  createText: createText,
  encodeEntity: encodeEntity,
  encodeEntities: encodeEntities,
  createFragment: createFragment
});

const {document: document$2, Element: Element$1, Node: Node$1, Text: Text$1, DocumentFragment: DocumentFragment$1} =
  'object' === typeof self && (self || 0).window === self && self;

const {createElement: createElement$1, createText: createText$1, createFragment: createFragment$1} = {
  createElement: (tag, properties, ...children) => {
    const element = document$2.createElement(tag);
    properties && Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  },

  createText: (content = '') => document$2.createTextNode(content),

  createFragment: () => document$2.createDocumentFragment(),
};

var dom = /*#__PURE__*/Object.freeze({
  document: document$2,
  Element: Element$1,
  Node: Node$1,
  Text: Text$1,
  DocumentFragment: DocumentFragment$1,
  createElement: createElement$1,
  createText: createText$1,
  createFragment: createFragment$1
});

// TEST: Trace for ESM testing
typeof process === 'object' && console.info('[ESM]: %o', import.meta.url);

const native = document$2 && dom;

/// OPTIONS
/** The tag name of the element to use for rendering a token. */
const SPAN = 'span';

/** The class name of the element to use for rendering a token. */
const CLASS = 'markup';

/**
 * Intended to prevent unpredictable DOM related overhead by rendering elements
 * using lightweight proxy objects that can be serialized into HTML text.
 */
const HTML_MODE = true;
/// INTERFACE

const renderers = {};

async function* renderer$1(tokens, tokenRenderers = renderers) {
  for await (const token of tokens) {
    const {type = 'text', text, punctuator, breaks} = token;
    const tokenRenderer =
      (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
      (type && tokenRenderers[type]) ||
      (text && tokenRenderers.text);
    const element = tokenRenderer && tokenRenderer(text, token);
    element && (yield element);
  }
}

const install$1 = (defaults, newRenderers = defaults.renderers || {}) => {
  Object.assign(newRenderers, renderers);
  defaults.renderers === newRenderers || (defaults.renderers = newRenderers);
  defaults.renderer = renderer$1;
};

const supported = !!native;
const native$1 = !HTML_MODE && supported;
const implementation = native$1 ? native : pseudo;
const {createElement: createElement$3, createText: createText$3, createFragment: createFragment$3} = implementation;

/// IMPLEMENTATION
const factory = (tag, properties) => (content, token) => {
  if (!content) return;
  typeof content !== 'string' || (content = createText$3(content));
  const element = createElement$3(tag, properties, content);

  element && token && (token.hint && (element.className += ` ${token.hint}`));
  // token.breaks && (element.breaks = token.breaks),
  // token &&
  // (token.form && (element.className += ` maybe-${token.form}`),
  // token.hint && (element.className += ` ${token.hint}`),
  // element && (element.token = token));

  return element;
};

Object.assign(renderers, {
  // whitespace: factory(SPAN, {className: `${CLASS} whitespace`}),
  whitespace: createText$3,
  text: factory(SPAN, {className: CLASS}),

  variable: factory('var', {className: `${CLASS} variable`}),
  keyword: factory(SPAN, {className: `${CLASS} keyword`}),
  identifier: factory(SPAN, {className: `${CLASS} identifier`}),
  operator: factory(SPAN, {className: `${CLASS} punctuator operator`}),
  assigner: factory(SPAN, {className: `${CLASS} punctuator operator assigner`}),
  combinator: factory(SPAN, {className: `${CLASS} punctuator operator combinator`}),
  punctuation: factory(SPAN, {className: `${CLASS} punctuator punctuation`}),
  quote: factory(SPAN, {className: `${CLASS} punctuator quote`}),
  breaker: factory(SPAN, {className: `${CLASS} punctuator breaker`}),
  opener: factory(SPAN, {className: `${CLASS} punctuator opener`}),
  closer: factory(SPAN, {className: `${CLASS} punctuator closer`}),
  span: factory(SPAN, {className: `${CLASS} punctuator span`}),
  sequence: factory(SPAN, {className: `${CLASS} sequence`}),
  literal: factory(SPAN, {className: `${CLASS} literal`}),
  indent: factory(SPAN, {className: `${CLASS} sequence indent`}),
  comment: factory(SPAN, {className: `${CLASS} comment`}),
  code: factory(SPAN, {className: `${CLASS}`}),
});

var dom$1 = /*#__PURE__*/Object.freeze({
  renderers: renderers,
  renderer: renderer$1,
  install: install$1,
  supported: supported,
  native: native$1,
  createElement: createElement$3,
  createText: createText$3,
  createFragment: createFragment$3
});

let initialized;

const ready$2 = (async () => void (await ready$1))();

const versions = [parser];

// const versions = [parser, parser2];

const initialize = () =>
  initialized ||
  (initialized = async () => {
    const {createFragment, supported: supported$$1} = dom$1;

    /**
     * Temporary template element for rendering
     * @type {HTMLTemplateElement?}
     */
    const template =
      supported$$1 &&
      (template =>
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) && template)(
        document.createElement('template'),
      );

    /// API
    const syntaxes$$1 = {};
    const renderers$$1 = {};
    const defaults$$1 = {...defaults};

    await ready$2;
    /// Defaults
    install(defaults$$1, syntaxes$$1);
    install$1(defaults$$1, renderers$$1);

    let lastVersion;
    tokenize$1 = (source, options = {}) => {
      const version = options.version > 1 ? versions[options.version - 1] : versions[0];
      options.tokenize = (version || parser).tokenize;
      try {
        return version.tokenize(source, {options}, defaults$$1);
      } finally {
        !version || lastVersion === (lastVersion = version) || console.log({version});
      }
    };

    render$1 = async (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = render(source, options, defaults$$1);
      let first = await elements.next();

      let logs = (fragment.logs = []);

      if (first && 'value' in first) {
        if (!native$1 && template && 'textContent' in fragment) {
          logs.push(`render method = 'text' in template`);
          const body = [first.value];
          if (!first.done) for await (const element of elements) body.push(element);
          template.innerHTML = body.join('');
          fragment.appendChild(template.content);

          // if (!first.done) {
          //   if (typeof requestAnimationFrame === 'function') {
          //     //  && first.value.token
          //     let lines = 0;
          //     for await (const element of elements) {
          //       // element.token &&
          //       //   element.token.breaks > 0 &&
          //       //   (lines += element.token.breaks) % 2 === 0 &&
          //       lines++ % 10 === 0 &&
          //         ((template.innerHTML = body.splice(0, body.length).join('')),
          //         fragment.appendChild(template.content));
          //       // await new Promise(r => setTimeout(r, 1000))
          //       // await new Promise(requestAnimationFrame)
          //       body.push(element);
          //     }
          //   } else {
          //     for await (const element of elements) body.push(element);
          //     template.innerHTML = body.join(''); // text
          //     fragment.appendChild(template.content);
          //   }
          // }
        } else if ('push' in fragment) {
          logs.push(`render method = 'push' in fragment`);
          fragment.push(first.value);
          if (!first.done) for await (const element of elements) fragment.push(element);
        } else if ('append' in fragment) {
          //  && first.value.nodeType >= 1
          logs.push(`render method = 'append' in fragment`);
          fragment.append(first.value);
          if (!first.done) for await (const element of elements) fragment.append(element);
        }
        // else if ('textContent' in fragment) {
        //   let text = `${first.value}`;
        //   if (!first.done) for await (const element of elements) text += `${element}`;
        //   if (template) {
        //     logs.push(`render method = 'text' in template`);
        //   } else {
        //     logs.push(`render method = 'text' in fragment`);
        //     // TODO: Find a workaround for DocumentFragment.innerHTML
        //     fragment.innerHTML = text;
        //   }
        // }
      }

      return fragment;
    };

    initialized = true;

    return markup$1;
  })();

let render$1 = async (source, options) => {
  await initialize();
  return await render$1(source, options);
};

let tokenize$1 = (source, options) => {
  if (!initialized) throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
  else if (initialized.then) ;
  return markup$1.tokenize(source, options);
};

const keyFrom = options => (options && JSON.stringify(options)) || '';
const skim = iterable => {
};

const warmup = async (source, options) => {
  const key = (options && keyFrom(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  await (initialized || initialize());
  // let tokens;
  cache.has(source) || (skim(tokenize$1(source, options)), cache.add(source));
  // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
  return true;
};

const markup$1 = Object.create(parser, {
  initialize: {get: () => initialize},
  render: {get: () => render$1},
  tokenize: {get: () => tokenize$1},
  warmup: {get: () => warmup},
  dom: {get: () => dom$1},
  modes: {get: () => modes},
});

/// CONSTANTS

const Messages = {
  InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
};

export default markup$1;
export { initialized, ready$2 as ready, versions, render$1 as render, tokenize$1 as tokenize, warmup, markup$1 as markup };
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLm1qcyIsInNvdXJjZXMiOlsiLi4vbGliL21hcmt1cC1wYXJzZXIuanMiLCIuLi9saWIvaGVscGVycy5qcyIsIi4uL2xpYi9tYXJrdXAtcGF0dGVybnMuanMiLCIuLi9saWIvZXh0ZW5zaW9ucy9wb3N0c2NyaXB0L3Bvc3RzY3JpcHQtbW9kZS5qcyIsIi4uL2xpYi9tYXJrdXAtbW9kZXMuanMiLCIuLi9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9wc2V1ZG8ubWpzIiwiLi4vcGFja2FnZXMvcHNldWRvbS9saWIvbmF0aXZlLm1qcyIsIi4uL3BhY2thZ2VzL3BzZXVkb20vcHNldWRvbS5qcyIsIi4uL2xpYi9tYXJrdXAtZG9tLmpzIiwiLi4vbGliL21hcmt1cC5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvKiogTWFya3VwIChyZW5kZXIpIEBhdXRob3IgU2FsZWggQWJkZWwgTW90YWFsICovXG5leHBvcnQgZnVuY3Rpb24gbWFya3VwKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMgPSBtYXJrdXAuZGVmYXVsdHMpIHtcbiAgcmV0dXJuIFsuLi5yZW5kZXIoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyldO1xufVxuXG4vLy8gUkVHVUxBUiBFWFBSRVNTSU9OU1xuXG4vKiogTm9uLWFscGhhbnVtZXJpYyBzeW1ib2wgbWF0Y2hpbmcgZXhwcmVzc2lvbnMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5leHBvcnQgY29uc3QgbWF0Y2hlcnMgPSB7XG4gIGVzY2FwZXM6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXCpcXC98YHxcInwnfFxcJFxceykvZyxcbiAgY29tbWVudHM6IC8oXFxuKXwoXFwqXFwvfFxcYig/OlthLXpdK1xcOlxcL1xcL3xcXHdbXFx3XFwrXFwuXSpcXHdAW2Etel0rKVxcUyt8QFthLXpdKykvZ2ksXG4gIHF1b3RlczogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fGB8XCJ8J3xcXCRcXHspL2csXG4gIHhtbDogLyhbXFxzXFxuXSspfChcInwnfD18JiN4P1thLWYwLTldKzt8JlthLXpdKzt8XFwvPz58PCV8JT58PCEtLXwtLT58PFtcXC9cXCFdPyg/PVthLXpdK1xcOj9bYS16XFwtXSpbYS16XXxbYS16XSspKS9naSxcbiAgc2VxdWVuY2VzOiAvKFtcXHNcXG5dKyl8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98XFwvXFwvfFxcL1xcKnxcXCpcXC98XFwofFxcKXxcXFt8XFxdfCx8O3xcXC5cXC5cXC58XFwufFxcYjpcXC9cXC9cXGJ8Ojp8OnxcXD98YHxcInwnfFxcJFxce3xcXHt8XFx9fD0+fDxcXC98XFwvPnxcXCsrfFxcLSt8XFwqK3wmK3xcXHwrfD0rfCE9ezAsM318PHsxLDN9PT98PnsxLDJ9PT8pfFsrXFwtKi8mfF4lPD5+IV09Py9nLFxufTtcblxuLyoqIFNwZWNpYWwgYWxwaGEtbnVtZXJpYyBzeW1ib2wgdGVzdCBleHByZXNzaW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBwYXR0ZXJucyA9IHtcbiAgLyoqIEJhc2ljIGxhdGluIEtleXdvcmQgbGlrZSBzeW1ib2wgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG4gIG1heWJlS2V5d29yZDogL15bYS16XShcXHcqKSQvaSxcbn07XG5cbi8vLyBTWU5UQVhFU1xuLyoqIFN5bnRheCBkZWZpbml0aW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBzeW50YXhlcyA9IHtkZWZhdWx0OiB7cGF0dGVybnMsIG1hdGNoZXI6IG1hdGNoZXJzLnNlcXVlbmNlc319O1xuXG4vKiogTW9kZSBzdGF0ZXMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5leHBvcnQgY29uc3QgbW9kZXMgPSB7ZGVmYXVsdDoge3N5bnRheDogJ2RlZmF1bHQnfX07XG5cbi8vLyBERUZBVUxUU1xuLyoqIFBhcnNpbmcgZGVmYXVsdHMgKGludGVkZWQgdG8gYmUgZXh0ZW5kZWQpICovXG5leHBvcnQgY29uc3QgZGVmYXVsdHMgPSAobWFya3VwLmRlZmF1bHRzID0ge1xuICBtYXRjaGVyOiBtYXRjaGVycy5zZXF1ZW5jZXMsXG4gIHN5bnRheDogJ2RlZmF1bHQnLFxuICBzb3VyY2VUeXBlOiAnZGVmYXVsdCcsXG4gIHJlbmRlcmVyczoge3RleHQ6IFN0cmluZ30sXG4gIHJlbmRlcmVyLFxuICBnZXQgc3ludGF4ZXMoKSB7XG4gICAgcmV0dXJuIHN5bnRheGVzO1xuICB9LFxuICBzZXQgc3ludGF4ZXModmFsdWUpIHtcbiAgICBpZiAodGhpcyAhPT0gZGVmYXVsdHMpXG4gICAgICB0aHJvdyBFcnJvcihcbiAgICAgICAgJ0ludmFsaWQgYXNzaWdubWVudDogZGlyZWN0IGFzc2lnbm1lbnQgdG8gZGVmYXVsdHMgaXMgbm90IGFsbG93ZWQuIFVzZSBPYmplY3QuY3JlYXRlKGRlZmF1bHRzKSB0byBjcmVhdGUgYSBtdXRhYmxlIGluc3RhbmNlIG9mIGRlZmF1bHRzIGZpcnN0LicsXG4gICAgICApO1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCAnc3ludGF4ZXMnLCB7dmFsdWV9KTtcbiAgfSxcbn0pO1xuXG5jb25zdCBOdWxsID0gT2JqZWN0LmZyZWV6ZShPYmplY3QuY3JlYXRlKG51bGwpKTtcblxuLy8vIFJFTkRFUklOR1xuLyoqIFRva2VuIHByb3RvdHlwZSAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmNsYXNzIFRva2VuIHtcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dDtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24qIHJlbmRlcmVyKHRva2Vucykge1xuICBsZXQgaSA9IDA7XG4gIGZvciBhd2FpdCAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgaWYgKCF0b2tlbikgY29udGludWU7XG4gICAgaSsrICUgMTAgfHwgKGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxKSkpO1xuICAgIHlpZWxkIE9iamVjdC5zZXRQcm90b3R5cGVPZih0b2tlbiwgVG9rZW4ucHJvdG90eXBlKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMgPSBtYXJrdXAuZGVmYXVsdHMpIHtcbiAgY29uc3Qge3N5bnRheCwgcmVuZGVyZXIgPSBkZWZhdWx0cy5yZW5kZXJlciwgLi4udG9rZW5pemVyT3B0aW9uc30gPSBvcHRpb25zIHx8IGRlZmF1bHRzO1xuICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB0b2tlbml6ZXJPcHRpb25zfTtcbiAgcmV0dXJuIHJlbmRlcmVyKChvcHRpb25zLnRva2VuaXplIHx8IHRva2VuaXplKShzb3VyY2UsIHN0YXRlLCBkZWZhdWx0cykpO1xufVxuXG4vLy8gR1JPVVBJTkdcbmNvbnN0IEdyb3VwZXIgPSAoe1xuICAvKiBncm91cGVyIGNvbnRleHQgKi9cbiAgc3ludGF4LFxuICBnb2FsID0gc3ludGF4LFxuICBxdW90ZSxcbiAgY29tbWVudCxcbiAgY2xvc3VyZSxcbiAgc3BhbixcbiAgZ3JvdXBpbmcgPSBjb21tZW50IHx8IGNsb3N1cmUgfHwgc3BhbiB8fCB1bmRlZmluZWQsXG5cbiAgcHVuY3R1YXRvcixcbiAgLy8gdGVybWluYXRvciA9IChjb21tZW50ICYmIGNvbW1lbnQuY2xvc2VyKSB8fCB1bmRlZmluZWQsXG4gIHNwYW5zID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLnNwYW5zKSB8fCB1bmRlZmluZWQsXG4gIG1hdGNoZXIgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcubWF0Y2hlcikgfHwgdW5kZWZpbmVkLFxuICBxdW90ZXMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcucXVvdGVzKSB8fCB1bmRlZmluZWQsXG4gIHB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0sXG4gIG9wZW5lciA9IHF1b3RlIHx8IChncm91cGluZyAmJiBncm91cGluZy5vcGVuZXIpIHx8IHVuZGVmaW5lZCxcbiAgY2xvc2VyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlcikgfHwgdW5kZWZpbmVkLFxuICBoaW50ZXIsXG4gIG9wZW4gPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcub3BlbikgfHwgdW5kZWZpbmVkLFxuICBjbG9zZSA9IChncm91cGluZyAmJiBncm91cGluZy5jbG9zZSkgfHwgdW5kZWZpbmVkLFxufSkgPT4gKHtcbiAgc3ludGF4LFxuICBnb2FsLFxuICBwdW5jdHVhdG9yLFxuICAvLyB0ZXJtaW5hdG9yLFxuICBzcGFucyxcbiAgbWF0Y2hlcixcbiAgcXVvdGVzLFxuICBwdW5jdHVhdG9ycyxcbiAgb3BlbmVyLFxuICBjbG9zZXIsXG4gIGhpbnRlcixcbiAgb3BlbixcbiAgY2xvc2UsXG59KTtcblxuY29uc3QgY3JlYXRlR3JvdXBlciA9IEdyb3VwZXI7XG5cbi8vLyBUT0tFTklaQVRJT05cblxuZXhwb3J0IGZ1bmN0aW9uKiBjb250ZXh0dWFsaXplcigkLCBkZWZhdWx0cykge1xuICBsZXQgZG9uZSwgZ3JvdXBlcjtcblxuICAkICE9PSB1bmRlZmluZWQgfHxcbiAgICAoJCA9IChkZWZhdWx0cyAmJiBkZWZhdWx0cy5zeW50YXhlcyAmJiBkZWZhdWx0cy5zeW50YXhlcy5kZWZhdWx0KSB8fCBzeW50YXhlcy5kZWZhdWx0KTtcblxuICBjb25zdCBpbml0aWFsaXplID0gY29udGV4dCA9PiB7XG4gICAgY29udGV4dC50b2tlbiB8fFxuICAgICAgKGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+ICh0b2tlbml6ZXIubmV4dCgpLCB0b2tlbiA9PiB0b2tlbml6ZXIubmV4dCh0b2tlbikudmFsdWUpKShcbiAgICAgICAgdG9rZW5pemVyKGNvbnRleHQpLFxuICAgICAgKSk7XG4gICAgY29udGV4dDtcbiAgfTtcblxuICBpZiAoISQuY29udGV4dCkge1xuICAgIGNvbnN0IHtcbiAgICAgIHN5bnRheCxcbiAgICAgIG1hdGNoZXIgPSAoJC5tYXRjaGVyID0gZGVmYXVsdHMubWF0Y2hlciksXG4gICAgICBxdW90ZXMsXG4gICAgICBwdW5jdHVhdG9ycyA9ICgkLnB1bmN0dWF0b3JzID0ge2FnZ3JlZ2F0b3JzOiB7fX0pLFxuICAgICAgcHVuY3R1YXRvcnM6IHthZ2dyZWdhdG9ycyA9ICgkcHVuY3R1YXRvcnMuYWdncmVnYXRvcnMgPSB7fSl9LFxuICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgbWF5YmVLZXl3b3JkID0gKCQucGF0dGVybnMubWF5YmVLZXl3b3JkID1cbiAgICAgICAgICAoKGRlZmF1bHRzICYmIGRlZmF1bHRzLnBhdHRlcm5zKSB8fCBwYXR0ZXJucykubWF5YmVLZXl3b3JkIHx8IHVuZGVmaW5lZCksXG4gICAgICB9ID0gKCQucGF0dGVybnMgPSB7bWF5YmVLZXl3b3JkOiBudWxsfSksXG4gICAgICBzcGFuczoge1tzeW50YXhdOiBzcGFuc30gPSBOdWxsLFxuICAgIH0gPSAkO1xuXG4gICAgLy8gbWF0Y2hlci5tYXRjaGVyIHx8XG4gICAgLy8gICAobWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChtYXRjaGVyLnNvdXJjZSwgbWF0Y2hlci5mbGFncy5yZXBsYWNlKCdnJywgJ3knKSkpO1xuXG4gICAgaW5pdGlhbGl6ZShcbiAgICAgICgkLmNvbnRleHQgPSB7XG4gICAgICAgIC8vIC4uLiAkLFxuICAgICAgICAkLFxuICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgYWdncmVnYXRvcnMsXG4gICAgICAgIC8vIG1hdGNoZXI6IG1hdGNoZXIubWF0Y2hlcixcbiAgICAgICAgbWF0Y2hlcixcbiAgICAgICAgcXVvdGVzLFxuICAgICAgICBzcGFucyxcbiAgICAgIH0pLFxuICAgICk7XG4gIH1cblxuICBjb25zdCB7XG4gICAgc3ludGF4OiAkc3ludGF4LFxuICAgIG1hdGNoZXI6ICRtYXRjaGVyLFxuICAgIHF1b3RlczogJHF1b3RlcyxcbiAgICBwdW5jdHVhdG9yczogJHB1bmN0dWF0b3JzLFxuICAgIHB1bmN0dWF0b3JzOiB7YWdncmVnYXRvcnM6ICRhZ2dyZWdhdG9yc30sXG4gIH0gPSAkO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgaWYgKFxuICAgICAgZ3JvdXBlciAhPT0gKGdyb3VwZXIgPSB5aWVsZCAoZ3JvdXBlciAmJiBncm91cGVyLmNvbnRleHQpIHx8ICQuY29udGV4dCkgJiZcbiAgICAgIGdyb3VwZXIgJiZcbiAgICAgICFncm91cGVyLmNvbnRleHRcbiAgICApIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgZ29hbCA9ICRzeW50YXgsXG4gICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgIHB1bmN0dWF0b3JzID0gJHB1bmN0dWF0b3JzLFxuICAgICAgICBhZ2dyZWdhdG9ycyA9ICRhZ2dyZWdhdG9ycyxcbiAgICAgICAgY2xvc2VyLFxuICAgICAgICBzcGFucyxcbiAgICAgICAgbWF0Y2hlciA9ICRtYXRjaGVyLFxuICAgICAgICBxdW90ZXMgPSAkcXVvdGVzLFxuICAgICAgICBmb3JtaW5nID0gZ29hbCA9PT0gJHN5bnRheCxcbiAgICAgIH0gPSBncm91cGVyO1xuXG4gICAgICAvLyAhbWF0Y2hlciB8fFxuICAgICAgLy8gICBtYXRjaGVyLm1hdGNoZXIgfHxcbiAgICAgIC8vICAgKG1hdGNoZXIubWF0Y2hlciA9IG5ldyBSZWdFeHAobWF0Y2hlci5zb3VyY2UsIG1hdGNoZXIuZmxhZ3MucmVwbGFjZSgnZycsICd5JykpKTtcblxuICAgICAgaW5pdGlhbGl6ZShcbiAgICAgICAgKGdyb3VwZXIuY29udGV4dCA9IHtcbiAgICAgICAgICAvLyAuLi4gJC5jb250ZXh0LFxuICAgICAgICAgICQsXG4gICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICBwdW5jdHVhdG9ycyxcbiAgICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgICBjbG9zZXIsXG4gICAgICAgICAgc3BhbnMsXG4gICAgICAgICAgLy8gbWF0Y2hlcjogbWF0Y2hlciAmJiBtYXRjaGVyLm1hdGNoZXIsXG4gICAgICAgICAgbWF0Y2hlcixcbiAgICAgICAgICBxdW90ZXMsXG4gICAgICAgICAgZm9ybWluZyxcbiAgICAgICAgfSksXG4gICAgICApO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHRva2VuaXplcihjb250ZXh0KSB7XG4gIGxldCBkb25lLCBuZXh0O1xuXG4gIGNvbnN0IHtcbiAgICAkOiB7XG4gICAgICBzeW50YXgsXG4gICAgICBrZXl3b3JkcyxcbiAgICAgIGFzc2lnbmVycyxcbiAgICAgIG9wZXJhdG9ycyxcbiAgICAgIGNvbWJpbmF0b3JzLFxuICAgICAgbm9uYnJlYWtlcnMsXG4gICAgICBjb21tZW50cyxcbiAgICAgIGNsb3N1cmVzLFxuICAgICAgYnJlYWtlcnMsXG4gICAgICBwYXR0ZXJucyxcbiAgICB9LFxuICAgIHB1bmN0dWF0b3JzLFxuICAgIGFnZ3JlZ2F0b3JzLFxuICAgIHNwYW5zLFxuICAgIHF1b3RlcyxcbiAgICBmb3JtaW5nID0gdHJ1ZSxcblxuICAgIC8vIHN5bnRheCxcbiAgICAvLyBrZXl3b3JkcyxcbiAgICAvLyBhc3NpZ25lcnMsXG4gICAgLy8gb3BlcmF0b3JzLFxuICAgIC8vIGNvbWJpbmF0b3JzLFxuICAgIC8vIG5vbmJyZWFrZXJzLFxuICAgIC8vIGNvbW1lbnRzLFxuICAgIC8vIGNsb3N1cmVzLFxuICAgIC8vIGJyZWFrZXJzLFxuICAgIC8vIHBhdHRlcm5zLFxuICB9ID0gY29udGV4dDtcblxuICBjb25zdCB7bWF5YmVJZGVudGlmaWVyLCBtYXliZUtleXdvcmR9ID0gcGF0dGVybnMgfHwgY29udGV4dDtcbiAgY29uc3Qgd29yZGluZyA9IGtleXdvcmRzIHx8IG1heWJlSWRlbnRpZmllciA/IHRydWUgOiBmYWxzZTtcblxuICBjb25zdCBMaW5lRW5kaW5ncyA9IC8kL2dtO1xuICBjb25zdCBwdW5jdHVhdGUgPSB0ZXh0ID0+XG4gICAgKG5vbmJyZWFrZXJzICYmIG5vbmJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdub25icmVha2VyJykgfHxcbiAgICAob3BlcmF0b3JzICYmIG9wZXJhdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnb3BlcmF0b3InKSB8fFxuICAgIChjb21tZW50cyAmJiBjb21tZW50cy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tbWVudCcpIHx8XG4gICAgKHNwYW5zICYmIHNwYW5zLmluY2x1ZGVzKHRleHQpICYmICdzcGFuJykgfHxcbiAgICAocXVvdGVzICYmIHF1b3Rlcy5pbmNsdWRlcyh0ZXh0KSAmJiAncXVvdGUnKSB8fFxuICAgIChjbG9zdXJlcyAmJiBjbG9zdXJlcy5pbmNsdWRlcyh0ZXh0KSAmJiAnY2xvc3VyZScpIHx8XG4gICAgKGJyZWFrZXJzICYmIGJyZWFrZXJzLmluY2x1ZGVzKHRleHQpICYmICdicmVha2VyJykgfHxcbiAgICBmYWxzZTtcblxuICBjb25zdCBhZ2dyZWdhdGUgPVxuICAgICgoYXNzaWduZXJzICYmIGFzc2lnbmVycy5zaXplKSB8fCAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMuc2l6ZSkpICYmXG4gICAgKHRleHQgPT5cbiAgICAgIChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLmluY2x1ZGVzKHRleHQpICYmICdhc3NpZ25lcicpIHx8XG4gICAgICAoY29tYmluYXRvcnMgJiYgY29tYmluYXRvcnMuaW5jbHVkZXModGV4dCkgJiYgJ2NvbWJpbmF0b3InKSB8fFxuICAgICAgZmFsc2UpO1xuXG4gIC8vIGNvbnN0IHNlZW4gPSB0b2tlbml6ZXIuc2VlbiB8fCBuZXcgV2Vha1NldCgpO1xuICAvLyBsZXQgdW5zZWVuO1xuICAvLyBzZWVuLmhhcyhjb250ZXh0KSB8fFxuICAvLyAgIChzZWVuLmFkZChcbiAgLy8gICAgIE9iamVjdC52YWx1ZXMoXG4gIC8vICAgICAgICh1bnNlZW4gPSB7Y29udGV4dH0pLFxuICAvLyAgICAgICAhYWdncmVnYXRvcnMgfHwgKHVuc2Vlbi5hZ2dyZWdhdG9ycyA9IGFnZ3JlZ2F0b3JzKSxcbiAgLy8gICAgICAgIXB1bmN0dWF0b3JzIHx8ICh1bnNlZW4ucHVuY3R1YXRvcnMgPSBwdW5jdHVhdG9ycyksXG4gIC8vICAgICAgIHVuc2VlbixcbiAgLy8gICAgICksXG4gIC8vICAgKSAmJiBjb25zb2xlLmxvZyh1bnNlZW4pKTtcblxuICB3aGlsZSAoIWRvbmUpIHtcbiAgICBsZXQgdG9rZW4sIHB1bmN0dWF0b3I7XG4gICAgaWYgKG5leHQgJiYgbmV4dC50ZXh0KSB7XG4gICAgICBjb25zdCB7XG4gICAgICAgIHRleHQsIC8vIFRleHQgZm9yIG5leHQgcHJvZHVjdGlvblxuICAgICAgICB0eXBlLCAvLyBUeXBlIG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAvLyBvZmZzZXQsIC8vIEluZGV4IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICAvLyBicmVha3MsIC8vIExpbmVicmVha3MgaW4gbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIGhpbnQsIC8vIEhpbnQgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIHByZXZpb3VzLCAvLyBQcmV2aW91cyBwcm9kdWN0aW9uXG4gICAgICAgIHBhcmVudCA9IChuZXh0LnBhcmVudCA9IChwcmV2aW91cyAmJiBwcmV2aW91cy5wYXJlbnQpIHx8IHVuZGVmaW5lZCksIC8vIFBhcmVudCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgbGFzdCwgLy8gTGFzdCBzaWduaWZpY2FudCBwcm9kdWN0aW9uXG4gICAgICB9ID0gbmV4dDtcblxuICAgICAgaWYgKHR5cGUgPT09ICdzZXF1ZW5jZScpIHtcbiAgICAgICAgKG5leHQucHVuY3R1YXRvciA9XG4gICAgICAgICAgKGFnZ3JlZ2F0ZSAmJlxuICAgICAgICAgICAgcHJldmlvdXMgJiZcbiAgICAgICAgICAgIChhZ2dyZWdhdG9yc1t0ZXh0XSB8fFxuICAgICAgICAgICAgICAoISh0ZXh0IGluIGFnZ3JlZ2F0b3JzKSAmJiAoYWdncmVnYXRvcnNbdGV4dF0gPSBhZ2dyZWdhdGUodGV4dCkpKSkpIHx8XG4gICAgICAgICAgKHB1bmN0dWF0b3JzW3RleHRdIHx8XG4gICAgICAgICAgICAoISh0ZXh0IGluIHB1bmN0dWF0b3JzKSAmJiAocHVuY3R1YXRvcnNbdGV4dF0gPSBwdW5jdHVhdGUodGV4dCkpKSkgfHxcbiAgICAgICAgICB1bmRlZmluZWQpICYmIChuZXh0LnR5cGUgPSAncHVuY3R1YXRvcicpO1xuICAgICAgfSBlbHNlIGlmICh0eXBlID09PSAnd2hpdGVzcGFjZScpIHtcbiAgICAgICAgbmV4dC5icmVha3MgPSB0ZXh0Lm1hdGNoKExpbmVFbmRpbmdzKS5sZW5ndGggLSAxO1xuICAgICAgfSBlbHNlIGlmIChmb3JtaW5nICYmIHdvcmRpbmcpIHtcbiAgICAgICAgLy8gdHlwZSAhPT0gJ2luZGVudCcgJiZcbiAgICAgICAgY29uc3Qgd29yZCA9IHRleHQudHJpbSgpO1xuICAgICAgICB3b3JkICYmXG4gICAgICAgICAgKChrZXl3b3JkcyAmJlxuICAgICAgICAgICAga2V5d29yZHMuaW5jbHVkZXMod29yZCkgJiZcbiAgICAgICAgICAgICghbGFzdCB8fCBsYXN0LnB1bmN0dWF0b3IgIT09ICdub25icmVha2VyJyB8fCAocHJldmlvdXMgJiYgcHJldmlvdXMuYnJlYWtzID4gMCkpICYmXG4gICAgICAgICAgICAobmV4dC50eXBlID0gJ2tleXdvcmQnKSkgfHxcbiAgICAgICAgICAgIChtYXliZUlkZW50aWZpZXIgJiYgbWF5YmVJZGVudGlmaWVyLnRlc3Qod29yZCkgJiYgKG5leHQudHlwZSA9ICdpZGVudGlmaWVyJykpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG5leHQudHlwZSA9ICd0ZXh0JztcbiAgICAgIH1cblxuICAgICAgcHJldmlvdXMgJiYgKHByZXZpb3VzLm5leHQgPSBuZXh0KTtcblxuICAgICAgdG9rZW4gPSBuZXh0O1xuICAgIH1cblxuICAgIG5leHQgPSB5aWVsZCB0b2tlbjtcbiAgfVxufVxuXG4vLyBUT0RPOiA8QFNNb3RhYWw+IFJlZmFjdG9yXG5leHBvcnQgZnVuY3Rpb24qIHRva2VuaXplKHNvdXJjZSwgc3RhdGUgPSB7fSwgZGVmYXVsdHMgPSBtYXJrdXAuZGVmYXVsdHMpIHtcbiAgY29uc3Qgc3ludGF4ZXMgPSBkZWZhdWx0cy5zeW50YXhlcztcblxuICBsZXQge1xuICAgIG1hdGNoLFxuICAgIGluZGV4LFxuICAgIG9wdGlvbnM6IHtcbiAgICAgIHNvdXJjZVR5cGUgPSAoc3RhdGUub3B0aW9ucy5zb3VyY2VUeXBlID0gc3RhdGUub3B0aW9ucy5zeW50YXggfHwgZGVmYXVsdHMuc291cmNlVHlwZSksXG4gICAgfSA9IChzdGF0ZS5vcHRpb25zID0ge30pLFxuICAgIHByZXZpb3VzID0gbnVsbCxcbiAgICBtb2RlID0gKHN0YXRlLm1vZGUgPSBtb2Rlc1tzb3VyY2VUeXBlXSB8fCBtb2Rlc1tkZWZhdWx0cy5zb3VyY2VUeXBlXSksXG4gICAgbW9kZToge3N5bnRheH0sXG4gICAgZ3JvdXBpbmcgPSAoc3RhdGUuZ3JvdXBpbmcgPSB7XG4gICAgICBoaW50czogbmV3IFNldCgpLFxuICAgICAgZ3JvdXBpbmdzOiBbXSxcbiAgICAgIGdyb3VwZXJzOiBtb2RlLmdyb3VwZXJzIHx8IChtb2RlLmdyb3VwZXJzID0ge30pLFxuICAgIH0pLFxuICB9ID0gc3RhdGU7XG5cbiAgKHN0YXRlLnNvdXJjZSA9PT0gKHN0YXRlLnNvdXJjZSA9IHNvdXJjZSkgJiYgaW5kZXggPj0gMCkgfHxcbiAgICAoaW5kZXggPSBzdGF0ZS5pbmRleCA9IChpbmRleCA+IDAgJiYgaW5kZXggJSBzb3VyY2UubGVuZ3RoKSB8fCAwKTtcblxuICBjb25zdCB0b3AgPSB7dHlwZTogJ3RvcCcsIHRleHQ6ICcnLCBvZmZzZXQ6IGluZGV4fTtcblxuICBsZXQgZG9uZSxcbiAgICBwYXJlbnQgPSB0b3AsXG4gICAgbGFzdDtcblxuICBsZXQgbGFzdENvbnRleHQ7XG5cbiAgY29uc3Qge1xuICAgIFsoc3RhdGUuc3ludGF4ID0gc3RhdGUubW9kZS5zeW50YXgpXTogJCA9IGRlZmF1bHRzLnN5bnRheGVzW2RlZmF1bHRzLnN5bnRheF0sXG4gIH0gPSBkZWZhdWx0cy5zeW50YXhlcztcblxuICBjb25zdCAkY29udGV4dGluZyA9IGNvbnRleHR1YWxpemVyKCQsIGRlZmF1bHRzKTtcbiAgbGV0ICRjb250ZXh0ID0gJGNvbnRleHRpbmcubmV4dCgpLnZhbHVlO1xuXG4gIC8vIEluaXRpYWwgY29udGV4dHVhbCBoaW50IChzeW50YXgpXG4gICFzeW50YXggfHxcbiAgICAoZ3JvdXBpbmcuZ29hbCB8fCAoZ3JvdXBpbmcuZ29hbCA9IHN5bnRheCksIGdyb3VwaW5nLmhpbnQgJiYgZ3JvdXBpbmcubGFzdFN5bnRheCA9PT0gc3ludGF4KSB8fFxuICAgIChncm91cGluZy5oaW50cy5hZGQoc3ludGF4KS5kZWxldGUoZ3JvdXBpbmcubGFzdFN5bnRheCksXG4gICAgKGdyb3VwaW5nLmhpbnQgPSBbLi4uZ3JvdXBpbmcuaGludHNdLmpvaW4oJyAnKSksXG4gICAgKGdyb3VwaW5nLmNvbnRleHQgPSBzdGF0ZS5jb250ZXh0IHx8IChzdGF0ZS5jb250ZXh0ID0gZ3JvdXBpbmcubGFzdFN5bnRheCA9IHN5bnRheCkpKTtcblxuICB3aGlsZSAodHJ1ZSkge1xuICAgIGNvbnN0IHtcbiAgICAgICQ6IHtzeW50YXgsIG1hdGNoZXJzLCBjb21tZW50cywgc3BhbnMsIGNsb3N1cmVzfSxcbiAgICAgIC8vIHN5bnRheCwgbWF0Y2hlcnMsIGNvbW1lbnRzLCBzcGFucywgY2xvc3VyZXMsXG5cbiAgICAgIHB1bmN0dWF0b3I6ICQkcHVuY3R1YXRvcixcbiAgICAgIGNsb3NlcjogJCRjbG9zZXIsXG4gICAgICBzcGFuczogJCRzcGFucyxcbiAgICAgIC8vIG1hdGNoZXI6ICQkbWF0Y2hlcixcbiAgICAgIG1hdGNoZXI6IHtcbiAgICAgICAgbWF0Y2hlcjogJCRtYXRjaGVyID0gKCRjb250ZXh0Lm1hdGNoZXIubWF0Y2hlciA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgJGNvbnRleHQubWF0Y2hlci5zb3VyY2UsXG4gICAgICAgICAgJGNvbnRleHQubWF0Y2hlci5mbGFncywgLy8gLnJlcGxhY2UoJ2cnLCAneScpLFxuICAgICAgICApKSxcbiAgICAgIH0sXG4gICAgICB0b2tlbixcbiAgICAgIC8vIHRva2VuID0gKCRjb250ZXh0LnRva2VuID0gKHRva2VuaXplciA9PiAoXG4gICAgICAvLyAgIHRva2VuaXplci5uZXh0KCksIHRva2VuID0+IHRva2VuaXplci5uZXh0KHRva2VuKS52YWx1ZVxuICAgICAgLy8gKSkodG9rZW5pemVyKCRjb250ZXh0KSkpLFxuICAgICAgZm9ybWluZyA9IHRydWUsXG4gICAgfSA9ICRjb250ZXh0O1xuXG4gICAgLy8gUHJpbWUgTWF0Y2hlclxuICAgIC8vICgoc3RhdGUubWF0Y2hlciAhPT0gJCRtYXRjaGVyICYmIChzdGF0ZS5tYXRjaGVyID0gJCRtYXRjaGVyKSkgfHxcbiAgICAvLyAgIHN0YXRlLmluZGV4ICE9PSAkJG1hdGNoZXIubGFzdEluZGV4KSAmJlxuICAgIC8vICAgJCRtYXRjaGVyLmV4ZWMoc3RhdGUuc291cmNlKTtcblxuICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBoaW50IChzeW50YXggb3IgaGludClcbiAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcblxuICAgIHdoaWxlIChsYXN0Q29udGV4dCA9PT0gKGxhc3RDb250ZXh0ID0gJGNvbnRleHQpKSB7XG4gICAgICBsZXQgbmV4dDtcblxuICAgICAgc3RhdGUubGFzdCA9IGxhc3Q7XG5cbiAgICAgIGNvbnN0IGxhc3RJbmRleCA9IHN0YXRlLmluZGV4IHx8IDA7XG5cbiAgICAgICQkbWF0Y2hlci5sYXN0SW5kZXggPT09IGxhc3RJbmRleCB8fCAoJCRtYXRjaGVyLmxhc3RJbmRleCA9IGxhc3RJbmRleCk7XG4gICAgICBtYXRjaCA9IHN0YXRlLm1hdGNoID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgIGRvbmUgPSBpbmRleCA9PT0gKGluZGV4ID0gc3RhdGUuaW5kZXggPSAkJG1hdGNoZXIubGFzdEluZGV4KSB8fCAhbWF0Y2g7XG5cbiAgICAgIGlmIChkb25lKSByZXR1cm47XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBtYXRjaFxuICAgICAgY29uc3QgezA6IHRleHQsIDE6IHdoaXRlc3BhY2UsIDI6IHNlcXVlbmNlLCBpbmRleDogb2Zmc2V0fSA9IG1hdGNoO1xuXG4gICAgICAvLyBDdXJyZW50IHF1YXNpLWNvbnRleHR1YWwgZnJhZ21lbnRcbiAgICAgIGNvbnN0IHByZSA9IHNvdXJjZS5zbGljZShsYXN0SW5kZXgsIG9mZnNldCk7XG4gICAgICBwcmUgJiZcbiAgICAgICAgKChuZXh0ID0gdG9rZW4oe3R5cGU6ICdwcmUnLCB0ZXh0OiBwcmUsIG9mZnNldDogbGFzdEluZGV4LCBwcmV2aW91cywgcGFyZW50LCBoaW50LCBsYXN0fSkpLFxuICAgICAgICB5aWVsZCAocHJldmlvdXMgPSBuZXh0KSk7XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBmcmFnbWVudFxuICAgICAgY29uc3QgdHlwZSA9ICh3aGl0ZXNwYWNlICYmICd3aGl0ZXNwYWNlJykgfHwgKHNlcXVlbmNlICYmICdzZXF1ZW5jZScpIHx8ICd0ZXh0JztcbiAgICAgIG5leHQgPSB0b2tlbih7dHlwZSwgdGV4dCwgb2Zmc2V0LCBwcmV2aW91cywgcGFyZW50LCBoaW50LCBsYXN0fSk7XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCBwdW5jdHVhdG9yIChmcm9tIHNlcXVlbmNlKVxuICAgICAgY29uc3QgY2xvc2luZyA9XG4gICAgICAgICQkY2xvc2VyICYmXG4gICAgICAgICgkJGNsb3Nlci50ZXN0XG4gICAgICAgICAgPyAkJGNsb3Nlci50ZXN0KHRleHQpXG4gICAgICAgICAgOiAkJGNsb3NlciA9PT0gdGV4dCB8fCAod2hpdGVzcGFjZSAmJiB3aGl0ZXNwYWNlLmluY2x1ZGVzKCQkY2xvc2VyKSkpO1xuXG4gICAgICBsZXQgYWZ0ZXI7XG4gICAgICBsZXQgcHVuY3R1YXRvciA9IG5leHQucHVuY3R1YXRvcjtcblxuICAgICAgaWYgKHB1bmN0dWF0b3IgfHwgY2xvc2luZykge1xuICAgICAgICAvLyBwdW5jdHVhdG9yIHRleHQgY2xvc2luZyBuZXh0IHBhcmVudFxuICAgICAgICAvLyBzeW50YXggbWF0Y2hlcnMgY2xvc3VyZXMgc3BhbnMgJCRzcGFuc1xuXG4gICAgICAgIGxldCBoaW50ZXIgPSBwdW5jdHVhdG9yID8gYCR7c3ludGF4fS0ke3B1bmN0dWF0b3J9YCA6IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgIGxldCBjbG9zZWQsIG9wZW5lZCwgZ3JvdXBlcjtcblxuICAgICAgICBpZiAoY2xvc2luZykge1xuICAgICAgICAgIGNsb3NlZCA9IGdyb3VwZXIgPSBjbG9zaW5nICYmIGdyb3VwaW5nLmdyb3VwaW5ncy5wb3AoKTtcbiAgICAgICAgICBuZXh0LmNsb3NlZCA9IGNsb3NlZDtcbiAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MuaW5jbHVkZXMoZ3JvdXBlcikgfHwgZ3JvdXBpbmcuaGludHMuZGVsZXRlKGdyb3VwZXIuaGludGVyKTtcbiAgICAgICAgICAoY2xvc2VkLnB1bmN0dWF0b3IgPT09ICdvcGVuZXInICYmIChuZXh0LnB1bmN0dWF0b3IgPSAnY2xvc2VyJykpIHx8XG4gICAgICAgICAgICAoY2xvc2VkLnB1bmN0dWF0b3IgJiYgKG5leHQucHVuY3R1YXRvciA9IGNsb3NlZC5wdW5jdHVhdG9yKSk7XG4gICAgICAgICAgYWZ0ZXIgPSBncm91cGVyLmNsb3NlICYmIGdyb3VwZXIuY2xvc2UobmV4dCwgc3RhdGUsICRjb250ZXh0KTtcblxuICAgICAgICAgIGNvbnN0IHByZXZpb3VzR3JvdXBlciA9IChncm91cGVyID0gZ3JvdXBpbmcuZ3JvdXBpbmdzW2dyb3VwaW5nLmdyb3VwaW5ncy5sZW5ndGggLSAxXSk7XG4gICAgICAgICAgZ3JvdXBpbmcuZ29hbCA9IChwcmV2aW91c0dyb3VwZXIgJiYgcHJldmlvdXNHcm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICBwYXJlbnQgPSAocGFyZW50ICYmIHBhcmVudC5wYXJlbnQpIHx8IHRvcDtcbiAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdjb21tZW50Jykge1xuICAgICAgICAgIGNvbnN0IGdyb3VwID0gYCR7aGludGVyfSwke3RleHR9YDtcbiAgICAgICAgICBncm91cGVyID0gZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdO1xuXG4gICAgICAgICAgaWYgKCQkc3BhbnMgJiYgcHVuY3R1YXRvciA9PT0gJ3NwYW4nKSB7XG4gICAgICAgICAgICAvLyBjb25zdCBzcGFuID0gJCRzcGFuc1t0ZXh0XTtcbiAgICAgICAgICAgIGNvbnN0IHNwYW4gPSAkJHNwYW5zLmdldCh0ZXh0KTtcbiAgICAgICAgICAgIG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPSAnc3Bhbic7XG4gICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgc3BhbixcbiAgICAgICAgICAgICAgICBtYXRjaGVyOiBzcGFuLm1hdGNoZXIgfHwgKG1hdGNoZXJzICYmIG1hdGNoZXJzLnNwYW4pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0gZWxzZSBpZiAoJCRwdW5jdHVhdG9yICE9PSAncXVvdGUnKSB7XG4gICAgICAgICAgICBpZiAocHVuY3R1YXRvciA9PT0gJ3F1b3RlJykge1xuICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICBxdW90ZTogdGV4dCxcbiAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IChtYXRjaGVycyAmJiBtYXRjaGVycy5xdW90ZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgc3BhbnM6IChzcGFucyAmJiBzcGFuc1t0ZXh0XSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHVuY3R1YXRvciA9PT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgICAgIC8vIGNvbnN0IGNvbW1lbnQgPSBjb21tZW50c1t0ZXh0XTtcbiAgICAgICAgICAgICAgY29uc3QgY29tbWVudCA9IGNvbW1lbnRzLmdldCh0ZXh0KTtcbiAgICAgICAgICAgICAgb3BlbmVkID1cbiAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICBnb2FsOiBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgICAgY29tbWVudCxcbiAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNvbW1lbnQubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY29tbWVudCkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgaGludGVyLFxuICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocHVuY3R1YXRvciA9PT0gJ2Nsb3N1cmUnKSB7XG4gICAgICAgICAgICAgIC8vIGNvbnN0IGNsb3N1cmUgPSAoZ3JvdXBlciAmJiBncm91cGVyLmNsb3N1cmUpIHx8IGNsb3N1cmVzW3RleHRdO1xuICAgICAgICAgICAgICBjb25zdCBjbG9zdXJlID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5jbG9zdXJlKSB8fCBjbG9zdXJlcy5nZXQodGV4dCk7XG4gICAgICAgICAgICAgIHB1bmN0dWF0b3IgPSBuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJztcbiAgICAgICAgICAgICAgLy8gJ29wZW5lcicgIT09XG4gICAgICAgICAgICAgIC8vICAgKHB1bmN0dWF0b3IgPVxuICAgICAgICAgICAgICAvLyAgICAgKGNsb3N1cmUub3BlbiAmJlxuICAgICAgICAgICAgICAvLyAgICAgICAobmV4dCA9IGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpIHx8IG5leHQpLnB1bmN0dWF0b3IpIHx8XG4gICAgICAgICAgICAgIC8vICAgICAobmV4dC5wdW5jdHVhdG9yID0gJ29wZW5lcicpKSB8fFxuICAgICAgICAgICAgICBjbG9zdXJlICYmXG4gICAgICAgICAgICAgICAgKG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgICBncm91cGVyIHx8XG4gICAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgICBnb2FsOiBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGNsb3N1cmUsXG4gICAgICAgICAgICAgICAgICAgIG1hdGNoZXI6IGNsb3N1cmUubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuY2xvc3VyZSkgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICAgIHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKG9wZW5lZCkge1xuICAgICAgICAgICAgLy8gYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgb3BlbmVkKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwZXJzW2dyb3VwXSB8fCAoZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdID0gZ3JvdXBlciA9IG9wZW5lZCk7XG4gICAgICAgICAgICBncm91cGluZy5ncm91cGluZ3MucHVzaChncm91cGVyKSwgZ3JvdXBpbmcuaGludHMuYWRkKGhpbnRlcik7XG4gICAgICAgICAgICBncm91cGluZy5nb2FsID0gKGdyb3VwZXIgJiYgZ3JvdXBlci5nb2FsKSB8fCBzeW50YXg7XG4gICAgICAgICAgICBwYXJlbnQgPSBuZXh0O1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5jb250ZXh0ID0gZ3JvdXBpbmcuZ29hbCB8fCBzeW50YXg7XG5cbiAgICAgICAgaWYgKG9wZW5lZCB8fCBjbG9zZWQpIHtcbiAgICAgICAgICAkY29udGV4dCA9ICRjb250ZXh0aW5nLm5leHQoKHN0YXRlLmdyb3VwZXIgPSBncm91cGVyIHx8IHVuZGVmaW5lZCkpLnZhbHVlO1xuICAgICAgICAgIGdyb3VwaW5nLmhpbnQgPSBgJHtbLi4uZ3JvdXBpbmcuaGludHNdLmpvaW4oJyAnKX0gJHtcbiAgICAgICAgICAgIGdyb3VwaW5nLmNvbnRleHQgPyBgaW4tJHtncm91cGluZy5jb250ZXh0fWAgOiAnJ1xuICAgICAgICAgIH1gO1xuICAgICAgICAgIG9wZW5lZCAmJiAoYWZ0ZXIgPSBvcGVuZWQub3BlbiAmJiBvcGVuZWQub3BlbihuZXh0LCBzdGF0ZSwgJGNvbnRleHQpKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICAvLyBDdXJyZW50IGNvbnRleHR1YWwgdGFpbCB0b2tlbiAoeWllbGQgZnJvbSBzZXF1ZW5jZSlcbiAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuXG4gICAgICAvLyBOZXh0IHJlZmVyZW5jZSB0byBsYXN0IGNvbnRleHR1YWwgc2VxdWVuY2UgdG9rZW5cbiAgICAgIG5leHQgJiYgIXdoaXRlc3BhY2UgJiYgZm9ybWluZyAmJiAobGFzdCA9IG5leHQpO1xuXG4gICAgICBpZiAoYWZ0ZXIpIHtcbiAgICAgICAgbGV0IHRva2VucywgdG9rZW4sIG5leHRJbmRleDsgLy8gID0gYWZ0ZXIuZW5kIHx8IGFmdGVyLmluZGV4XG5cbiAgICAgICAgaWYgKGFmdGVyLnN5bnRheCkge1xuICAgICAgICAgIGNvbnN0IHtzeW50YXgsIG9mZnNldCwgaW5kZXh9ID0gYWZ0ZXI7XG4gICAgICAgICAgY29uc3QgYm9keSA9IGluZGV4ID4gb2Zmc2V0ICYmIHNvdXJjZS5zbGljZShvZmZzZXQsIGluZGV4IC0gMSk7XG4gICAgICAgICAgaWYgKGJvZHkpIHtcbiAgICAgICAgICAgIGJvZHkubGVuZ3RoID4gMCAmJlxuICAgICAgICAgICAgICAoKHRva2VucyA9IHRva2VuaXplKGJvZHksIHtvcHRpb25zOiB7c3ludGF4fX0sIGRlZmF1bHRzKSksIChuZXh0SW5kZXggPSBpbmRleCkpO1xuICAgICAgICAgICAgY29uc3QgaGludCA9IGAke3N5bnRheH0taW4tJHskLnN5bnRheH1gO1xuICAgICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7KHRva2VuLmhpbnQgJiYgYCR7dG9rZW4uaGludH0gYCkgfHwgJyd9JHtoaW50fWApLCB0b2tlblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSBpZiAoYWZ0ZXIubGVuZ3RoKSB7XG4gICAgICAgICAgY29uc3QgaGludCA9IGdyb3VwaW5nLmhpbnQ7XG4gICAgICAgICAgdG9rZW4gPSB0b2tlbiA9PiAoXG4gICAgICAgICAgICAodG9rZW4uaGludCA9IGAke2hpbnR9ICR7dG9rZW4udHlwZSB8fCAnY29kZSd9YCksICRjb250ZXh0LnRva2VuKHRva2VuKVxuICAgICAgICAgICk7XG4gICAgICAgICAgKHRva2VucyA9IGFmdGVyKS5lbmQgJiYgKG5leHRJbmRleCA9IGFmdGVyLmVuZCk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodG9rZW5zKSB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coe3Rva2VuLCB0b2tlbnMsIG5leHRJbmRleH0pO1xuICAgICAgICAgIGZvciAoY29uc3QgbmV4dCBvZiB0b2tlbnMpIHtcbiAgICAgICAgICAgIHByZXZpb3VzICYmICgobmV4dC5wcmV2aW91cyA9IHByZXZpb3VzKS5uZXh0ID0gbmV4dCk7XG4gICAgICAgICAgICB0b2tlbiAmJiB0b2tlbihuZXh0KTtcbiAgICAgICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBuZXh0SW5kZXggPiBpbmRleCAmJiAoc3RhdGUuaW5kZXggPSBuZXh0SW5kZXgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyAobmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9XG4vLyAgIChjbG9zdXJlLm9wZW4gJiZcbi8vICAgICBjbG9zdXJlLm9wZW4obmV4dCwgc3RhdGUsIHByZXZpb3VzKSAmJlxuLy8gICAgIChuZXh0LnB1bmN0dWF0b3IgfHwgcHVuY3R1YXRvcikpIHx8XG4vLyAgICdvcGVuZXInKSB8fFxuLy8gKG5leHQucHVuY3R1YXRvciA9IHB1bmN0dWF0b3IgPVxuLy8gICAoY2xvc3VyZS5vcGVuICYmIGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpKSB8fCAnb3BlbmVyJykgfHxcbi8vIGlmIChib2R5LnN5bnRheCAmJiBib2R5LnRleHQpIHtcbi8vICAgY29uc3Qge3N5bnRheCwgdGV4dH0gPSBib2R5O1xuLy8gICBjb25zdCBzdGF0ZSA9IHtvcHRpb25zOiB7c3ludGF4fX07XG4vLyAgIGNvbnN0IHRva2VucyA9IHRva2VuaXplKHRleHQsIHN0YXRlLCBkZWZhdWx0cyk7XG4vLyAgIGZvciAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB5aWVsZCB0b2tlbjtcbi8vIH1cblxuLy8gY29uc3QgYWdncmVnYXRlID1cbi8vICAgYXNzaWduZXJzIHx8IGNvbWJpbmF0b3JzXG4vLyAgICAgPyAoKC4uLmFnZ3JlZ2F0b3JzKSA9PiB7XG4vLyAgICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZXMgPSB7fTtcbi8vICAgICAgICAgaWYgKGFnZ3JlZ2F0b3JzLmxlbmd0aCkge1xuLy8gICAgICAgICAgIGxldCBhZ2dyZWdhdGVkID0gMDtcbi8vICAgICAgICAgICBmb3IgKGNvbnN0IGFnZ3JlZ2F0ZSBvZiBhZ2dyZWdhdG9ycylcbi8vICAgICAgICAgICAgIGlmIChhZ2dyZWdhdGUpXG4vLyAgICAgICAgICAgICAgIGZvciAoY29uc3Qgc3ltYm9sIG9mIGFnZ3JlZ2F0ZVsxXSlcbi8vICAgICAgICAgICAgICAgICAhc3ltYm9sIHx8XG4vLyAgICAgICAgICAgICAgICAgICBhZ2dyZWdhdGVzW3N5bWJvbF0gfHxcbi8vICAgICAgICAgICAgICAgICAgICgoYWdncmVnYXRlc1tzeW1ib2xdID0gYWdncmVnYXRlWzBdKSwgYWdncmVnYXRlZCsrKTtcbi8vICAgICAgICAgICBpZiAoIWFnZ3JlZ2F0ZWQpIHJldHVybiBmYWxzZTtcbi8vICAgICAgICAgfVxuLy8gICAgICAgICBjb25zdCBhZ2dyZWdhdG9yID0gdGV4dCA9PiBhZ2dyZWdhdGVzW3RleHRdIHx8IGZhbHNlO1xuLy8gICAgICAgICBhZ2dyZWdhdG9yLmFnZ3JlZ2F0ZXMgPSBhZ2dyZWdhdGVzO1xuLy8gICAgICAgICByZXR1cm4gYWdncmVnYXRvcjtcbi8vICAgICAgIH0pKFxuLy8gICAgICAgICBhc3NpZ25lcnMgJiYgKGFzc2lnbmVycy5zaXplID4gMCB8fCBhc3NpZ25lcnMubGVuZ3RoID4gMCkgJiYgWydhc3NpZ25lcicsIGFzc2lnbmVyc10sXG4vLyAgICAgICAgIGNvbWJpbmF0b3JzICYmXG4vLyAgICAgICAgICAgKGNvbWJpbmF0b3JzLnNpemUgPiAwIHx8IGNvbWJpbmF0b3JzLmxlbmd0aCA+IDApICYmIFsnY29tYmluYXRvcicsIGNvbWJpbmF0b3JzXSxcbi8vICAgICAgIClcbi8vICAgICA6IGZhbHNlO1xuIiwiLy8vIEhlbHBlcnNcbmV4cG9ydCBjb25zdCByYXcgPSBTdHJpbmcucmF3O1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIG1hdGNoIGV4cHJlc3Npb24gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3Qgc2VxdWVuY2UgPSAoLi4ucGF0dGVybnMpID0+XG4gIG5ldyBSZWdFeHAoUmVmbGVjdC5hcHBseShyYXcsIG51bGwsIHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuc291cmNlKSB8fCBwIHx8ICcnKSksICdnJyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgbWF5YmVJZGVudGlmaWVyIHRlc3QgKGllIFs8Zmlyc3Q+XVs8b3RoZXI+XSopIGV4cHJlc3Npb24uXG4gKlxuICogQHBhcmFtICB7RW50aXR5fSBmaXJzdCAtIFZhbGlkIF5bPOKApj5dIGVudGl0eVxuICogQHBhcmFtICB7RW50aXR5fSBvdGhlciAtIFZhbGlkIFs84oCmPl0qJCBlbnRpdHlcbiAqIEBwYXJhbSAge3N0cmluZ30gW2ZsYWdzXSAtIFJlZ0V4cCBmbGFncyAoZGVmYXVsdHMgdG8gJ3UnKVxuICogQHBhcmFtICB7dW5rbm93bn0gW2JvdW5kYXJ5XVxuICovXG5leHBvcnQgY29uc3QgaWRlbnRpZmllciA9IChcbiAgZmlyc3QsXG4gIG90aGVyID0gZmlyc3QsXG4gIGZsYWdzID0gJ3UnLFxuICBib3VuZGFyeSA9IC95Zy8udGVzdChmbGFncykgJiYgJ1xcXFxiJyxcbikgPT4gbmV3IFJlZ0V4cChgJHtib3VuZGFyeSB8fCAnXid9WyR7Zmlyc3R9XVske290aGVyfV0qJHtib3VuZGFyeSB8fCAnJCd9YCwgZmxhZ3MpO1xuXG4vKipcbiAqIENyZWF0ZSBhIHNlcXVlbmNlIHBhdHRlcm4gZnJvbSBwYXR0ZXJucy5cbiAqXG4gKiBAcGFyYW0gIHsuLi5QYXR0ZXJufSBwYXR0ZXJuc1xuICovXG5leHBvcnQgY29uc3QgYWxsID0gKC4uLnBhdHRlcm5zKSA9PiBwYXR0ZXJucy5tYXAocCA9PiAocCAmJiBwLmV4ZWMgPyBwLnNvdXJjZSA6IHApKS5qb2luKCd8Jyk7XG5cbi8vLyBTeW1ib2xzXG5cbmV4cG9ydCBjbGFzcyBTeW1ib2xzIGV4dGVuZHMgU2V0IHtcbiAgc3RhdGljIGZyb20oLi4uc291cmNlcykge1xuICAgIGNvbnN0IFNwZWNpZXMgPSB0aGlzIHx8IFN5bWJvbHM7XG4gICAgY29uc3Qgc3ltYm9scyA9IChzb3VyY2VzLmxlbmd0aCAmJiBTcGVjaWVzLnNwbGl0KHNvdXJjZXMpKSB8fCBbXTtcbiAgICByZXR1cm4gbmV3IFNwZWNpZXMoc3ltYm9scyk7XG4gIH1cblxuICBnZXQoc3ltYm9sKSB7XG4gICAgaWYgKHRoaXMuaGFzKHN5bWJvbCkpIHJldHVybiBzeW1ib2w7XG4gIH1cblxuICBzdGF0aWMgc3BsaXQoLi4uc291cmNlcykge1xuICAgIGNvbnN0IFNwZWNpZXMgPSB0aGlzIHx8IFN5bWJvbHM7XG4gICAgY29uc3Qgc3ltYm9scyA9IFtdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMuZmxhdCgpKSB7XG4gICAgICBzb3VyY2UgJiZcbiAgICAgICAgKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnXG4gICAgICAgICAgPyBzeW1ib2xzLnB1c2goLi4uc291cmNlLnNwbGl0KC8gKy8pKVxuICAgICAgICAgIDogU3ltYm9sLml0ZXJhdG9yIGluIHNvdXJjZSAmJiBzeW1ib2xzLnB1c2goLi4uU3BlY2llcy5zcGxpdCguLi5zb3VyY2UpKSk7XG4gICAgfVxuICAgIHJldHVybiBzeW1ib2xzO1xuICB9XG59XG5cbntcbiAgY29uc3Qge2hhc30gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhTZXQucHJvdG90eXBlKTtcbiAgY29uc3Qge21hcH0gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhBcnJheS5wcm90b3R5cGUpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhTeW1ib2xzLnByb3RvdHlwZSwge2luY2x1ZGVzOiBoYXMsIG1hcH0pO1xufVxuXG4vLy8gQ2xvc3VyZXNcblxuZXhwb3J0IGNsYXNzIENsb3N1cmUgZXh0ZW5kcyBTdHJpbmcge1xuICBjb25zdHJ1Y3RvcihvcGVuZXIsIGNsb3NlciA9IG9wZW5lcikge1xuICAgIGlmICghb3BlbmVyIHx8ICFjbG9zZXIpIHRocm93IEVycm9yKGBDYW5ub3QgY29uc3RydWN0IGNsb3N1cmUgZnJvbSBcIiR7b3BlbmVyfVwiIOKApiBcIiR7Y2xvc2VyfVwiYCk7XG4gICAgc3VwZXIoYCR7b3BlbmVyfeKApiR7Y2xvc2VyfWApO1xuICAgIHRoaXMub3BlbmVyID0gb3BlbmVyO1xuICAgIHRoaXMuY2xvc2VyID0gY2xvc2VyO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBDbG9zdXJlcyBleHRlbmRzIE1hcCB7XG4gIHN0YXRpYyBmcm9tKC4uLnNvdXJjZXMpIHtcbiAgICBjb25zdCBTcGVjaWVzID0gdGhpcyB8fCBDbG9zdXJlcztcbiAgICBjb25zdCBjbG9zdXJlcyA9IChzb3VyY2VzLmxlbmd0aCAmJiBTcGVjaWVzLnNwbGl0KHNvdXJjZXMpKSB8fCBbXTtcbiAgICByZXR1cm4gbmV3IFNwZWNpZXMoY2xvc3VyZXMpO1xuICB9XG4gIHN0YXRpYyBzcGxpdCguLi5zb3VyY2VzKSB7XG4gICAgY29uc3QgU3BlY2llcyA9IHRoaXMgfHwgQ2xvc3VyZXM7XG4gICAgY29uc3QgTWVtYmVyID0gU3BlY2llcy5FbGVtZW50IHx8IENsb3N1cmU7XG4gICAgY29uc3QgY2xvc3VyZXMgPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzLmZsYXQoKSkge1xuICAgICAgaWYgKHNvdXJjZSkge1xuICAgICAgICBzd2l0Y2ggKHR5cGVvZiBzb3VyY2UpIHtcbiAgICAgICAgICBjYXNlICdvYmplY3QnOiB7XG4gICAgICAgICAgICBpZiAoc291cmNlIGluc3RhbmNlb2YgTWVtYmVyKSB7XG4gICAgICAgICAgICAgIGNsb3N1cmVzLnB1c2goW3NvdXJjZS5vcGVuZXIsIHNvdXJjZV0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBTcGVjaWVzKSB7XG4gICAgICAgICAgICAgIGNsb3N1cmVzLnB1c2goLi4uc291cmNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYXNlICdzdHJpbmcnOiB7XG4gICAgICAgICAgICBmb3IgKGNvbnN0IHBhaXIgb2Ygc291cmNlLnNwbGl0KC8gKj8oW14gXSvigKZbXiBdK3xbXiDigKZdKykgKj8vKSkge1xuICAgICAgICAgICAgICBpZiAoIXBhaXIpIGNvbnRpbnVlO1xuICAgICAgICAgICAgICBjb25zdCBbb3BlbmVyLCBjbG9zZXJdID0gcGFpci5zcGxpdCgn4oCmJyk7XG4gICAgICAgICAgICAgIGNvbnN0IGNsb3N1cmUgPSBuZXcgTWVtYmVyKG9wZW5lciwgY2xvc2VyKTtcbiAgICAgICAgICAgICAgY2xvc3VyZXMucHVzaChbb3BlbmVyLCBjbG9zdXJlXSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNsb3N1cmVzO1xuICB9XG59XG5cbntcbiAgY29uc3Qge2hhc30gPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9ycyhNYXAucHJvdG90eXBlKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoQ2xvc3VyZXMucHJvdG90eXBlLCB7aW5jbHVkZXM6IGhhc30pO1xufVxuXG4vLyBleHBvcnQgY29uc3QgU3ltYm9scyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShcbi8vICAgc291cmNlID0+XG4vLyAgICAgKHNvdXJjZSAmJlxuLy8gICAgICAgKCh0eXBlb2Ygc291cmNlID09PSAnc3RyaW5nJyAmJiBzb3VyY2Uuc3BsaXQoLyArLykpIHx8XG4vLyAgICAgICAgIChTeW1ib2wuaXRlcmF0b3IgaW4gc291cmNlICYmIFsuLi5zb3VyY2VdKSkpIHx8XG4vLyAgICAgW10sXG4vLyAgICdmcm9tJyxcbi8vICAge3ZhbHVlOiAoLi4uYXJncykgPT4gWy4uLm5ldyBTZXQoW10uY29uY2F0KC4uLmFyZ3MubWFwKFN5bWJvbHMpKSldfSxcbi8vICk7XG4vLyBleHBvcnQgY29uc3QgU3ltYm9scyA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShzb3VyY2UgPT4gU3ltYm9scy5mcm9tKHNvdXJjZSksICdmcm9tJywge1xuLy8gICB2YWx1ZTogKC4uLmFyZ3MpID0+IFN5bWJvbHMuZnJvbSguLi5hcmdzKSxcbi8vIH0pO1xuXG4vLyBleHBvcnQgY29uc3QgY2xvc3VyZXMgPSBzdHJpbmcgPT4ge1xuLy8gICBjb25zdCBwYWlycyA9IFN5bWJvbHMuZnJvbShzdHJpbmcpO1xuLy8gICBjb25zdCBhcnJheSA9IG5ldyBBcnJheShwYWlycy5zaXplKTtcbi8vICAgY29uc3QgZW50cmllcyA9IHt9O1xuLy8gICBhcnJheS5wYWlycyA9IHBhaXJzO1xuLy8gICBsZXQgaSA9IDA7XG4vLyAgIGZvciAoY29uc3QgcGFpciBvZiBwYWlycykge1xuLy8gICAgIGNvbnN0IFtvcGVuZXIsIGNsb3Nlcl0gPSBwYWlyLnNwbGl0KCfigKYnKTtcbi8vICAgICAvLyBhcnJheVsoYXJyYXlbaSsrXSA9IG9wZW5lcildID0ge29wZW5lciwgY2xvc2VyfTtcbi8vICAgICBlbnRyaWVzWyhhcnJheVtpKytdID0gb3BlbmVyKV0gPSB7b3BlbmVyLCBjbG9zZXJ9O1xuLy8gICB9XG4vLyAgIGFycmF5LmdldCA9IG9wZW5lciA9PiBlbnRyaWVzW29wZW5lcl07XG4vLyAgIGFycmF5LnRvU3RyaW5nID0gKCkgPT4gc3RyaW5nO1xuLy8gICByZXR1cm4gYXJyYXk7XG4vLyB9O1xuXG4vLyBleHBvcnQgY29uc3QgbGluZXMgPSBzdHJpbmcgPT4gc3RyaW5nLnNwbGl0KC9cXG4rLyksXG4iLCIvKiogQHR5cGVkZWYge1JlZ0V4cHxzdHJpbmd9IFBhdHRlcm4gLSBWYWxpZCAvKOKApikvIHN1YiBleHByZXNzaW9uICovXG4vKiogQHR5cGVkZWYge3N0cmluZ3x7c291cmNlOiBzdHJpbmd9fSBFbnRpdHkgLSBWYWxpZCAvW+KApl0vIHN1YiBleHByZXNzaW9uICovXG5cbmV4cG9ydCB7cGF0dGVybnN9IGZyb20gJy4vbWFya3VwLXBhcnNlci5qcyc7XG5pbXBvcnQge3Jhd30gZnJvbSAnLi9oZWxwZXJzLmpzJztcblxuLy8vIEVudGl0aWVzXG5cbi8qKlxuICogVGhlIGNvbGxlY3Rpb24gb2YgUmVndWxhciBFeHByZXNzaW9ucyB1c2VkIHRvIG1hdGNoIHNwZWNpZmljXG4gKiBtYXJrdXAgc2VxdWVuY2VzIGluIGEgZ2l2ZW4gY29udGV4dCBvciB0byB0ZXN0IG1hdGNoZWQgc2VxdWVuY2VzIHZlcmJvc2VseVxuICogaW4gb3JkZXIgdG8gZnVydGhlciBjYXRlZ29yaXplIHRoZW0uIEZ1bGwgc3VwcG9ydCBmb3IgVW5pY29kZSBDbGFzc2VzIGFuZFxuICogUHJvcGVydGllcyBoYXMgYmVlbiBpbmNsdWRlZCBpbiB0aGUgRUNNQVNjcmlwdCBzcGVjaWZpY2F0aW9uIGJ1dCBjZXJ0YWluXG4gKiBlbmdpbmVzIGFyZSBzdGlsbCBpbXBsZW1lbnRpbmcgdGhlbS5cbiAqXG4gKiBAdHlwZSB7e1tuYW1lOiBzdHJpbmddOiB7W25hbWU6IHN0cmluZ106IEVudGl0eX19fVxuICovXG5leHBvcnQgY29uc3QgZW50aXRpZXMgPSB7XG4gIGVzOiB7XG4gICAgLyoqIGh0dHA6Ly93d3cuZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi85LjAvI3Byb2QtSWRlbnRpZmllclN0YXJ0ICovXG4gICAgSWRlbnRpZmllclN0YXJ0OiByYXdgXyRcXHB7SURfU3RhcnR9YCxcbiAgICAvKiogaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzkuMC8jcHJvZC1JZGVudGlmaWVyUGFydCAqL1xuICAgIElkZW50aWZpZXJQYXJ0OiByYXdgXyRcXHUyMDBjXFx1MjAwZFxccHtJRF9Db250aW51ZX1gLFxuICB9LFxufTtcblxuLyoqIEludGVyb3BlcmFiaWxpdHkgKGZvciBzb21lIGJyb3dzZXJzKSAqL1xuKFJhbmdlcyA9PiB7XG4gIGNvbnN0IHRyYW5zZm9ybXMgPSBbXTtcblxuICBpZiAoIXN1cHBvcnRzKHJhd2BcXHB7SURfU3RhcnR9YCwgJ3UnKSkge1xuICAgIGNvbnN0IFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMgPSAvXFxcXHB7ICooXFx3KykgKn0vZztcbiAgICBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UgPSAobSwgcHJvcGVydHlLZXkpID0+IHtcbiAgICAgIGlmIChwcm9wZXJ0eUtleSBpbiBSYW5nZXMpIHJldHVybiBSYW5nZXNbcHJvcGVydHlLZXldLnRvU3RyaW5nKCk7XG4gICAgICB0aHJvdyBSYW5nZUVycm9yKGBDYW5ub3QgcmV3cml0ZSB1bmljb2RlIHByb3BlcnR5IFwiJHtwcm9wZXJ0eUtleX1cImApO1xuICAgIH07XG4gICAgdHJhbnNmb3Jtcy5wdXNoKGV4cHJlc3Npb24gPT4ge1xuICAgICAgbGV0IGZsYWdzID0gZXhwcmVzc2lvbiAmJiBleHByZXNzaW9uLmZsYWdzO1xuICAgICAgbGV0IHNvdXJjZSA9IGV4cHJlc3Npb24gJiYgYCR7ZXhwcmVzc2lvbi5zb3VyY2UgfHwgZXhwcmVzc2lvbiB8fCAnJ31gO1xuICAgICAgc291cmNlICYmXG4gICAgICAgIFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMudGVzdChzb3VyY2UpICYmXG4gICAgICAgIChzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShVbmljb2RlUHJvcGVydHlFc2NhcGVzLCBVbmljb2RlUHJvcGVydHlFc2NhcGVzLnJlcGxhY2UpKTtcbiAgICAgIHJldHVybiAoZmxhZ3MgJiYgbmV3IFJlZ0V4cChzb3VyY2UsIGZsYWdzKSkgfHwgc291cmNlO1xuICAgIH0pO1xuICB9XG5cbiAgaWYgKCF0cmFuc2Zvcm1zLmxlbmd0aCkgcmV0dXJuO1xuXG4gIGZvciAoY29uc3Qga2V5IGluIGVudGl0aWVzKSB7XG4gICAgY29uc3Qgc291cmNlcyA9IGVudGl0aWVzW2tleV07XG4gICAgY29uc3QgY2hhbmdlcyA9IHt9O1xuICAgIGZvciAoY29uc3QgaWQgaW4gc291cmNlcykge1xuICAgICAgbGV0IHNvdXJjZSA9IHNvdXJjZXNbaWRdO1xuICAgICAgaWYgKCFzb3VyY2UgfHwgdHlwZW9mIHNvdXJjZSAhPT0gJ3N0cmluZycpIGNvbnRpbnVlO1xuICAgICAgZm9yIChjb25zdCB0cmFuc2Zvcm0gb2YgdHJhbnNmb3Jtcykgc291cmNlID0gdHJhbnNmb3JtKHNvdXJjZSk7XG4gICAgICAhc291cmNlIHx8IHNvdXJjZSA9PT0gc291cmNlc1tpZF0gfHwgKGNoYW5nZXNbaWRdID0gc291cmNlKTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihzb3VyY2VzLCBjaGFuZ2VzKTtcbiAgfVxuXG4gIC8vIHByZXR0aWVyLWlnbm9yZVxuICBmdW5jdGlvbiBzdXBwb3J0cygpIHt0cnkge3JldHVybiAhIVJlZ0V4cCguLi4gYXJndW1lbnRzKX0gY2F0Y2ggKGUpIHsgfX1cbn0pKHtcbiAgSURfU3RhcnQ6IHJhd2BhLXpBLVpcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY2AsXG4gIElEX0NvbnRpbnVlOiByYXdgYS16QS1aMC05XFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNcXHUyMDBjXFx1MjAwZFxceGI3XFx1MDMwMC1cXHUwMzZmXFx1MDM4N1xcdTA0ODMtXFx1MDQ4N1xcdTA1OTEtXFx1MDViZFxcdTA1YmZcXHUwNWMxXFx1MDVjMlxcdTA1YzRcXHUwNWM1XFx1MDVjN1xcdTA2MTAtXFx1MDYxYVxcdTA2NGItXFx1MDY2OVxcdTA2NzBcXHUwNmQ2LVxcdTA2ZGNcXHUwNmRmLVxcdTA2ZTRcXHUwNmU3XFx1MDZlOFxcdTA2ZWEtXFx1MDZlZFxcdTA2ZjAtXFx1MDZmOVxcdTA3MTFcXHUwNzMwLVxcdTA3NGFcXHUwN2E2LVxcdTA3YjBcXHUwN2MwLVxcdTA3YzlcXHUwN2ViLVxcdTA3ZjNcXHUwN2ZkXFx1MDgxNi1cXHUwODE5XFx1MDgxYi1cXHUwODIzXFx1MDgyNS1cXHUwODI3XFx1MDgyOS1cXHUwODJkXFx1MDg1OS1cXHUwODViXFx1MDhkMy1cXHUwOGUxXFx1MDhlMy1cXHUwOTAzXFx1MDkzYS1cXHUwOTNjXFx1MDkzZS1cXHUwOTRmXFx1MDk1MS1cXHUwOTU3XFx1MDk2MlxcdTA5NjNcXHUwOTY2LVxcdTA5NmZcXHUwOTgxLVxcdTA5ODNcXHUwOWJjXFx1MDliZS1cXHUwOWM0XFx1MDljN1xcdTA5YzhcXHUwOWNiLVxcdTA5Y2RcXHUwOWQ3XFx1MDllMlxcdTA5ZTNcXHUwOWU2LVxcdTA5ZWZcXHUwOWZlXFx1MGEwMS1cXHUwYTAzXFx1MGEzY1xcdTBhM2UtXFx1MGE0MlxcdTBhNDdcXHUwYTQ4XFx1MGE0Yi1cXHUwYTRkXFx1MGE1MVxcdTBhNjYtXFx1MGE3MVxcdTBhNzVcXHUwYTgxLVxcdTBhODNcXHUwYWJjXFx1MGFiZS1cXHUwYWM1XFx1MGFjNy1cXHUwYWM5XFx1MGFjYi1cXHUwYWNkXFx1MGFlMlxcdTBhZTNcXHUwYWU2LVxcdTBhZWZcXHUwYWZhLVxcdTBhZmZcXHUwYjAxLVxcdTBiMDNcXHUwYjNjXFx1MGIzZS1cXHUwYjQ0XFx1MGI0N1xcdTBiNDhcXHUwYjRiLVxcdTBiNGRcXHUwYjU2XFx1MGI1N1xcdTBiNjJcXHUwYjYzXFx1MGI2Ni1cXHUwYjZmXFx1MGI4MlxcdTBiYmUtXFx1MGJjMlxcdTBiYzYtXFx1MGJjOFxcdTBiY2EtXFx1MGJjZFxcdTBiZDdcXHUwYmU2LVxcdTBiZWZcXHUwYzAwLVxcdTBjMDRcXHUwYzNlLVxcdTBjNDRcXHUwYzQ2LVxcdTBjNDhcXHUwYzRhLVxcdTBjNGRcXHUwYzU1XFx1MGM1NlxcdTBjNjJcXHUwYzYzXFx1MGM2Ni1cXHUwYzZmXFx1MGM4MS1cXHUwYzgzXFx1MGNiY1xcdTBjYmUtXFx1MGNjNFxcdTBjYzYtXFx1MGNjOFxcdTBjY2EtXFx1MGNjZFxcdTBjZDVcXHUwY2Q2XFx1MGNlMlxcdTBjZTNcXHUwY2U2LVxcdTBjZWZcXHUwZDAwLVxcdTBkMDNcXHUwZDNiXFx1MGQzY1xcdTBkM2UtXFx1MGQ0NFxcdTBkNDYtXFx1MGQ0OFxcdTBkNGEtXFx1MGQ0ZFxcdTBkNTdcXHUwZDYyXFx1MGQ2M1xcdTBkNjYtXFx1MGQ2ZlxcdTBkODJcXHUwZDgzXFx1MGRjYVxcdTBkY2YtXFx1MGRkNFxcdTBkZDZcXHUwZGQ4LVxcdTBkZGZcXHUwZGU2LVxcdTBkZWZcXHUwZGYyXFx1MGRmM1xcdTBlMzFcXHUwZTM0LVxcdTBlM2FcXHUwZTQ3LVxcdTBlNGVcXHUwZTUwLVxcdTBlNTlcXHUwZWIxXFx1MGViNC1cXHUwZWI5XFx1MGViYlxcdTBlYmNcXHUwZWM4LVxcdTBlY2RcXHUwZWQwLVxcdTBlZDlcXHUwZjE4XFx1MGYxOVxcdTBmMjAtXFx1MGYyOVxcdTBmMzVcXHUwZjM3XFx1MGYzOVxcdTBmM2VcXHUwZjNmXFx1MGY3MS1cXHUwZjg0XFx1MGY4NlxcdTBmODdcXHUwZjhkLVxcdTBmOTdcXHUwZjk5LVxcdTBmYmNcXHUwZmM2XFx1MTAyYi1cXHUxMDNlXFx1MTA0MC1cXHUxMDQ5XFx1MTA1Ni1cXHUxMDU5XFx1MTA1ZS1cXHUxMDYwXFx1MTA2Mi1cXHUxMDY0XFx1MTA2Ny1cXHUxMDZkXFx1MTA3MS1cXHUxMDc0XFx1MTA4Mi1cXHUxMDhkXFx1MTA4Zi1cXHUxMDlkXFx1MTM1ZC1cXHUxMzVmXFx1MTM2OS1cXHUxMzcxXFx1MTcxMi1cXHUxNzE0XFx1MTczMi1cXHUxNzM0XFx1MTc1MlxcdTE3NTNcXHUxNzcyXFx1MTc3M1xcdTE3YjQtXFx1MTdkM1xcdTE3ZGRcXHUxN2UwLVxcdTE3ZTlcXHUxODBiLVxcdTE4MGRcXHUxODEwLVxcdTE4MTlcXHUxOGE5XFx1MTkyMC1cXHUxOTJiXFx1MTkzMC1cXHUxOTNiXFx1MTk0Ni1cXHUxOTRmXFx1MTlkMC1cXHUxOWRhXFx1MWExNy1cXHUxYTFiXFx1MWE1NS1cXHUxYTVlXFx1MWE2MC1cXHUxYTdjXFx1MWE3Zi1cXHUxYTg5XFx1MWE5MC1cXHUxYTk5XFx1MWFiMC1cXHUxYWJkXFx1MWIwMC1cXHUxYjA0XFx1MWIzNC1cXHUxYjQ0XFx1MWI1MC1cXHUxYjU5XFx1MWI2Yi1cXHUxYjczXFx1MWI4MC1cXHUxYjgyXFx1MWJhMS1cXHUxYmFkXFx1MWJiMC1cXHUxYmI5XFx1MWJlNi1cXHUxYmYzXFx1MWMyNC1cXHUxYzM3XFx1MWM0MC1cXHUxYzQ5XFx1MWM1MC1cXHUxYzU5XFx1MWNkMC1cXHUxY2QyXFx1MWNkNC1cXHUxY2U4XFx1MWNlZFxcdTFjZjItXFx1MWNmNFxcdTFjZjctXFx1MWNmOVxcdTFkYzAtXFx1MWRmOVxcdTFkZmItXFx1MWRmZlxcdTIwM2ZcXHUyMDQwXFx1MjA1NFxcdTIwZDAtXFx1MjBkY1xcdTIwZTFcXHUyMGU1LVxcdTIwZjBcXHUyY2VmLVxcdTJjZjFcXHUyZDdmXFx1MmRlMC1cXHUyZGZmXFx1MzAyYS1cXHUzMDJmXFx1MzA5OVxcdTMwOWFcXHVhNjIwLVxcdWE2MjlcXHVhNjZmXFx1YTY3NC1cXHVhNjdkXFx1YTY5ZVxcdWE2OWZcXHVhNmYwXFx1YTZmMVxcdWE4MDJcXHVhODA2XFx1YTgwYlxcdWE4MjMtXFx1YTgyN1xcdWE4ODBcXHVhODgxXFx1YThiNC1cXHVhOGM1XFx1YThkMC1cXHVhOGQ5XFx1YThlMC1cXHVhOGYxXFx1YThmZi1cXHVhOTA5XFx1YTkyNi1cXHVhOTJkXFx1YTk0Ny1cXHVhOTUzXFx1YTk4MC1cXHVhOTgzXFx1YTliMy1cXHVhOWMwXFx1YTlkMC1cXHVhOWQ5XFx1YTllNVxcdWE5ZjAtXFx1YTlmOVxcdWFhMjktXFx1YWEzNlxcdWFhNDNcXHVhYTRjXFx1YWE0ZFxcdWFhNTAtXFx1YWE1OVxcdWFhN2ItXFx1YWE3ZFxcdWFhYjBcXHVhYWIyLVxcdWFhYjRcXHVhYWI3XFx1YWFiOFxcdWFhYmVcXHVhYWJmXFx1YWFjMVxcdWFhZWItXFx1YWFlZlxcdWFhZjVcXHVhYWY2XFx1YWJlMy1cXHVhYmVhXFx1YWJlY1xcdWFiZWRcXHVhYmYwLVxcdWFiZjlcXHVmYjFlXFx1ZmUwMC1cXHVmZTBmXFx1ZmUyMC1cXHVmZTJmXFx1ZmUzM1xcdWZlMzRcXHVmZTRkLVxcdWZlNGZcXHVmZjEwLVxcdWZmMTlcXHVmZjNmYCxcbn0pO1xuXG5leHBvcnQgY29uc3QgcmVhZHkgPSBQcm9taXNlLnJlc29sdmUoKTtcblxuLy8gLy8vIFJlZ3VsYXIgRXhwcmVzc2lvbnNcbi8vIGV4cG9ydCBjb25zdCBSZWdFeHBVbmljb2RlUHJvcGVydGllcyA9IC9cXFxccHsgKihcXHcrKSAqfS9nO1xuXG4vLyBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXBsYWNlID0gKG0sIHByb3BlcnR5S2V5KSA9PiB7XG4vLyAgIC8vIGNvbnN0IHByb3BlcnR5ID0gQVNDSUlbcHJvcGVydHlLZXldIHx8IFVuaWNvZGVbcHJvcGVydHlLZXldO1xuLy8gICBjb25zdCBwcm9wZXJ0eSA9IFJhbmdlc1twcm9wZXJ0eUtleV07XG4vLyAgIGlmIChwcm9wZXJ0eSkgcmV0dXJuIHByb3BlcnR5LnRvU3RyaW5nKCk7XG4vLyAgIHRocm93IFJhbmdlRXJyb3IoYENhbm5vdCByZXdyaXRlIHVuaWNvZGUgcHJvcGVydHkgXCIke3Byb3BlcnR5S2V5fVwiYCk7XG4vLyB9O1xuXG4vLyBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXdyaXRlID0gZXhwcmVzc2lvbiA9PiB7XG4vLyAgIGxldCBmbGFncyA9IGV4cHJlc3Npb24gJiYgZXhwcmVzc2lvbi5mbGFncztcbi8vICAgbGV0IHNvdXJjZSA9IGV4cHJlc3Npb24gJiYgYCR7ZXhwcmVzc2lvbi5zb3VyY2UgfHwgZXhwcmVzc2lvbiB8fCAnJ31gO1xuLy8gICBzb3VyY2UgJiZcbi8vICAgICBSZWdFeHBVbmljb2RlUHJvcGVydGllcy50ZXN0KHNvdXJjZSkgJiZcbi8vICAgICAoc291cmNlID0gc291cmNlLnJlcGxhY2UoUmVnRXhwVW5pY29kZVByb3BlcnRpZXMsIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJlcGxhY2UpKTtcbi8vICAgcmV0dXJuIChmbGFncyAmJiBuZXcgUmVnRXhwKHNvdXJjZSwgZmxhZ3MpKSB8fCBzb3VyY2U7XG4vLyB9O1xuXG4vLyAvLy8gSW50ZXJvcGVyYWJpbGl0eVxuLy8gZXhwb3J0IGNvbnN0IHN1cHBvcnRlZCA9XG4vLyAgIC8vIFRPRE86IFJlbW92ZSB3aGVuIHNzdXBwb3J0aW5nIG5vbi11bmljb2RlIHJ1bnRpbWVzIFtub3QgaW4gc2NvcGVdXG4vLyAgIG5ldyBSZWdFeHAocmF3YFxcdUZGRkZgLCAndScpICYmXG4vLyAgIHN1cHBvcnRzKFxuLy8gICAgIFVuaWNvZGVQcm9wZXJ0aWVzID0+IG5ldyBSZWdFeHAocmF3YFxccHtMfWAsICd1JyksXG4vLyAgICAgVW5pY29kZUNsYXNzZXMgPT4gbmV3IFJlZ0V4cChyYXdgXFxwe0lEX1N0YXJ0fVxccHtJRF9Db250aW51ZX1gLCAndScpLFxuLy8gICApO1xuXG4vLyBhc3luYyBmdW5jdGlvbiByZXBsYWNlVW5zdXBwb3J0ZWRFeHByZXNzaW9ucygpIHtcbi8vICAgLy8gYXdhaXQgVW5pY29kZS5pbml0aWFsaXplKCk7IGNvbnNvbGUubG9nKFVuaWNvZGUpO1xuLy8gICBmb3IgKGNvbnN0IGtleSBpbiBlbnRpdGllcykge1xuLy8gICAgIGNvbnN0IHNvdXJjZXMgPSBlbnRpdGllc1trZXldO1xuLy8gICAgIGNvbnN0IHJlcGxhY2VtZW50cyA9IHt9O1xuLy8gICAgIGZvciAoY29uc3QgaWQgaW4gc291cmNlcylcbi8vICAgICAgICFzb3VyY2VzW2lkXSB8fFxuLy8gICAgICAgICB0eXBlb2YgKHNvdXJjZXNbaWRdLnNvdXJjZSB8fCBzb3VyY2VzW2lkXSkgIT09ICdzdHJpbmcnIHx8XG4vLyAgICAgICAgIChyZXBsYWNlbWVudHNbaWRdID0gUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmV3cml0ZShzb3VyY2VzW2lkXSkpO1xuLy8gICAgIE9iamVjdC5hc3NpZ24oc291cmNlcywgcmVwbGFjZW1lbnRzKTtcbi8vICAgfVxuLy8gICByZXR1cm47XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHN1cHBvcnRzKGZlYXR1cmUsIC4uLmZlYXR1cmVzKSB7XG4vLyAgIGlmIChmZWF0dXJlKSB7XG4vLyAgICAgdHJ5IHtcbi8vICAgICAgIGZlYXR1cmUoKTtcbi8vICAgICB9IGNhdGNoIChleGNlcHRpb24pIHtcbi8vICAgICAgIHJldHVybiBmYWxzZTtcbi8vICAgICB9XG4vLyAgIH1cbi8vICAgcmV0dXJuICFmZWF0dXJlcy5sZW5ndGggfHwgUmVmbGVjdC5hcHBseShzdXBwb3J0cywgbnVsbCwgZmVhdHVyZXMpO1xuLy8gfVxuXG4vLyAvLyBUT0RPOiBGaXggVW5pY29kZVJhbmdlLm1lcmdlIGlmIG5vdCBpbXBsZW1lbnRlZCBpbiBGaXJlZm94IHNvb25cbi8vIC8vIGltcG9ydCB7VW5pY29kZX0gZnJvbSAnLi91bmljb2RlL3VuaWNvZGUuanMnO1xuXG4vLyAvLyBUT0RPOiBSZW1vdmUgUmFuZ2VzIG9uY2UgVW5pY29kZVJhbmdlIGlzIHdvcmtpbmdcbi8vIGNvbnN0IFJhbmdlcyA9IHtcbi8vICAgLy8gTDogJ2EtekEtWicsXG4vLyAgIC8vIE46ICcwLTknLFxuLy8gICBJRF9TdGFydDogcmF3YGEtekEtWlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjYCxcbi8vICAgSURfQ29udGludWU6IHJhd2BhLXpBLVowLTlcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY1xcdTIwMGNcXHUyMDBkXFx4YjdcXHUwMzAwLVxcdTAzNmZcXHUwMzg3XFx1MDQ4My1cXHUwNDg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDYxMC1cXHUwNjFhXFx1MDY0Yi1cXHUwNjY5XFx1MDY3MFxcdTA2ZDYtXFx1MDZkY1xcdTA2ZGYtXFx1MDZlNFxcdTA2ZTdcXHUwNmU4XFx1MDZlYS1cXHUwNmVkXFx1MDZmMC1cXHUwNmY5XFx1MDcxMVxcdTA3MzAtXFx1MDc0YVxcdTA3YTYtXFx1MDdiMFxcdTA3YzAtXFx1MDdjOVxcdTA3ZWItXFx1MDdmM1xcdTA3ZmRcXHUwODE2LVxcdTA4MTlcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODU5LVxcdTA4NWJcXHUwOGQzLVxcdTA4ZTFcXHUwOGUzLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZFxcdTA5ZDdcXHUwOWUyXFx1MDllM1xcdTA5ZTYtXFx1MDllZlxcdTA5ZmVcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBhZmEtXFx1MGFmZlxcdTBiMDEtXFx1MGIwM1xcdTBiM2NcXHUwYjNlLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTZcXHUwYjU3XFx1MGI2MlxcdTBiNjNcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDAtXFx1MGMwNFxcdTBjM2UtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2MlxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgxLVxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBkMDAtXFx1MGQwM1xcdTBkM2JcXHUwZDNjXFx1MGQzZS1cXHUwZDQ0XFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ0YS1cXHUwZDRkXFx1MGQ1N1xcdTBkNjJcXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ4MlxcdTBkODNcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZTYtXFx1MGRlZlxcdTBkZjJcXHUwZGYzXFx1MGUzMVxcdTBlMzQtXFx1MGUzYVxcdTBlNDctXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlYjFcXHUwZWI0LVxcdTBlYjlcXHUwZWJiXFx1MGViY1xcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZVxcdTBmM2ZcXHUwZjcxLVxcdTBmODRcXHUwZjg2XFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDJiLVxcdTEwM2VcXHUxMDQwLVxcdTEwNDlcXHUxMDU2LVxcdTEwNTlcXHUxMDVlLVxcdTEwNjBcXHUxMDYyLVxcdTEwNjRcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxMzY5LVxcdTEzNzFcXHUxNzEyLVxcdTE3MTRcXHUxNzMyLVxcdTE3MzRcXHUxNzUyXFx1MTc1M1xcdTE3NzJcXHUxNzczXFx1MTdiNC1cXHUxN2QzXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4YTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NGZcXHUxOWQwLVxcdTE5ZGFcXHUxYTE3LVxcdTFhMWJcXHUxYTU1LVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWIwLVxcdTFhYmRcXHUxYjAwLVxcdTFiMDRcXHUxYjM0LVxcdTFiNDRcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiODJcXHUxYmExLVxcdTFiYWRcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzI0LVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzUwLVxcdTFjNTlcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZThcXHUxY2VkXFx1MWNmMi1cXHUxY2Y0XFx1MWNmNy1cXHUxY2Y5XFx1MWRjMC1cXHUxZGY5XFx1MWRmYi1cXHUxZGZmXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJjZWYtXFx1MmNmMVxcdTJkN2ZcXHUyZGUwLVxcdTJkZmZcXHUzMDJhLVxcdTMwMmZcXHUzMDk5XFx1MzA5YVxcdWE2MjAtXFx1YTYyOVxcdWE2NmZcXHVhNjc0LVxcdWE2N2RcXHVhNjllXFx1YTY5ZlxcdWE2ZjBcXHVhNmYxXFx1YTgwMlxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTg4MFxcdWE4ODFcXHVhOGI0LVxcdWE4YzVcXHVhOGQwLVxcdWE4ZDlcXHVhOGUwLVxcdWE4ZjFcXHVhOGZmLVxcdWE5MDlcXHVhOTI2LVxcdWE5MmRcXHVhOTQ3LVxcdWE5NTNcXHVhOTgwLVxcdWE5ODNcXHVhOWIzLVxcdWE5YzBcXHVhOWQwLVxcdWE5ZDlcXHVhOWU1XFx1YTlmMC1cXHVhOWY5XFx1YWEyOS1cXHVhYTM2XFx1YWE0M1xcdWFhNGNcXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3Yi1cXHVhYTdkXFx1YWFiMFxcdWFhYjItXFx1YWFiNFxcdWFhYjdcXHVhYWI4XFx1YWFiZVxcdWFhYmZcXHVhYWMxXFx1YWFlYi1cXHVhYWVmXFx1YWFmNVxcdWFhZjZcXHVhYmUzLVxcdWFiZWFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMWVcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMmZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZmMTAtXFx1ZmYxOVxcdWZmM2ZgLFxuLy8gfTtcblxuLy8gLy8vIEJvb3RzdHJhcFxuLy8gZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGVudGl0aWVzLnJlYWR5ID0gc3VwcG9ydGVkXG4vLyAgID8gUHJvbWlzZS5yZXNvbHZlKClcbi8vICAgOiByZXBsYWNlVW5zdXBwb3J0ZWRFeHByZXNzaW9ucygpKTtcbiIsImNvbnN0IGRlZmF1bHRzID0ge1xuICBhbGlhc2VzOiBbJ3BzJywgJ2VwcyddLFxuICBzeW50YXg6ICdwb3N0c2NyaXB0Jyxcbn07XG5cbmNvbnN0IGtleXdvcmRzID1cbiAgJ2FicyBhZGQgYWxvYWQgYW5jaG9yc2VhcmNoIGFuZCBhcmMgYXJjbiBhcmN0IGFyY3RvIGFycmF5IGFzaG93IGFzdG9yZSBhdGFuIGF3aWR0aHNob3cgYmVnaW4gYmluZCBiaXRzaGlmdCBieXRlc2F2YWlsYWJsZSBjYWNoZXN0YXR1cyBjZWlsaW5nIGNoYXJwYXRoIGNsZWFyIGNsZWFydG9tYXJrIGNsZWFyZGljdHN0YWNrIGNsaXAgY2xpcHBhdGggY2xvc2VmaWxlIGNsb3NlcGF0aCBjb2xvcmltYWdlIGNvbmNhdCBjb25jYXRtYXRyaXggY29uZGl0aW9uIGNvbmZpZ3VyYXRpb25lcnJvciBjb3B5IGNvcHlwYWdlIGNvcyBjb3VudCBjb3VudGRpY3RzdGFjayBjb3VudGV4ZWNzdGFjayBjb3VudHRvbWFyayBjc2hvdyBjdXJyZW50YmxhY2tnZW5lcmF0aW9uIGN1cnJlbnRjYWNoZXBhcmFtcyBjdXJyZW50Y215a2NvbG9yIGN1cnJlbnRjb2xvciBjdXJyZW50Y29sb3JyZW5kZXJpbmcgY3VycmVudGNvbG9yc2NyZWVuIGN1cnJlbnRjb2xvcnNwYWNlIGN1cnJlbnRjb2xvcnRyYW5zZmVyIGN1cnJlbnRjb250ZXh0IGN1cnJlbnRkYXNoIGN1cnJlbnRkZXZwYXJhbXMgY3VycmVudGRpY3QgY3VycmVudGZpbGUgY3VycmVudGZsYXQgY3VycmVudGZvbnQgY3VycmVudGdsb2JhbCBjdXJyZW50Z3JheSBjdXJyZW50Z3N0YXRlIGN1cnJlbnRoYWxmdG9uZSBjdXJyZW50aGFsZnRvbmVwaGFzZSBjdXJyZW50aHNiY29sb3IgY3VycmVudGxpbmVjYXAgY3VycmVudGxpbmVqb2luIGN1cnJlbnRsaW5ld2lkdGggY3VycmVudG1hdHJpeCBjdXJyZW50bWl0ZXJsaW1pdCBjdXJyZW50b2JqZWN0Zm9ybWF0IGN1cnJlbnRwYWNraW5nIGN1cnJlbnRwYWdlZGV2aWNlIGN1cnJlbnRwb2ludCBjdXJyZW50cmdiY29sb3IgY3VycmVudHNjcmVlbiBjdXJyZW50c2hhcmVkIGN1cnJlbnRzdHJva2VhZGp1c3QgY3VycmVudHN5c3RlbXBhcmFtcyBjdXJyZW50dHJhbnNmZXIgY3VycmVudHVuZGVyY29sb3JyZW1vdmFsIGN1cnJlbnR1c2VycGFyYW1zIGN1cnZldG8gY3ZpIGN2bGl0IGN2biBjdnIgY3ZycyBjdnMgY3Z4IGRlZiBkZWZhdWx0bWF0cml4IGRlZmluZWZvbnQgZGVmaW5lcmVzb3VyY2UgZGVmaW5ldXNlcm5hbWUgZGVmaW5ldXNlcm9iamVjdCBkZWxldGVmaWxlIGRldGFjaCBkZXZpY2VpbmZvIGRpY3QgZGljdGZ1bGwgZGljdHN0YWNrIGRpY3RzdGFja292ZXJmbG93IGRpY3RzdGFja3VuZGVyZmxvdyBkaXYgZHRyYW5zZm9ybSBkdXAgZWNobyBlZXhlYyBlbmQgZW9jbGlwIGVvZmlsbCBlb3ZpZXdjbGlwIGVxIGVyYXNlcGFnZSBlcnJvcmRpY3QgZXhjaCBleGVjIGV4ZWNmb3JtIGV4ZWNzdGFjayBleGVjc3RhY2tvdmVyZmxvdyBleGVjdXNlcm9iamVjdCBleGVjdXRlb25seSBleGVjdXRpdmUgZXhpdCBleHAgZmFsc2UgZmlsZSBmaWxlbmFtZWZvcmFsbCBmaWxlcG9zaXRpb24gZmlsbCBmaWx0ZXIgZmluZGVuY29kaW5nIGZpbmRmb250IGZpbmRyZXNvdXJjZSBmbGF0dGVucGF0aCBmbG9vciBmbHVzaCBmbHVzaGZpbGUgRm9udERpcmVjdG9yeSBmb3IgZm9yYWxsIGZvcmsgZ2UgZ2V0IGdldGludGVydmFsIGdsb2JhbGRpY3QgR2xvYmFsRm9udERpcmVjdG9yeSBnbHlwaHNob3cgZ3Jlc3RvcmUgZ3Jlc3RvcmVhbGwgZ3NhdmUgZ3N0YXRlIGd0IGhhbmRsZWVycm9yIGlkZW50bWF0cml4IGlkaXYgaWR0cmFuc2Zvcm0gaWYgaWZlbHNlIGltYWdlIGltYWdlbWFzayBpbmRleCBpbmVvZmlsbCBpbmZpbGwgaW5pdGNsaXAgaW5pdGdyYXBoaWNzIGluaXRtYXRyaXggaW5pdHZpZXdjbGlwIGluc3Ryb2tlIGludGVybmFsZGljdCBpbnRlcnJ1cHQgaW51ZW9maWxsIGludWZpbGwgaW51c3Ryb2tlIGludmFsaWRhY2Nlc3MgaW52YWxpZGNvbnRleHQgaW52YWxpZGV4aXQgaW52YWxpZGZpbGVhY2Nlc3MgaW52YWxpZGZvbnQgaW52YWxpZGlkIGludmFsaWRyZXN0b3JlIGludmVydG1hdHJpeCBpb2Vycm9yIElTT0xhdGluMUVuY29kaW5nIGl0cmFuc2Zvcm0gam9pbiBrc2hvdyBrbm93biBsYW5ndWFnZWxldmVsIGxlIGxlbmd0aCBsaW1pdGNoZWNrIGxpbmV0byBsbiBsb2FkIGxvY2sgbG9nIGxvb3AgbHQgbWFrZWZvbnQgbWFrZXBhdHRlcm4gbWFyayBtYXRyaXggbWF4bGVuZ3RoIG1vZCBtb25pdG9yIG1vdmV0byBtdWwgbmUgbmVnIG5ld3BhdGggbm9hY2Nlc3Mgbm9jdXJyZW50cG9pbnQgbm90IG5vdGlmeSBudWxsIG51bGxkZXZpY2Ugb3IgcGFja2VkYXJyYXkgcGF0aGJib3ggcGF0aGZvcmFsbCBwb3AgcHJpbnQgcHJpbnRvYmplY3QgcHJvZHVjdCBwcm9tcHQgcHN0YWNrIHB1dCBwdXRpbnRlcnZhbCBxdWl0IHJhbmQgcmFuZ2VjaGVjayByY3VydmV0byByZWFkIHJlYWRoZXhzdHJpbmcgcmVhZGxpbmUgcmVhZG9ubHkgcmVhZHN0cmluZyByZWFsdGltZSByZWN0Y2xpcCByZWN0ZmlsbCByZWN0c3Ryb2tlIHJlY3R2aWV3Y2xpcCByZW5hbWVmaWxlIHJlcGVhdCByZXNldGZpbGUgcmVzb3VyY2Vmb3JhbGwgcmVzb3VyY2VzdGF0dXMgcmVzdG9yZSByZXZlcnNlcGF0aCByZXZpc2lvbiBybGluZXRvIHJtb3ZldG8gcm9sbCByb290Zm9udCByb3RhdGUgcm91bmQgcnJhbmQgcnVuIHNhdmUgc2NhbGUgc2NhbGVmb250IHNjaGVjayBzZWFyY2ggc2VsZWN0Zm9udCBzZXJpYWxudW1iZXIgc2V0YmJveCBzZXRibGFja2dlbmVyYXRpb24gc2V0Y2FjaGVkZXZpY2Ugc2V0Y2FjaGVkZXZpY2UyIHNldGNhY2hlbGltaXQgc2V0Y2FjaGVwYXJhbXMgc2V0Y2hhcndpZHRoIHNldGNteWtjb2xvciBzZXRjb2xvciBzZXRjb2xvcnJlbmRlcmluZyBzZXRjb2xvcnNjcmVlbiBzZXRjb2xvcnNwYWNlIHNldGNvbG9ydHJhbnNmZXIgc2V0ZGFzaCBzZXRkZXZwYXJhbXMgc2V0ZmlsZXBvc2l0aW9uIHNldGZsYXQgc2V0Zm9udCBzZXRnbG9iYWwgc2V0Z3JheSBzZXRnc3RhdGUgc2V0aGFsZnRvbmUgc2V0aGFsZnRvbmVwaGFzZSBzZXRoc2Jjb2xvciBzZXRsaW5lY2FwIHNldGxpbmVqb2luIHNldGxpbmV3aWR0aCBzZXRtYXRyaXggc2V0bWl0ZXJsaW1pdCBzZXRvYmplY3Rmb3JtYXQgc2V0b3ZlcnByaW50IHNldHBhY2tpbmcgc2V0cGFnZWRldmljZSBzZXRwYXR0ZXJuIHNldHJnYmNvbG9yIHNldHNjcmVlbiBzZXRzaGFyZWQgc2V0c3Ryb2tlYWRqdXN0IHNldHN5c3RlbXBhcmFtcyBzZXR0cmFuc2ZlciBzZXR1Y2FjaGVwYXJhbXMgc2V0dW5kZXJjb2xvcnJlbW92YWwgc2V0dXNlcnBhcmFtcyBzZXR2bXRocmVzaG9sZCBzaGFyZWRkaWN0IHNob3cgc2hvd3BhZ2Ugc2luIHNxcnQgc3JhbmQgc3RhY2sgc3RhY2tvdmVyZmxvdyBzdGFja3VuZGVyZmxvdyBTdGFuZGFyZEVuY29kaW5nIHN0YXJ0IHN0YXJ0am9iIHN0YXR1cyBzdGF0dXNkaWN0IHN0b3Agc3RvcHBlZCBzdG9yZSBzdHJpbmcgc3RyaW5nd2lkdGggc3Ryb2tlIHN0cm9rZXBhdGggc3ViIHN5bnRheGVycm9yIHN5c3RlbWRpY3QgdGltZW91dCB0cmFuc2Zvcm0gdHJhbnNsYXRlIHRydWUgdHJ1bmNhdGUgdHlwZSB0eXBlY2hlY2sgdG9rZW4gdWFwcGVuZCB1Y2FjaGUgdWNhY2hlc3RhdHVzIHVlb2ZpbGwgdWZpbGwgdW5kZWYgdW5kZWZpbmVkIHVuZGVmaW5lZGZpbGVuYW1lIHVuZGVmaW5lcmVzb3VyY2UgdW5kZWZpbmVkcmVzdWx0IHVuZGVmaW5lZm9udCB1bmRlZmluZXJlc291cmNlIHVuZGVmaW5lZHJlc291cmNlIHVuZGVmaW5ldXNlcm9iamVjdCB1bm1hdGNoZWRtYXJrIHVucmVnaXN0ZXJlZCB1cGF0aCB1c2VyZGljdCBVc2VyT2JqZWN0cyB1c2VydGltZSB1c3Ryb2tlIHVzdHJva2VwYXRoIHZlcnNpb24gdmlld2NsaXAgdmlld2NsaXBwYXRoIFZNZXJyb3Igdm1yZWNsYWltIHZtc3RhdHVzIHdhaXQgd2NoZWNrIHdoZXJlIHdpZHRoc2hvdyB3cml0ZSB3cml0ZWhleHN0cmluZyB3cml0ZW9iamVjdCB3cml0ZXN0cmluZyB3dHJhbnNsYXRpb24geGNoZWNrIHhvciB4c2hvdyB4eXNob3cgeWllbGQgeXNob3cnO1xuLy8gY29uc3QgcXVvdGVzID0gYCjigKYpIDzigKY+IDx+4oCmfj5gO1xuY29uc3QgZW5jbG9zdXJlcyA9IGB74oCmfSBb4oCmXSA8POKApj4+ICjigKYpIDx+4oCmfj4gPOKApj5gO1xuY29uc3QgY29tbWVudHMgPSBgJeKAplxcbmA7XG5cbi8vLyBQQVRURVJOU1xuY29uc3QgQ09NTUVOVFMgPSAvJS87XG5jb25zdCBPUEVSQVRPUlMgPSAvXFwvXFwvfFxcL3w9ezEsMn0vO1xuY29uc3QgRU5DTE9TVVJFUyA9IC88PHw+Pnx7fH18XFxbfFxcXS87XG5jb25zdCBRVU9URVMgPSAvPH58fj58PHw+fFxcKHxcXCkvO1xuY29uc3QgV0hJVEVTUEFDRSA9IC9bXFxzXFxuXSsvOyAvLyAvW1xcMFxceDA5XFx4MEFcXHgwQ1xceDBEXFx4MjBdLztcblxuLy8gTlVNQkVSU1xuY29uc3QgREVDSU1BTCA9IC9bK1xcLV0/XFxkK1xcLj98WytcXC1dP1xcZCpcXC5cXGQrLztcbmNvbnN0IEVYUE9ORU5USUFMID0gL1xcZCtbZUVdXFwtP1xcZCt8XFxkK1xcLlxcZCtbZUVdXFwtP1xcZCsvO1xuY29uc3QgUkFESVggPSAvWzItOV0jXFxkK3wxXFxkI1tcXGRhLWpBLUpdK3wyXFxkI1tcXGRhLXRBLVRdK3wzWzAtNl1bXFxkYS16QS1aXSsvO1xuXG4vLyBOQU1FU1xuY29uc3QgTkFNRSA9IC9bXFxkYS16QS1aJEAuXFwtXSsvO1xuXG4vLyBTVFJJTkdTXG5jb25zdCBBU0NJSTE2ID0gLyg/OltcXGRhLWZBLUZdezJ9KSpbXFxkYS1mQS1GXXsxLDJ9LztcbmNvbnN0IEFTQ0lJODUgPSAvKD86WyEtdXpdezR9KSpbIS11el17MSw0fS87XG4vLyBjb25zdCBTVFJJTkcgPSAvXFwoKD86W15cXFxcXXxcXFxcLnxcXCgoPzpbXlxcXFxdfFxcXFwufC4pKj9cXClbXigpXStcXCkpXFwpL1xuLy8gY29uc3QgU1RSSU5HID0gL1xcKCg/OlteXFxcXF18XFxcXC58XFwoKD86W15cXFxcXXxcXFxcLnwuKSpcXClbXigpXStcXCkpXFwpL1xuLy8gY29uc3QgU1RSSU5HID0gL1xcKCg/OlteXFxcXF18XFxcXC58XFwoKD86W15cXFxcXSo/fFxcXFwuKSo/XFwpW14oKVxcXFxdKlxcKSkrP1xcKS9cbi8vIGNvbnN0IFNUUklORyA9IC9cXCgoPzpbXigpXSp8XFwoLio/XFwpW14oKV0qXFwpKSpcXCkvXG5cbmV4cG9ydCBjb25zdCBwb3N0c2NyaXB0ID0gT2JqZWN0LmRlZmluZVByb3BlcnRpZXMoXG4gICh7c3ltYm9scywgY2xvc3VyZXMsIHNlcXVlbmNlfSwge2FsaWFzZXMsIHN5bnRheH0gPSBkZWZhdWx0cykgPT4gKHtcbiAgICBzeW50YXgsXG4gICAga2V5d29yZHM6IFN5bWJvbHMuZnJvbShrZXl3b3JkcyksXG4gICAgcXVvdGVzOiBjbG9zdXJlcyhxdW90ZXMpLFxuICAgIGNsb3N1cmVzOiBjbG9zdXJlcyhlbmNsb3N1cmVzKSxcbiAgICBwYXR0ZXJuczoge1xuICAgICAgbWF5YmVJZGVudGlmaWVyOiBuZXcgUmVnRXhwKGBeJHtOQU1FLnNvdXJjZX0kYCksXG4gICAgfSxcbiAgICBtYXRjaGVyOiBzZXF1ZW5jZWAoJHtXSElURVNQQUNFfSl8KCR7YWxsKENPTU1FTlRTLCBPUEVSQVRPUlMsIEVOQ0xPU1VSRVMsIFFVT1RFUyl9KXwoJHthbGwoXG4gICAgICBERUNJTUFMLFxuICAgICAgRVhQT05FTlRJQUwsXG4gICAgICBSQURJWCxcbiAgICAgIE5BTUUsXG4gICAgKX0pYCxcbiAgICBtYXRjaGVyczoge1xuICAgICAgLy8gJygnOiAvKFxcXFw/XFxuKXwoXFxcXC58KD86W14oKV0rfFxcKC4qXFwpfCkpL1xuICAgIH0sXG4gIH0pLFxuICB7XG4gICAgZGVmYXVsdHM6IHtnZXQ6ICgpID0+ICh7Li4uZGVmYXVsdHN9KX0sXG4gIH0sXG4pO1xuXG4vLyAuLi4obW9kZXNbc3ludGF4XSA9IHtzeW50YXh9KSxcblxuLy8gLi4uKG1vZGVzLmh0bWwgPSB7c3ludGF4OiAnaHRtbCd9KSxcbi8vIGtleXdvcmRzOiBzeW1ib2xzKCdET0NUWVBFIGRvY3R5cGUnKSxcbi8vIGNvbW1lbnRzOiBjbG9zdXJlcygnPCEtLeKApi0tPicpLFxuLy8gcXVvdGVzOiBbXSxcbi8vIGNsb3N1cmVzOiBjbG9zdXJlcygnPCXigKYlPiA8IeKApj4gPOKApi8+IDwv4oCmPiA84oCmPicpLFxuLy8gcGF0dGVybnM6IHtcbi8vICAgLi4ucGF0dGVybnMsXG4vLyAgIGNsb3NlVGFnOiAvPFxcL1xcd1tePD57fV0qPz4vZyxcbi8vICAgbWF5YmVJZGVudGlmaWVyOiAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskLyxcbi8vIH0sXG4vLyBtYXRjaGVyOiBtYXRjaGVycy54bWwsXG4vLyBtYXRjaGVyczoge1xuLy8gICBxdW90ZTogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSl8XCJ8JykvZyxcbi8vICAgY29tbWVudDogLyhcXG4pfCgtLT4pL2csXG4vLyB9LFxuLy8gaWYgKGFsaWFzZXMpIGZvciAoY29uc3QgbW9kZSBvZiBwb3N0c2NyaXB0LmFsaWFzZXMpIG1vZGVzW2lkXSA9IG1vZGVzW3N5bnRheF07XG4iLCJpbXBvcnQge21hdGNoZXJzLCBtb2Rlc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcbmltcG9ydCB7cGF0dGVybnMsIGVudGl0aWVzfSBmcm9tICcuL21hcmt1cC1wYXR0ZXJucy5qcyc7XG5pbXBvcnQgKiBhcyBoZWxwZXJzIGZyb20gJy4vaGVscGVycy5qcyc7XG5pbXBvcnQgKiBhcyBleHRlbnNpb25zIGZyb20gJy4vZXh0ZW5zaW9ucy9tb2Rlcy5qcyc7XG5cbi8vLyBJTlRFUkZBQ0VcbmNvbnN0IGRlZmluaXRpb25zID0ge307XG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdTeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzIHx8IHt9KSA9PiB7XG4gIE9iamVjdC5hc3NpZ24obmV3U3ludGF4ZXMsIHN5bnRheGVzKTtcbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobmV3U3ludGF4ZXMsIGRlZmluaXRpb25zKTtcbiAgZGVmYXVsdHMuc3ludGF4ZXMgPT09IG5ld1N5bnRheGVzIHx8IChkZWZhdWx0cy5zeW50YXhlcyA9IG5ld1N5bnRheGVzKTtcbn07XG5cbmV4cG9ydCBjb25zdCBzeW50YXhlcyA9IHt9O1xuXG4vLy8gREVGSU5JVElPTlNcblN5bnRheGVzOiB7XG4gIGNvbnN0IHtDbG9zdXJlcywgU3ltYm9scywgc2VxdWVuY2UsIGFsbCwgcmF3fSA9IGhlbHBlcnM7XG5cbiAgQ1NTOiB7XG4gICAgY29uc3QgY3NzID0gKHN5bnRheGVzLmNzcyA9IHtcbiAgICAgIC4uLihtb2Rlcy5jc3MgPSB7c3ludGF4OiAnY3NzJ30pLFxuICAgICAgY29tbWVudHM6IENsb3N1cmVzLmZyb20oJy8q4oCmKi8nKSxcbiAgICAgIGNsb3N1cmVzOiBDbG9zdXJlcy5mcm9tKCd74oCmfSAo4oCmKSBb4oCmXScpLFxuICAgICAgcXVvdGVzOiBTeW1ib2xzLmZyb20oYCcgXCJgKSxcbiAgICAgIGFzc2lnbmVyczogU3ltYm9scy5mcm9tKGA6YCksXG4gICAgICBjb21iaW5hdG9yczogU3ltYm9scy5mcm9tKCc+IDo6ICsgOicpLFxuICAgICAgbm9uYnJlYWtlcnM6IFN5bWJvbHMuZnJvbShgLWApLFxuICAgICAgYnJlYWtlcnM6IFN5bWJvbHMuZnJvbSgnLCA7JyksXG4gICAgICBwYXR0ZXJuczogey4uLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXCp8XFwqXFwvfFxcKHxcXCl8XFxbfFxcXXxcInwnfFxce3xcXH18LHw7fFxcLnxcXGI6XFwvXFwvXFxifDo6XFxifDooPyFhY3RpdmV8YWZ0ZXJ8YW55fGFueS1saW5rfGJhY2tkcm9wfGJlZm9yZXxjaGVja2VkfGRlZmF1bHR8ZGVmaW5lZHxkaXJ8ZGlzYWJsZWR8ZW1wdHl8ZW5hYmxlZHxmaXJzdHxmaXJzdC1jaGlsZHxmaXJzdC1sZXR0ZXJ8Zmlyc3QtbGluZXxmaXJzdC1vZi10eXBlfGZvY3VzfGZvY3VzLXZpc2libGV8Zm9jdXMtd2l0aGlufGZ1bGxzY3JlZW58aG9zdHxob3Zlcnxpbi1yYW5nZXxpbmRldGVybWluYXRlfGludmFsaWR8bGFuZ3xsYXN0LWNoaWxkfGxhc3Qtb2YtdHlwZXxsZWZ0fGxpbmt8bWF0Y2hlc3xub3R8bnRoLWNoaWxkfG50aC1sYXN0LWNoaWxkfG50aC1sYXN0LW9mLXR5cGV8bnRoLW9mLXR5cGV8b25seS1jaGlsZHxvbmx5LW9mLXR5cGV8b3B0aW9uYWx8b3V0LW9mLXJhbmdlfHJlYWQtb25seXxyZXF1aXJlZHxyaWdodHxyb290fHNjb3BlfHRhcmdldHx2YWxpZHx2aXNpdGVkKSkvZyxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiBtYXRjaGVycy5lc2NhcGVzLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBIVE1MOiB7XG4gICAgY29uc3QgaHRtbCA9IChzeW50YXhlcy5odG1sID0ge1xuICAgICAgLi4uKG1vZGVzLmh0bWwgPSB7c3ludGF4OiAnaHRtbCd9KSxcbiAgICAgIGtleXdvcmRzOiBTeW1ib2xzLmZyb20oJ0RPQ1RZUEUgZG9jdHlwZScpLFxuICAgICAgY29tbWVudHM6IENsb3N1cmVzLmZyb20oJzwhLS3igKYtLT4nKSxcbiAgICAgIGNsb3N1cmVzOiBDbG9zdXJlcy5mcm9tKCc8JeKApiU+IDwh4oCmPiA84oCmLz4gPC/igKY+IDzigKY+JyksXG4gICAgICBxdW90ZXM6IFtdLFxuICAgICAgcGF0dGVybnM6IHtcbiAgICAgICAgLi4ucGF0dGVybnMsXG4gICAgICAgIGNsb3NlVGFnOiAvPFxcL1xcd1tePD57fV0qPz4vZyxcbiAgICAgICAgbWF5YmVJZGVudGlmaWVyOiAvXig/Oig/OlthLXpdW1xcLWEtel0qKT9bYS16XStcXDopPyg/OlthLXpdW1xcLWEtel0qKT9bYS16XSskLyxcbiAgICAgIH0sXG4gICAgICBtYXRjaGVyOiBtYXRjaGVycy54bWwsXG4gICAgICBtYXRjaGVyczoge1xuICAgICAgICBxdW90ZTogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSl8XCJ8JykvZyxcbiAgICAgICAgY29tbWVudDogLyhcXG4pfCgtLT4pL2csXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAge1xuICAgICAgY29uc3QgRE9DVEFHUyA9IFN5bWJvbHMuZnJvbSgnU0NSSVBUIFNUWUxFJyk7XG4gICAgICBjb25zdCBUQUcgPSAvXlthLXpdKyQvaTtcbiAgICAgIC8vIFRPRE86IENoZWNrIGlmIGN1c3RvbS9uYW1lc3BhY2UgdGFncyBldmVyIG5lZWQgc3BlY2lhbCBjbG9zZSBsb2dpY1xuICAgICAgLy8gY29uc3QgVEFHTElLRSA9IC9eKD86KD86W2Etel1bXFwtYS16XSopP1thLXpdK1xcOik/KD86W2Etel1bXFwtYS16XSopP1thLXpdKyQvaTtcblxuICAgICAgY29uc3QgSFRNTFRhZ0Nsb3N1cmUgPSBodG1sLmNsb3N1cmVzLmdldCgnPCcpO1xuXG4gICAgICBIVE1MVGFnQ2xvc3VyZS5jbG9zZSA9IChuZXh0LCBzdGF0ZSwgY29udGV4dCkgPT4ge1xuICAgICAgICBjb25zdCBwYXJlbnQgPSBuZXh0ICYmIG5leHQucGFyZW50O1xuICAgICAgICBjb25zdCBmaXJzdCA9IHBhcmVudCAmJiBwYXJlbnQubmV4dDtcbiAgICAgICAgY29uc3QgdGFnID0gZmlyc3QgJiYgZmlyc3QudGV4dCAmJiBUQUcudGVzdChmaXJzdC50ZXh0KSAmJiBmaXJzdC50ZXh0LnRvVXBwZXJDYXNlKCk7XG5cbiAgICAgICAgaWYgKHRhZyAmJiBET0NUQUdTLmluY2x1ZGVzKHRhZykpIHtcbiAgICAgICAgICAvLyBUT0RPOiBVbmNvbW1lbnQgb25jZSB0b2tlbiBidWZmZXJpbmcgaXMgaW1wbGVtZW50ZWRcbiAgICAgICAgICAvLyB0YWcgJiYgKGZpcnN0LnR5cGUgPSAna2V5d29yZCcpO1xuXG4gICAgICAgICAgbGV0IHtzb3VyY2UsIGluZGV4fSA9IHN0YXRlO1xuICAgICAgICAgIGNvbnN0ICQkbWF0Y2hlciA9IHN5bnRheGVzLmh0bWwucGF0dGVybnMuY2xvc2VUYWc7XG5cbiAgICAgICAgICBsZXQgbWF0Y2g7IC8vICA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgJCRtYXRjaGVyLmxhc3RJbmRleCA9IGluZGV4O1xuXG4gICAgICAgICAgLy8gVE9ETzogQ2hlY2sgaWYgYDxzY3JpcHQ+YOKApmA8L1NDUklQVD5gIGlzIHN0aWxsIHZhbGlkIVxuICAgICAgICAgIGNvbnN0ICQkY2xvc2VyID0gbmV3IFJlZ0V4cChyYXdgXjxcXC8oPzoke2ZpcnN0LnRleHQudG9Mb3dlckNhc2UoKX18JHt0YWd9KVxcYmApO1xuXG4gICAgICAgICAgbGV0IHN5bnRheCA9ICh0YWcgPT09ICdTVFlMRScgJiYgJ2NzcycpIHx8ICcnO1xuXG4gICAgICAgICAgaWYgKCFzeW50YXgpIHtcbiAgICAgICAgICAgIGNvbnN0IG9wZW5UYWcgPSBzb3VyY2Uuc2xpY2UocGFyZW50Lm9mZnNldCwgaW5kZXgpO1xuICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSAvXFxzdHlwZT0uKj9cXGIoLis/KVxcYi8uZXhlYyhvcGVuVGFnKTtcbiAgICAgICAgICAgIHN5bnRheCA9XG4gICAgICAgICAgICAgIHRhZyA9PT0gJ1NDUklQVCcgJiYgKCFtYXRjaCB8fCAhbWF0Y2hbMV0gfHwgL15tb2R1bGUkfGphdmFzY3JpcHQvaS50ZXN0KG1hdGNoWzFdKSlcbiAgICAgICAgICAgICAgICA/ICdlcydcbiAgICAgICAgICAgICAgICA6ICcnO1xuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe3N5bnRheCwgdGFnLCBtYXRjaCwgb3BlblRhZ30pO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHdoaWxlICgobWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpKSkge1xuICAgICAgICAgICAgaWYgKCQkY2xvc2VyLnRlc3QobWF0Y2hbMF0pKSB7XG4gICAgICAgICAgICAgIGlmIChzeW50YXgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge29mZnNldDogaW5kZXgsIGluZGV4OiBtYXRjaC5pbmRleCwgc3ludGF4fTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBpbmRleDtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gc291cmNlLnNsaWNlKG9mZnNldCwgbWF0Y2guaW5kZXggLSAxKTtcbiAgICAgICAgICAgICAgICBzdGF0ZS5pbmRleCA9IG1hdGNoLmluZGV4O1xuICAgICAgICAgICAgICAgIHJldHVybiBbe3RleHQsIG9mZnNldCwgcHJldmlvdXM6IG5leHQsIHBhcmVudH1dO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9O1xuICAgICAgSFRNTFRhZ0Nsb3N1cmUucXVvdGVzID0gU3ltYm9scy5mcm9tKGAnIFwiYCk7XG4gICAgICBIVE1MVGFnQ2xvc3VyZS5jbG9zZXIgPSAvXFwvPz4vO1xuXG4gICAgICAvLyBUT0RPOiBBbGxvdyBncm91cGluZy1sZXZlbCBwYXR0ZXJucyBmb3IgSFRNTCBhdHRyaWJ1dGVzIHZzIHRleHRcbiAgICAgIC8vIGh0bWwuY2xvc3VyZXNbJzwnXS5wYXR0ZXJucyA9IHsgbWF5YmVJZGVudGlmaWVyOiBUQUdMSUtFIH07XG4gICAgfVxuICB9XG5cbiAgTWFya2Rvd246IHtcbiAgICBjb25zdCBCTE9DSyA9ICdgYGDigKZgYGAgfn5+4oCmfn5+JztcbiAgICBjb25zdCBJTkxJTkUgPSAnW+KApl0gKOKApikgKuKApiogKirigKYqKiBf4oCmXyBfX+KApl9fIH7igKZ+IH5+4oCmfn4nO1xuICAgIC8qKlxuICAgICAqIFRPRE86IEFkZHJlc3MgdW5leHBlY3RlZCBjbG9zdXJlcyBpbiBwYXJzaW5nIGZyYWdtZW50ZXJcbiAgICAgKlxuICAgICAqIEFzIGZhciBhcyB0b2tlbml6YXRpb24gZ29lcywgdW5leHBlY3RlZCBjbG9zdXJlcyBhcmUgc3RpbGxcbiAgICAgKiBjbG9zdXJlcyBub25ldGhlbGVzcy4gVGhleSBhcmUgbm90IHNwYW5zLlxuICAgICAqL1xuICAgIGNvbnN0IFNQQU5TID0gJyc7IC8vIElOTElORVxuICAgIGNvbnN0IENMT1NVUkVTID0gU1BBTlMgPyBCTE9DSyA6IGAke0JMT0NLfSAke0lOTElORX1gO1xuXG4gICAgY29uc3QgaHRtbCA9IHN5bnRheGVzLmh0bWw7XG4gICAgY29uc3QgbWQgPSAoc3ludGF4ZXMubWQgPSB7XG4gICAgICAuLi4obW9kZXMubWFya2Rvd24gPSBtb2Rlcy5tZCA9IHtzeW50YXg6ICdtZCd9KSxcbiAgICAgIGNvbW1lbnRzOiBDbG9zdXJlcy5mcm9tKCc8IS0t4oCmLS0+JyksXG4gICAgICBxdW90ZXM6IFtdLFxuICAgICAgY2xvc3VyZXM6IENsb3N1cmVzLmZyb20oaHRtbC5jbG9zdXJlcywgQ0xPU1VSRVMpLFxuICAgICAgcGF0dGVybnM6IHsuLi5odG1sLnBhdHRlcm5zfSxcbiAgICAgIG1hdGNoZXI6IC8oXlxccyt8XFxuKXwoJiN4P1thLWYwLTldKzt8JlthLXpdKzt8KD86YGBgK3xcXH5cXH5cXH4rfC0tK3w9PSt8KD86XFwjezEsNn18XFwtfFxcYlxcZCtcXC58XFxiW2Etel1cXC58XFxiW2l2eF0rXFwuKSg/PVxccytcXFMrKSl8XCJ8J3w9fFxcLz58PCV8JT58PCEtLXwtLT58PFtcXC9cXCFdPyg/PVthLXpdK1xcOj9bYS16XFwtXSpbYS16XXxbYS16XSspfDx8PnxcXCh8XFwpfFxcW3xcXF18X18/fChbKn5gXSlcXDM/XFxifFxcYihbKn5gXSlcXDQ/KXxcXGJbXlxcblxcc1xcW1xcXVxcKFxcKVxcPFxcPiZdKlteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl9dXFxifFteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl0rKD89X18/XFxiKS9naW0sXG4gICAgICBzcGFuczogdW5kZWZpbmVkLFxuICAgICAgbWF0Y2hlcnM6IHtjb21tZW50OiAvKFxcbil8KC0tPikvZ30sXG4gICAgfSk7XG5cbiAgICBpZiAobWQuY2xvc3VyZXMpIHtcbiAgICAgIGNvbnN0IFNZTlRBWCA9IC9eXFx3KyQvO1xuXG4gICAgICBjb25zdCBwcmV2aW91c1RleHRGcm9tID0gKHRva2VuLCBtYXRjaGVyKSA9PiB7XG4gICAgICAgIGNvbnN0IHRleHQgPSBbXTtcbiAgICAgICAgaWYgKG1hdGNoZXIgIT0gbnVsbCkge1xuICAgICAgICAgIGlmIChtYXRjaGVyLnRlc3QpXG4gICAgICAgICAgICBkbyB0b2tlbi50ZXh0ICYmIHRleHQucHVzaCh0b2tlbi50ZXh0KSwgKHRva2VuID0gdG9rZW4ucHJldmlvdXMpO1xuICAgICAgICAgICAgd2hpbGUgKCF0b2tlbi50ZXh0IHx8ICFtYXRjaGVyLnRlc3QodG9rZW4udGV4dCkpO1xuICAgICAgICAgIGVsc2UgaWYgKG1hdGNoZXIuaW5jbHVkZXMpXG4gICAgICAgICAgICBkbyB0b2tlbi50ZXh0ICYmIHRleHQucHVzaCh0b2tlbi50ZXh0KSwgKHRva2VuID0gdG9rZW4ucHJldmlvdXMpO1xuICAgICAgICAgICAgd2hpbGUgKCF0b2tlbi50ZXh0IHx8ICFtYXRjaGVyLmluY2x1ZGVzKHRva2VuLnRleHQpKTtcbiAgICAgICAgICB0ZXh0Lmxlbmd0aCAmJiB0ZXh0LnJldmVyc2UoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdGV4dC5qb2luKCcnKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGluZGVudGVyID0gKGluZGVudGluZywgdGFicyA9IDIpID0+IHtcbiAgICAgICAgbGV0IHNvdXJjZSA9IGluZGVudGluZztcbiAgICAgICAgY29uc3QgaW5kZW50ID0gbmV3IFJlZ0V4cChyYXdgKD86XFx0fCR7JyAnLnJlcGVhdCh0YWJzKX0pYCwgJ2cnKTtcbiAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoL1xcXFw/KD89W1xcKFxcKVxcOlxcP1xcW1xcXV0pL2csICdcXFxcJyk7XG4gICAgICAgIHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKGluZGVudCwgaW5kZW50LnNvdXJjZSk7XG4gICAgICAgIHJldHVybiBuZXcgUmVnRXhwKGBeJHtzb3VyY2V9YCwgJ20nKTtcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IEVNQkVEREVEID0gdHJ1ZTtcbiAgICAgIHtcbiAgICAgICAgY29uc3Qgb3BlbiA9IChwYXJlbnQsIHN0YXRlLCBncm91cGVyKSA9PiB7XG4gICAgICAgICAgY29uc3Qge3NvdXJjZSwgaW5kZXg6IHN0YXJ0fSA9IHN0YXRlO1xuICAgICAgICAgIGNvbnN0IGZlbmNlID0gcGFyZW50LnRleHQ7XG4gICAgICAgICAgY29uc3QgZmVuY2luZyA9IHByZXZpb3VzVGV4dEZyb20ocGFyZW50LCAnXFxuJyk7XG4gICAgICAgICAgY29uc3QgaW5kZW50aW5nID0gZmVuY2luZy5zbGljZShmZW5jaW5nLmluZGV4T2YoJ1xcbicpICsgMSwgLWZlbmNlLmxlbmd0aCkgfHwgJyc7XG4gICAgICAgICAgbGV0IGVuZCA9IHNvdXJjZS5pbmRleE9mKGBcXG4ke2ZlbmNpbmd9YCwgc3RhcnQpO1xuICAgICAgICAgIGNvbnN0IElOREVOVCA9IGluZGVudGVyKGluZGVudGluZyk7XG4gICAgICAgICAgY29uc3QgQ0xPU0VSID0gbmV3IFJlZ0V4cChyYXdgXFxuJHtJTkRFTlQuc291cmNlLnNsaWNlKDEpfSR7ZmVuY2V9YCwgJ2cnKTtcblxuICAgICAgICAgIENMT1NFUi5sYXN0SW5kZXggPSBzdGFydDtcbiAgICAgICAgICBsZXQgY2xvc2VyTWF0Y2ggPSBDTE9TRVIuZXhlYyhzb3VyY2UpO1xuICAgICAgICAgIGlmIChjbG9zZXJNYXRjaCAmJiBjbG9zZXJNYXRjaC5pbmRleCA+PSBzdGFydCkge1xuICAgICAgICAgICAgZW5kID0gY2xvc2VyTWF0Y2guaW5kZXggKyAxO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjb25zdCBGRU5DRSA9IG5ldyBSZWdFeHAocmF3YFxcbj9bXFw+XFx8XFxzXSoke2ZlbmNlfWAsICdnJyk7XG4gICAgICAgICAgICBGRU5DRS5sYXN0SW5kZXggPSBzdGFydDtcbiAgICAgICAgICAgIGNvbnN0IGZlbmNlTWF0Y2ggPSBGRU5DRS5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgICBpZiAoZmVuY2VNYXRjaCAmJiBmZW5jZU1hdGNoLmluZGV4ID49IHN0YXJ0KSB7XG4gICAgICAgICAgICAgIGVuZCA9IGZlbmNlTWF0Y2guaW5kZXggKyAxO1xuICAgICAgICAgICAgfSBlbHNlIHJldHVybjtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAoZW5kID4gc3RhcnQpIHtcbiAgICAgICAgICAgIGxldCBvZmZzZXQgPSBzdGFydDtcbiAgICAgICAgICAgIGxldCB0ZXh0O1xuXG4gICAgICAgICAgICBjb25zdCBib2R5ID0gc291cmNlLnNsaWNlKHN0YXJ0LCBlbmQpIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgdG9rZW5zID0gW107XG4gICAgICAgICAgICB0b2tlbnMuZW5kID0gZW5kO1xuICAgICAgICAgICAgaWYgKCFFTUJFRERFRCkge1xuICAgICAgICAgICAgICB0ZXh0ID0gYm9keTtcbiAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGU6ICdjb2RlJywgb2Zmc2V0LCBwYXJlbnR9KTtcbiAgICAgICAgICAgICAgb2Zmc2V0ICs9IGJvZHkubGVuZ3RoO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgY29uc3QgW2hlYWQsIC4uLmxpbmVzXSA9IGJvZHkuc3BsaXQoLyhcXG4pL2cpO1xuICAgICAgICAgICAgICBpZiAoaGVhZCkge1xuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0OiBoZWFkLCB0eXBlOiAnY29tbWVudCcsIG9mZnNldCwgcGFyZW50fSksIChvZmZzZXQgKz0gaGVhZC5sZW5ndGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgICAgICAgICAgICAgIGNvbnN0IFtpbmRlbnRdID0gSU5ERU5ULmV4ZWMobGluZSkgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3QgaW5zZXQgPSAoaW5kZW50ICYmIGluZGVudC5sZW5ndGgpIHx8IDA7XG4gICAgICAgICAgICAgICAgaWYgKGluc2V0KSB7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHRleHQgb2YgaW5kZW50LnNwbGl0KC8oXFxzKykvZykpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHlwZSA9ICh0ZXh0LnRyaW0oKSAmJiAnc2VxdWVuY2UnKSB8fCAnd2hpdGVzcGFjZSc7XG4gICAgICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlLCBvZmZzZXQsIHBhcmVudH0pO1xuICAgICAgICAgICAgICAgICAgICBvZmZzZXQgKz0gdGV4dC5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB0ZXh0ID0gbGluZS5zbGljZShpbnNldCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgIHRleHQgPSBsaW5lO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dCwgdHlwZTogJ2NvZGUnLCBvZmZzZXQsIHBhcmVudH0pLCAob2Zmc2V0ICs9IHRleHQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coe2ZlbmNpbmcsIGJvZHksIHN0YXJ0LCBlbmQsIG9mZnNldCwgbGluZXMsIHRva2Vuc30pO1xuICAgICAgICAgICAgaWYgKHRva2Vucy5sZW5ndGgpIHJldHVybiB0b2tlbnM7XG4gICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IHF1b3RlcyA9IGh0bWwuY2xvc3VyZXMuZ2V0KCc8Jyk7XG4gICAgICAgIGZvciAoY29uc3Qgb3BlbmVyIG9mIFsnYGBgJywgJ35+fiddKSB7XG4gICAgICAgICAgY29uc3QgRmVuY2VDbG9zdXJlID0gbWQuY2xvc3VyZXMuZ2V0KG9wZW5lcik7XG4gICAgICAgICAgaWYgKEZlbmNlQ2xvc3VyZSkge1xuICAgICAgICAgICAgRmVuY2VDbG9zdXJlLm1hdGNoZXIgPSBuZXcgUmVnRXhwKFxuICAgICAgICAgICAgICByYXdgLyhcXHMqXFxuKXwoJHtvcGVuZXJ9KD89JHtvcGVuZXJ9XFxzfCR7b3BlbmVyfSQpfF4oPzpbXFxzPnxdKlxccyk/XFxzKil8LiokYCxcbiAgICAgICAgICAgICAgJ2dtJyxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBGZW5jZUNsb3N1cmUucXVvdGVzID0gcXVvdGVzO1xuICAgICAgICAgICAgRmVuY2VDbG9zdXJlLm9wZW4gPSBvcGVuO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIEVDTUFTY3JpcHQ6IHtcbiAgICBjb25zdCBSRUdFWFBTID0gL1xcLyg/PVteXFwqXFwvXFxuXVteXFxuXSpcXC8pKD86W15cXFxcXFwvXFxuXFx0XFxbXSt8XFxcXFxcU3xcXFsoPzpcXFxcXFxTfFteXFxcXFxcblxcdFxcXV0rKSs/XFxdKSs/XFwvW2Etel0qL2c7XG4gICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvfFxcL1xcKnxcXCpcXC98XFwvfF5cXCNcXCEuKlxcbi9nO1xuICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwifCcvZztcbiAgICBjb25zdCBDTE9TVVJFUyA9IC9cXHt8XFx9fFxcKHxcXCl8XFxbfFxcXS9nO1xuXG4gICAgY29uc3QgZXMgPSAoc3ludGF4ZXMuZXMgPSB7XG4gICAgICAuLi4obW9kZXMuamF2YXNjcmlwdCA9IG1vZGVzLmVzID0gbW9kZXMuanMgPSBtb2Rlcy5lY21hc2NyaXB0ID0ge3N5bnRheDogJ2VzJ30pLFxuICAgICAgY29tbWVudHM6IENsb3N1cmVzLmZyb20oJy8v4oCmXFxuIC8q4oCmKi8nKSxcbiAgICAgIHF1b3RlczogU3ltYm9scy5mcm9tKGAnIFwiIFxcYGApLFxuICAgICAgY2xvc3VyZXM6IENsb3N1cmVzLmZyb20oJ3vigKZ9ICjigKYpIFvigKZdJyksXG4gICAgICBzcGFuczogeydgJzogQ2xvc3VyZXMuZnJvbSgnJHvigKZ9Jyl9LFxuICAgICAga2V5d29yZHM6IFN5bWJvbHMuZnJvbShcbiAgICAgICAgLy8gYWJzdHJhY3QgZW51bSBpbnRlcmZhY2UgcGFja2FnZSAgbmFtZXNwYWNlIGRlY2xhcmUgdHlwZSBtb2R1bGVcbiAgICAgICAgJ2FyZ3VtZW50cyBhcyBhc3luYyBhd2FpdCBicmVhayBjYXNlIGNhdGNoIGNsYXNzIGNvbnN0IGNvbnRpbnVlIGRlYnVnZ2VyIGRlZmF1bHQgZGVsZXRlIGRvIGVsc2UgZXhwb3J0IGV4dGVuZHMgZmluYWxseSBmb3IgZnJvbSBmdW5jdGlvbiBnZXQgaWYgaW1wb3J0IGluIGluc3RhbmNlb2YgbGV0IG5ldyBvZiByZXR1cm4gc2V0IHN1cGVyIHN3aXRjaCB0aGlzIHRocm93IHRyeSB0eXBlb2YgdmFyIHZvaWQgd2hpbGUgd2l0aCB5aWVsZCcsXG4gICAgICApLFxuICAgICAgYXNzaWduZXJzOiBTeW1ib2xzLmZyb20oJz0gKz0gLT0gKj0gLz0gKio9ICU9IHw9IF49ICY9IDw8PSA+Pj0gPj4+PScpLFxuICAgICAgY29tYmluYXRvcnM6IFN5bWJvbHMuZnJvbShcbiAgICAgICAgJz49IDw9ID09ID09PSAhPSAhPT0gfHwgJiYgISAmIHwgPiA8ID0+ICUgKyAtICoqICogLyA+PiA8PCA+Pj4gPyA6JyxcbiAgICAgICksXG4gICAgICBub25icmVha2VyczogU3ltYm9scy5mcm9tKCcuJyksXG4gICAgICBvcGVyYXRvcnM6IFN5bWJvbHMuZnJvbSgnKysgLS0gISEgXiB+ICEgLi4uJyksXG4gICAgICBicmVha2VyczogU3ltYm9scy5mcm9tKCcsIDsnKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4ucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogc2VxdWVuY2VgKFtcXHNcXG5dKyl8KCR7YWxsKFxuICAgICAgICBSRUdFWFBTLFxuICAgICAgICByYXdgXFwvPWAsXG4gICAgICAgIENPTU1FTlRTLFxuICAgICAgICBRVU9URVMsXG4gICAgICAgIENMT1NVUkVTLFxuICAgICAgICAvLHw7fFxcLlxcLlxcLnxcXC58XFw6fFxcP3w9Pi8sXG4gICAgICAgIC8hPT18PT09fD09fD0vLFxuICAgICAgICAuLi5yYXdgXFwrIFxcLSBcXCogJiBcXHxgLnNwbGl0KCcgJykubWFwKHMgPT4gYCR7c30ke3N9fCR7c309fCR7c31gKSxcbiAgICAgICAgLi4ucmF3YCEgXFwqXFwqICUgPDwgPj4gPj4+IDwgPiBcXF4gfmAuc3BsaXQoJyAnKS5tYXAocyA9PiBgJHtzfT18JHtzfWApLFxuICAgICAgKX0pYCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98YHxcInwnfFxcJFxceykvZyxcbiAgICAgICAgLy8gcXVvdGU6IC8oXFxuKXwoYHxcInwnfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICAvLyBxdW90ZTogLyhcXG4pfChgfFwifCd8XFwkXFx7KXwoXFxcXC4pL2csXG4gICAgICAgIC8vIFwiJ1wiOiAvKFxcbil8KCcpfChcXFxcLikvZyxcbiAgICAgICAgLy8gJ1wiJzogLyhcXG4pfChcIil8KFxcXFwuKS9nLFxuICAgICAgICAvLyAnYCc6IC8oXFxuKXwoYHxcXCRcXHspfChcXFxcLikvZyxcbiAgICAgICAgY29tbWVudDogbWF0Y2hlcnMuY29tbWVudHMsXG4gICAgICB9LFxuICAgIH0pO1xuXG4gICAgRUNNQVNjcmlwdEV4dGVuc2lvbnM6IHtcbiAgICAgIC8vIGNvbnN0IEhBU0hCQU5HID0gL15cXCNcXCEuKlxcbi9nOyAvLyBbXl0gPT09ICg/Oi4qXFxuKVxuICAgICAgLy8gVE9ETzogVW5kbyAkIG1hdGNoaW5nIG9uY2UgZml4ZWRcbiAgICAgIGNvbnN0IFFVT1RFUyA9IC9gfFwiKD86W15cXFxcXCJdK3xcXFxcLikqKD86XCJ8JCl8Jyg/OlteXFxcXCddK3xcXFxcLikqKD86J3wkKS9nO1xuICAgICAgY29uc3QgQ09NTUVOVFMgPSAvXFwvXFwvLiooPzpcXG58JCl8XFwvXFwqW15dKj8oPzpcXCpcXC98JCl8XlxcI1xcIS4qXFxuL2c7IC8vIFteXSA9PT0gKD86LipcXG4pXG4gICAgICBjb25zdCBTVEFURU1FTlRTID0gYWxsKFFVT1RFUywgQ0xPU1VSRVMsIFJFR0VYUFMsIENPTU1FTlRTKTtcbiAgICAgIGNvbnN0IEJMT0NLTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgVE9QTEVWRUwgPSBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgQ0xPU1VSRSA9IHNlcXVlbmNlYChcXG4rKXwoJHtTVEFURU1FTlRTfSlgO1xuICAgICAgY29uc3QgRVNNID0gc2VxdWVuY2VgJHtUT1BMRVZFTH18XFxiZXhwb3J0XFxifFxcYmltcG9ydFxcYmA7XG4gICAgICBjb25zdCBDSlMgPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG4gICAgICBjb25zdCBFU1ggPSBzZXF1ZW5jZWAke0JMT0NLTEVWRUx9fFxcYmV4cG9ydHNcXGJ8XFxiaW1wb3J0XFxifFxcYm1vZHVsZS5leHBvcnRzXFxifFxcYnJlcXVpcmVcXGJgO1xuXG4gICAgICBjb25zdCB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9ID0gZXM7XG4gICAgICBjb25zdCBzeW50YXggPSB7cXVvdGVzLCBjbG9zdXJlcywgc3BhbnN9O1xuICAgICAgY29uc3QgbWF0Y2hlcnMgPSB7fTtcbiAgICAgICh7cXVvdGU6IG1hdGNoZXJzLnF1b3RlfSA9IGVzLm1hdGNoZXJzKTtcblxuICAgICAgY29uc3QgZXNtID0gKHN5bnRheGVzLmVzbSA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmVzbSA9IHtzeW50YXg6ICdlc20nfSksXG4gICAgICAgIGtleXdvcmRzOiBTeW1ib2xzLmZyb20oJ2ltcG9ydCBleHBvcnQgZGVmYXVsdCcpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTTSxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0xPU1VSRX0sXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IGNqcyA9IChzeW50YXhlcy5janMgPSB7XG4gICAgICAgIC4uLihtb2Rlcy5janMgPSB7c3ludGF4OiAnY2pzJ30pLFxuICAgICAgICBrZXl3b3JkczogU3ltYm9scy5mcm9tKCdpbXBvcnQgbW9kdWxlIGV4cG9ydHMgcmVxdWlyZScpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IENKUyxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogQ0pTfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgZXN4ID0gKHN5bnRheGVzLmVzeCA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmVzeCA9IHtzeW50YXg6ICdlc3gnfSksXG4gICAgICAgIGtleXdvcmRzOiBTeW1ib2xzLmZyb20oZXNtLmtleXdvcmRzLCBjanMua2V5d29yZHMpLFxuICAgICAgICAuLi5zeW50YXgsXG4gICAgICAgIG1hdGNoZXI6IEVTWCxcbiAgICAgICAgbWF0Y2hlcnM6IHsuLi5tYXRjaGVycywgY2xvc3VyZTogRVNYfSxcbiAgICAgIH0pO1xuICAgIH1cbiAgfVxufVxuXG4vLy8gRXh0ZW5zaW9uc1xue1xuICBmb3IgKGNvbnN0IG1vZGUgaW4gZXh0ZW5zaW9ucykge1xuICAgIC8qKlxuICAgICAqIEB0eXBlZGVmIHtQYXJ0aWFsPHR5cGVvZiBzeW50YXhlc1trZXlvZiBzeW50YXhlc10+fSBtb2RlXG4gICAgICogQHR5cGVkZWYge3R5cGVvZiBoZWxwZXJzfSBoZWxwZXJzXG4gICAgICogQHR5cGVkZWYge3thbGlhc2VzPzogc3RyaW5nW10sIHN5bnRheDogc3RyaW5nfX0gZGVmYXVsdHNcbiAgICAgKiBAdHlwZSB7KGhlbHBlcnM6IGhlbHBlcnMsIGRlZmF1bHRzOiBkZWZhdWx0cykgPT4gbW9kZX1cbiAgICAgKi9cbiAgICBjb25zdCBmYWN0b3J5ID0gZXh0ZW5zaW9uc1ttb2RlXTtcbiAgICBjb25zdCBkZWZhdWx0cyA9IHtzeW50YXg6IG1vZGUsIC4uLmZhY3RvcnkuZGVmYXVsdHN9O1xuICAgIGNvbnN0IHtzeW50YXgsIGFsaWFzZXN9ID0gZGVmYXVsdHM7XG5cbiAgICBkZWZpbml0aW9uc1tzeW50YXhdID0ge1xuICAgICAgZ2V0KCkge1xuICAgICAgICByZXR1cm4gKHRoaXNbc3ludGF4XSA9IGZhY3RvcnkoaGVscGVycywgZGVmYXVsdHMpKTtcbiAgICAgIH0sXG4gICAgICBzZXQodmFsdWUpIHtcbiAgICAgICAgUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBzeW50YXgsIHt2YWx1ZX0pO1xuICAgICAgfSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgfTtcblxuICAgIG1vZGVzW3N5bnRheF0gPSB7c3ludGF4fTtcblxuICAgIGlmIChhbGlhc2VzICYmIGFsaWFzZXMubGVuZ3RoKSB7XG4gICAgICBmb3IgKGNvbnN0IGFsaWFzIG9mIGFsaWFzZXMpIHtcbiAgICAgICAgbW9kZXNbYWxpYXNdID0gbW9kZXNbc3ludGF4XTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbi8vLyBCb290c3RyYXBcbmV4cG9ydCBjb25zdCByZWFkeSA9IChhc3luYyAoKSA9PiB7XG4gIGF3YWl0IGVudGl0aWVzLnJlYWR5O1xuICBzeW50YXhlcy5lcy5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXIgPSBoZWxwZXJzLmlkZW50aWZpZXIoXG4gICAgZW50aXRpZXMuZXMuSWRlbnRpZmllclN0YXJ0LFxuICAgIGVudGl0aWVzLmVzLklkZW50aWZpZXJQYXJ0LFxuICApO1xuICAvLyBzZXRUaW1lb3V0KCgpID0+IGNvbnNvbGUubG9nKCdTeW50YXhlczogJU8nLCBzeW50YXhlcyksIDEwMDApO1xuICAvLyBjb25zb2xlLmxvZyh7bWF5YmVJZGVudGlmaWVyOiBgJHtzeW50YXhlcy5lcy5wYXR0ZXJucy5tYXliZUlkZW50aWZpZXJ9YH0pO1xufSkoKTtcbiIsImNvbnN0IHthc3NpZ24sIGRlZmluZVByb3BlcnR5fSA9IE9iamVjdDtcblxuZXhwb3J0IGNvbnN0IGRvY3VtZW50ID0gdm9pZCBudWxsO1xuXG5leHBvcnQgY2xhc3MgTm9kZSB7XG4gIGdldCBjaGlsZHJlbigpIHtcbiAgICByZXR1cm4gZGVmaW5lUHJvcGVydHkodGhpcywgJ2NoaWxkcmVuJywge3ZhbHVlOiBuZXcgU2V0KCl9KS5jaGlsZHJlbjtcbiAgfVxuICBnZXQgY2hpbGRFbGVtZW50Q291bnQoKSB7XG4gICAgcmV0dXJuICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSkgfHwgMDtcbiAgfVxuICBnZXQgdGV4dENvbnRlbnQoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgICh0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJiBbLi4udGhpcy5jaGlsZHJlbl0uam9pbignJykpIHx8ICcnXG4gICAgKTtcbiAgfVxuICBzZXQgdGV4dENvbnRlbnQodGV4dCkge1xuICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplICYmIHRoaXMuY2hpbGRyZW4uY2xlYXIoKTtcbiAgICB0ZXh0ICYmIHRoaXMuY2hpbGRyZW4uYWRkKG5ldyBTdHJpbmcodGV4dCkpO1xuICB9XG4gIGFwcGVuZENoaWxkKGVsZW1lbnQpIHtcbiAgICByZXR1cm4gZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmFkZChlbGVtZW50KSwgZWxlbWVudDtcbiAgfVxuICBhcHBlbmQoLi4uZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoKSBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGVsZW1lbnQgJiYgdGhpcy5jaGlsZHJlbi5hZGQoZWxlbWVudCk7XG4gIH1cbiAgcmVtb3ZlQ2hpbGQoZWxlbWVudCkge1xuICAgIGVsZW1lbnQgJiZcbiAgICAgIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiZcbiAgICAgIHRoaXMuY2hpbGRyZW4uc2l6ZSAmJlxuICAgICAgdGhpcy5jaGlsZHJlbi5kZWxldGUoZWxlbWVudCk7XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH1cbiAgcmVtb3ZlKC4uLmVsZW1lbnRzKSB7XG4gICAgaWYgKGVsZW1lbnRzLmxlbmd0aCAmJiB0aGlzLmhhc093blByb3BlcnR5KCdjaGlsZHJlbicpICYmIHRoaXMuY2hpbGRyZW4uc2l6ZSlcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmRlbGV0ZShlbGVtZW50KTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgRWxlbWVudCBleHRlbmRzIE5vZGUge1xuICBnZXQgaW5uZXJIVE1MKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHNldCBpbm5lckhUTUwodGV4dCkge1xuICAgIHRoaXMudGV4dENvbnRlbnQgPSB0ZXh0O1xuICB9XG4gIGdldCBvdXRlckhUTUwoKSB7XG4gICAgY29uc3Qge2NsYXNzTmFtZSwgdGFnLCBpbm5lckhUTUx9ID0gdGhpcztcbiAgICByZXR1cm4gYDwke3RhZ30keyhjbGFzc05hbWUgJiYgYCBjbGFzcz1cIiR7Y2xhc3NOYW1lfVwiYCkgfHwgJyd9PiR7aW5uZXJIVE1MIHx8ICcnfTwvJHt0YWd9PmA7XG4gIH1cbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMub3V0ZXJIVE1MO1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gdGhpcy50b1N0cmluZygpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEb2N1bWVudEZyYWdtZW50IGV4dGVuZHMgTm9kZSB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiB0aGlzLnRleHRDb250ZW50O1xuICB9XG4gIHRvSlNPTigpIHtcbiAgICByZXR1cm4gKHRoaXMuY2hpbGRFbGVtZW50Q291bnQgJiYgWy4uLnRoaXMuY2hpbGRyZW5dKSB8fCBbXTtcbiAgfVxuICBbU3ltYm9sLml0ZXJhdG9yXSgpIHtcbiAgICByZXR1cm4gKCh0aGlzLmNoaWxkRWxlbWVudENvdW50ICYmIHRoaXMuY2hpbGRyZW4pIHx8ICcnKVtTeW1ib2wuaXRlcmF0b3JdKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIFRleHQgZXh0ZW5kcyBTdHJpbmcge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gZW5jb2RlRW50aXRpZXMoc3VwZXIudG9TdHJpbmcoKSk7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZUVsZW1lbnQgPSAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICBjb25zdCBlbGVtZW50ID0gYXNzaWduKG5ldyBFbGVtZW50KCksIHtcbiAgICB0YWcsXG4gICAgY2xhc3NOYW1lOiAocHJvcGVydGllcyAmJiBwcm9wZXJ0aWVzLmNsYXNzTmFtZSkgfHwgJycsXG4gICAgcHJvcGVydGllcyxcbiAgfSk7XG4gIGNoaWxkcmVuLmxlbmd0aCAmJiBkZWZpbmVQcm9wZXJ0eShlbGVtZW50LCAnY2hpbGRyZW4nLCB7dmFsdWU6IG5ldyBTZXQoY2hpbGRyZW4pfSk7XG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRleHQgPSAoY29udGVudCA9ICcnKSA9PiBuZXcgVGV4dChjb250ZW50KTtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdHkgPSBlbnRpdHkgPT4gYCYjJHtlbnRpdHkuY2hhckNvZGVBdCgwKX07YDtcbmV4cG9ydCBjb25zdCBlbmNvZGVFbnRpdGllcyA9IHN0cmluZyA9PiBzdHJpbmcucmVwbGFjZSgvW1xcdTAwQTAtXFx1OTk5OTw+XFwmXS9naW0sIGVuY29kZUVudGl0eSk7XG5leHBvcnQgY29uc3QgY3JlYXRlRnJhZ21lbnQgPSAoKSA9PiBuZXcgRG9jdW1lbnRGcmFnbWVudCgpO1xuIiwiZXhwb3J0IGNvbnN0IHtkb2N1bWVudCwgRWxlbWVudCwgTm9kZSwgVGV4dCwgRG9jdW1lbnRGcmFnbWVudH0gPVxuICAnb2JqZWN0JyA9PT0gdHlwZW9mIHNlbGYgJiYgKHNlbGYgfHwgMCkud2luZG93ID09PSBzZWxmICYmIHNlbGY7XG5cbmV4cG9ydCBjb25zdCB7Y3JlYXRlRWxlbWVudCwgY3JlYXRlVGV4dCwgY3JlYXRlRnJhZ21lbnR9ID0ge1xuICBjcmVhdGVFbGVtZW50OiAodGFnLCBwcm9wZXJ0aWVzLCAuLi5jaGlsZHJlbikgPT4ge1xuICAgIGNvbnN0IGVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZyk7XG4gICAgcHJvcGVydGllcyAmJiBPYmplY3QuYXNzaWduKGVsZW1lbnQsIHByb3BlcnRpZXMpO1xuICAgIGlmICghY2hpbGRyZW4ubGVuZ3RoKSByZXR1cm4gZWxlbWVudDtcbiAgICBpZiAoZWxlbWVudC5hcHBlbmQpIHtcbiAgICAgIHdoaWxlIChjaGlsZHJlbi5sZW5ndGggPiA1MDApIGVsZW1lbnQuYXBwZW5kKC4uLmNoaWxkcmVuLnNwbGljZSgwLCA1MDApKTtcbiAgICAgIGNoaWxkcmVuLmxlbmd0aCAmJiBlbGVtZW50LmFwcGVuZCguLi5jaGlsZHJlbik7XG4gICAgfSBlbHNlIGlmIChlbGVtZW50LmFwcGVuZENoaWxkKSB7XG4gICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGNoaWxkcmVuKSBlbGVtZW50LmFwcGVuZENoaWxkKGNoaWxkKTtcbiAgICB9XG4gICAgcmV0dXJuIGVsZW1lbnQ7XG4gIH0sXG5cbiAgY3JlYXRlVGV4dDogKGNvbnRlbnQgPSAnJykgPT4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUoY29udGVudCksXG5cbiAgY3JlYXRlRnJhZ21lbnQ6ICgpID0+IGRvY3VtZW50LmNyZWF0ZURvY3VtZW50RnJhZ21lbnQoKSxcbn07XG4iLCJpbXBvcnQgKiBhcyBwc2V1ZG8gZnJvbSAnLi9saWIvcHNldWRvLmpzJztcbmltcG9ydCAqIGFzIGRvbSBmcm9tICcuL2xpYi9uYXRpdmUuanMnO1xuXG4vLyBURVNUOiBUcmFjZSBmb3IgRVNNIHRlc3RpbmdcbnR5cGVvZiBwcm9jZXNzID09PSAnb2JqZWN0JyAmJiBjb25zb2xlLmluZm8oJ1tFU01dOiAlbycsIGltcG9ydC5tZXRhLnVybCk7XG5cbmV4cG9ydCBjb25zdCBuYXRpdmUgPSBkb20uZG9jdW1lbnQgJiYgZG9tO1xuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSBuYXRpdmUgfHwgcHNldWRvO1xuZXhwb3J0IHtwc2V1ZG99O1xuIiwiaW1wb3J0ICogYXMgZG9tIGZyb20gJy4uL3BhY2thZ2VzL3BzZXVkb20vcHNldWRvbS5qcyc7XG5cbi8vLyBPUFRJT05TXG4vKiogVGhlIHRhZyBuYW1lIG9mIHRoZSBlbGVtZW50IHRvIHVzZSBmb3IgcmVuZGVyaW5nIGEgdG9rZW4uICovXG5jb25zdCBTUEFOID0gJ3NwYW4nO1xuXG4vKiogVGhlIGNsYXNzIG5hbWUgb2YgdGhlIGVsZW1lbnQgdG8gdXNlIGZvciByZW5kZXJpbmcgYSB0b2tlbi4gKi9cbmNvbnN0IENMQVNTID0gJ21hcmt1cCc7XG5cbi8qKlxuICogSW50ZW5kZWQgdG8gcHJldmVudCB1bnByZWRpY3RhYmxlIERPTSByZWxhdGVkIG92ZXJoZWFkIGJ5IHJlbmRlcmluZyBlbGVtZW50c1xuICogdXNpbmcgbGlnaHR3ZWlnaHQgcHJveHkgb2JqZWN0cyB0aGF0IGNhbiBiZSBzZXJpYWxpemVkIGludG8gSFRNTCB0ZXh0LlxuICovXG5jb25zdCBIVE1MX01PREUgPSB0cnVlO1xuLy8vIElOVEVSRkFDRVxuXG5leHBvcnQgY29uc3QgcmVuZGVyZXJzID0ge307XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zLCB0b2tlblJlbmRlcmVycyA9IHJlbmRlcmVycykge1xuICBmb3IgYXdhaXQgKGNvbnN0IHRva2VuIG9mIHRva2Vucykge1xuICAgIGNvbnN0IHt0eXBlID0gJ3RleHQnLCB0ZXh0LCBwdW5jdHVhdG9yLCBicmVha3N9ID0gdG9rZW47XG4gICAgY29uc3QgdG9rZW5SZW5kZXJlciA9XG4gICAgICAocHVuY3R1YXRvciAmJiAodG9rZW5SZW5kZXJlcnNbcHVuY3R1YXRvcl0gfHwgdG9rZW5SZW5kZXJlcnMub3BlcmF0b3IpKSB8fFxuICAgICAgKHR5cGUgJiYgdG9rZW5SZW5kZXJlcnNbdHlwZV0pIHx8XG4gICAgICAodGV4dCAmJiB0b2tlblJlbmRlcmVycy50ZXh0KTtcbiAgICBjb25zdCBlbGVtZW50ID0gdG9rZW5SZW5kZXJlciAmJiB0b2tlblJlbmRlcmVyKHRleHQsIHRva2VuKTtcbiAgICBlbGVtZW50ICYmICh5aWVsZCBlbGVtZW50KTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgaW5zdGFsbCA9IChkZWZhdWx0cywgbmV3UmVuZGVyZXJzID0gZGVmYXVsdHMucmVuZGVyZXJzIHx8IHt9KSA9PiB7XG4gIE9iamVjdC5hc3NpZ24obmV3UmVuZGVyZXJzLCByZW5kZXJlcnMpO1xuICBkZWZhdWx0cy5yZW5kZXJlcnMgPT09IG5ld1JlbmRlcmVycyB8fCAoZGVmYXVsdHMucmVuZGVyZXJzID0gbmV3UmVuZGVyZXJzKTtcbiAgZGVmYXVsdHMucmVuZGVyZXIgPSByZW5kZXJlcjtcbn07XG5cbmV4cG9ydCBjb25zdCBzdXBwb3J0ZWQgPSAhIWRvbS5uYXRpdmU7XG5leHBvcnQgY29uc3QgbmF0aXZlID0gIUhUTUxfTU9ERSAmJiBzdXBwb3J0ZWQ7XG5jb25zdCBpbXBsZW1lbnRhdGlvbiA9IG5hdGl2ZSA/IGRvbS5uYXRpdmUgOiBkb20ucHNldWRvO1xuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSBpbXBsZW1lbnRhdGlvbjtcblxuLy8vIElNUExFTUVOVEFUSU9OXG5jb25zdCBmYWN0b3J5ID0gKHRhZywgcHJvcGVydGllcykgPT4gKGNvbnRlbnQsIHRva2VuKSA9PiB7XG4gIGlmICghY29udGVudCkgcmV0dXJuO1xuICB0eXBlb2YgY29udGVudCAhPT0gJ3N0cmluZycgfHwgKGNvbnRlbnQgPSBjcmVhdGVUZXh0KGNvbnRlbnQpKTtcbiAgY29uc3QgZWxlbWVudCA9IGNyZWF0ZUVsZW1lbnQodGFnLCBwcm9wZXJ0aWVzLCBjb250ZW50KTtcblxuICBlbGVtZW50ICYmIHRva2VuICYmICh0b2tlbi5oaW50ICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgICR7dG9rZW4uaGludH1gKSk7XG4gIC8vIHRva2VuLmJyZWFrcyAmJiAoZWxlbWVudC5icmVha3MgPSB0b2tlbi5icmVha3MpLFxuICAvLyB0b2tlbiAmJlxuICAvLyAodG9rZW4uZm9ybSAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCBtYXliZS0ke3Rva2VuLmZvcm19YCksXG4gIC8vIHRva2VuLmhpbnQgJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgJHt0b2tlbi5oaW50fWApLFxuICAvLyBlbGVtZW50ICYmIChlbGVtZW50LnRva2VuID0gdG9rZW4pKTtcblxuICByZXR1cm4gZWxlbWVudDtcbn07XG5cbk9iamVjdC5hc3NpZ24ocmVuZGVyZXJzLCB7XG4gIC8vIHdoaXRlc3BhY2U6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHdoaXRlc3BhY2VgfSksXG4gIHdoaXRlc3BhY2U6IGNyZWF0ZVRleHQsXG4gIHRleHQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogQ0xBU1N9KSxcblxuICB2YXJpYWJsZTogZmFjdG9yeSgndmFyJywge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHZhcmlhYmxlYH0pLFxuICBrZXl3b3JkOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBrZXl3b3JkYH0pLFxuICBpZGVudGlmaWVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBpZGVudGlmaWVyYH0pLFxuICBvcGVyYXRvcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvcmB9KSxcbiAgYXNzaWduZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlcmF0b3IgYXNzaWduZXJgfSksXG4gIGNvbWJpbmF0b3I6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igb3BlcmF0b3IgY29tYmluYXRvcmB9KSxcbiAgcHVuY3R1YXRpb246IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgcHVuY3R1YXRpb25gfSksXG4gIHF1b3RlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIHF1b3RlYH0pLFxuICBicmVha2VyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIGJyZWFrZXJgfSksXG4gIG9wZW5lcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVuZXJgfSksXG4gIGNsb3NlcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBjbG9zZXJgfSksXG4gIHNwYW46IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3Igc3BhbmB9KSxcbiAgc2VxdWVuY2U6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHNlcXVlbmNlYH0pLFxuICBsaXRlcmFsOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBsaXRlcmFsYH0pLFxuICBpbmRlbnQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHNlcXVlbmNlIGluZGVudGB9KSxcbiAgY29tbWVudDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gY29tbWVudGB9KSxcbiAgY29kZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU31gfSksXG59KTtcbiIsImltcG9ydCAqIGFzIG1vZGVzIGZyb20gJy4vbWFya3VwLW1vZGVzLmpzJztcbmltcG9ydCAqIGFzIGRvbSBmcm9tICcuL21hcmt1cC1kb20uanMnO1xuaW1wb3J0ICogYXMgcGFyc2VyIGZyb20gJy4vbWFya3VwLXBhcnNlci5qcyc7XG5cbmV4cG9ydCBsZXQgaW5pdGlhbGl6ZWQ7XG5cbmV4cG9ydCBjb25zdCByZWFkeSA9IChhc3luYyAoKSA9PiB2b2lkIChhd2FpdCBtb2Rlcy5yZWFkeSkpKCk7XG5cbmV4cG9ydCBjb25zdCB2ZXJzaW9ucyA9IFtwYXJzZXJdO1xuXG4vLyBjb25zdCB2ZXJzaW9ucyA9IFtwYXJzZXIsIHBhcnNlcjJdO1xuXG5jb25zdCBpbml0aWFsaXplID0gKCkgPT5cbiAgaW5pdGlhbGl6ZWQgfHxcbiAgKGluaXRpYWxpemVkID0gYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHtjcmVhdGVGcmFnbWVudCwgc3VwcG9ydGVkfSA9IGRvbTtcblxuICAgIC8qKlxuICAgICAqIFRlbXBvcmFyeSB0ZW1wbGF0ZSBlbGVtZW50IGZvciByZW5kZXJpbmdcbiAgICAgKiBAdHlwZSB7SFRNTFRlbXBsYXRlRWxlbWVudD99XG4gICAgICovXG4gICAgY29uc3QgdGVtcGxhdGUgPVxuICAgICAgc3VwcG9ydGVkICYmXG4gICAgICAodGVtcGxhdGUgPT5cbiAgICAgICAgJ0hUTUxUZW1wbGF0ZUVsZW1lbnQnID09PSAodGVtcGxhdGUgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IgJiYgdGVtcGxhdGUuY29uc3RydWN0b3IubmFtZSkgJiYgdGVtcGxhdGUpKFxuICAgICAgICBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpLFxuICAgICAgKTtcblxuICAgIC8vLyBBUElcbiAgICBjb25zdCBzeW50YXhlcyA9IHt9O1xuICAgIGNvbnN0IHJlbmRlcmVycyA9IHt9O1xuICAgIGNvbnN0IGRlZmF1bHRzID0gey4uLnBhcnNlci5kZWZhdWx0c307XG5cbiAgICBhd2FpdCByZWFkeTtcbiAgICAvLy8gRGVmYXVsdHNcbiAgICBtb2Rlcy5pbnN0YWxsKGRlZmF1bHRzLCBzeW50YXhlcyk7XG4gICAgZG9tLmluc3RhbGwoZGVmYXVsdHMsIHJlbmRlcmVycyk7XG5cbiAgICBsZXQgbGFzdFZlcnNpb247XG4gICAgdG9rZW5pemUgPSAoc291cmNlLCBvcHRpb25zID0ge30pID0+IHtcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBvcHRpb25zLnZlcnNpb24gPiAxID8gdmVyc2lvbnNbb3B0aW9ucy52ZXJzaW9uIC0gMV0gOiB2ZXJzaW9uc1swXTtcbiAgICAgIG9wdGlvbnMudG9rZW5pemUgPSAodmVyc2lvbiB8fCBwYXJzZXIpLnRva2VuaXplO1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIHZlcnNpb24udG9rZW5pemUoc291cmNlLCB7b3B0aW9uc30sIGRlZmF1bHRzKTtcbiAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICF2ZXJzaW9uIHx8IGxhc3RWZXJzaW9uID09PSAobGFzdFZlcnNpb24gPSB2ZXJzaW9uKSB8fCBjb25zb2xlLmxvZyh7dmVyc2lvbn0pO1xuICAgICAgfVxuICAgIH07XG5cbiAgICByZW5kZXIgPSBhc3luYyAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gICAgICBjb25zdCBmcmFnbWVudCA9IG9wdGlvbnMuZnJhZ21lbnQgfHwgY3JlYXRlRnJhZ21lbnQoKTtcblxuICAgICAgY29uc3QgZWxlbWVudHMgPSBwYXJzZXIucmVuZGVyKHNvdXJjZSwgb3B0aW9ucywgZGVmYXVsdHMpO1xuICAgICAgbGV0IGZpcnN0ID0gYXdhaXQgZWxlbWVudHMubmV4dCgpO1xuXG4gICAgICBsZXQgbG9ncyA9IChmcmFnbWVudC5sb2dzID0gW10pO1xuXG4gICAgICBpZiAoZmlyc3QgJiYgJ3ZhbHVlJyBpbiBmaXJzdCkge1xuICAgICAgICBpZiAoIWRvbS5uYXRpdmUgJiYgdGVtcGxhdGUgJiYgJ3RleHRDb250ZW50JyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiB0ZW1wbGF0ZWApO1xuICAgICAgICAgIGNvbnN0IGJvZHkgPSBbZmlyc3QudmFsdWVdO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5qb2luKCcnKTtcbiAgICAgICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KTtcblxuICAgICAgICAgIC8vIGlmICghZmlyc3QuZG9uZSkge1xuICAgICAgICAgIC8vICAgaWYgKHR5cGVvZiByZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAvLyAgICAgLy8gICYmIGZpcnN0LnZhbHVlLnRva2VuXG4gICAgICAgICAgLy8gICAgIGxldCBsaW5lcyA9IDA7XG4gICAgICAgICAgLy8gICAgIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykge1xuICAgICAgICAgIC8vICAgICAgIC8vIGVsZW1lbnQudG9rZW4gJiZcbiAgICAgICAgICAvLyAgICAgICAvLyAgIGVsZW1lbnQudG9rZW4uYnJlYWtzID4gMCAmJlxuICAgICAgICAgIC8vICAgICAgIC8vICAgKGxpbmVzICs9IGVsZW1lbnQudG9rZW4uYnJlYWtzKSAlIDIgPT09IDAgJiZcbiAgICAgICAgICAvLyAgICAgICBsaW5lcysrICUgMTAgPT09IDAgJiZcbiAgICAgICAgICAvLyAgICAgICAgICgodGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5zcGxpY2UoMCwgYm9keS5sZW5ndGgpLmpvaW4oJycpKSxcbiAgICAgICAgICAvLyAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpKTtcbiAgICAgICAgICAvLyAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyID0+IHNldFRpbWVvdXQociwgMTAwMCkpXG4gICAgICAgICAgLy8gICAgICAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVxdWVzdEFuaW1hdGlvbkZyYW1lKVxuICAgICAgICAgIC8vICAgICAgIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAvLyAgICAgfVxuICAgICAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyAgICAgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBib2R5LnB1c2goZWxlbWVudCk7XG4gICAgICAgICAgLy8gICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGJvZHkuam9pbignJyk7IC8vIHRleHRcbiAgICAgICAgICAvLyAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCk7XG4gICAgICAgICAgLy8gICB9XG4gICAgICAgICAgLy8gfVxuICAgICAgICB9IGVsc2UgaWYgKCdwdXNoJyBpbiBmcmFnbWVudCkge1xuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICdwdXNoJyBpbiBmcmFnbWVudGApO1xuICAgICAgICAgIGZyYWdtZW50LnB1c2goZmlyc3QudmFsdWUpO1xuICAgICAgICAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBmcmFnbWVudC5wdXNoKGVsZW1lbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKCdhcHBlbmQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgLy8gICYmIGZpcnN0LnZhbHVlLm5vZGVUeXBlID49IDFcbiAgICAgICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAnYXBwZW5kJyBpbiBmcmFnbWVudGApO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZChmaXJzdC52YWx1ZSk7XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGZyYWdtZW50LmFwcGVuZChlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgICAvLyBlbHNlIGlmICgndGV4dENvbnRlbnQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgIC8vICAgbGV0IHRleHQgPSBgJHtmaXJzdC52YWx1ZX1gO1xuICAgICAgICAvLyAgIGlmICghZmlyc3QuZG9uZSkgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB0ZXh0ICs9IGAke2VsZW1lbnR9YDtcbiAgICAgICAgLy8gICBpZiAodGVtcGxhdGUpIHtcbiAgICAgICAgLy8gICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiB0ZW1wbGF0ZWApO1xuICAgICAgICAvLyAgIH0gZWxzZSB7XG4gICAgICAgIC8vICAgICBsb2dzLnB1c2goYHJlbmRlciBtZXRob2QgPSAndGV4dCcgaW4gZnJhZ21lbnRgKTtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IEZpbmQgYSB3b3JrYXJvdW5kIGZvciBEb2N1bWVudEZyYWdtZW50LmlubmVySFRNTFxuICAgICAgICAvLyAgICAgZnJhZ21lbnQuaW5uZXJIVE1MID0gdGV4dDtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGZyYWdtZW50O1xuICAgIH07XG5cbiAgICBpbml0aWFsaXplZCA9IHRydWU7XG5cbiAgICByZXR1cm4gbWFya3VwO1xuICB9KSgpO1xuXG5leHBvcnQgbGV0IHJlbmRlciA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgYXdhaXQgaW5pdGlhbGl6ZSgpO1xuICByZXR1cm4gYXdhaXQgcmVuZGVyKHNvdXJjZSwgb3B0aW9ucyk7XG59O1xuXG5leHBvcnQgbGV0IHRva2VuaXplID0gKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBpZiAoIWluaXRpYWxpemVkKSB0aHJvdyBFcnJvcihgTWFya3VwOiB0b2tlbml6ZSjigKYpIGNhbGxlZCBiZWZvcmUgaW5pdGlhbGl6YXRpb24uICR7TWVzc2FnZXMuSW5pdGlhbGl6ZUZpcnN0fWApO1xuICBlbHNlIGlmIChpbml0aWFsaXplZC50aGVuKSBFcnJvcihgTWFya3VwOiB0b2tlbml6ZSjigKYpIGNhbGxlZCBkdXJpbmcgaW5pdGlhbGl6YXRpb24uICR7TWVzc2FnZXMuSW5pdGlhbGl6ZUZpcnN0fWApO1xuICByZXR1cm4gbWFya3VwLnRva2VuaXplKHNvdXJjZSwgb3B0aW9ucyk7XG59O1xuXG5jb25zdCBrZXlGcm9tID0gb3B0aW9ucyA9PiAob3B0aW9ucyAmJiBKU09OLnN0cmluZ2lmeShvcHRpb25zKSkgfHwgJyc7XG5jb25zdCBza2ltID0gaXRlcmFibGUgPT4ge1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlcmFibGUpO1xufTtcblxuZXhwb3J0IGNvbnN0IHdhcm11cCA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgY29uc3Qga2V5ID0gKG9wdGlvbnMgJiYga2V5RnJvbShvcHRpb25zKSkgfHwgJyc7XG4gIGxldCBjYWNoZSA9ICh3YXJtdXAuY2FjaGUgfHwgKHdhcm11cC5jYWNoZSA9IG5ldyBNYXAoKSkpLmdldChrZXkpO1xuICBjYWNoZSB8fCB3YXJtdXAuY2FjaGUuc2V0KGtleSwgKGNhY2hlID0gbmV3IFNldCgpKSk7XG4gIGF3YWl0IChpbml0aWFsaXplZCB8fCBpbml0aWFsaXplKCkpO1xuICAvLyBsZXQgdG9rZW5zO1xuICBjYWNoZS5oYXMoc291cmNlKSB8fCAoc2tpbSh0b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpKSwgY2FjaGUuYWRkKHNvdXJjZSkpO1xuICAvLyBjYWNoZS5oYXMoc291cmNlKSB8fCAoKHRva2VucyA9PiB7IHdoaWxlICghdG9rZW5zLm5leHQoKS5kb25lKTsgfSkodG9rZW5pemUoc291cmNlLCBvcHRpb25zKSksIGNhY2hlLmFkZChzb3VyY2UpKTtcbiAgcmV0dXJuIHRydWU7XG59O1xuXG5leHBvcnQgY29uc3QgbWFya3VwID0gT2JqZWN0LmNyZWF0ZShwYXJzZXIsIHtcbiAgaW5pdGlhbGl6ZToge2dldDogKCkgPT4gaW5pdGlhbGl6ZX0sXG4gIHJlbmRlcjoge2dldDogKCkgPT4gcmVuZGVyfSxcbiAgdG9rZW5pemU6IHtnZXQ6ICgpID0+IHRva2VuaXplfSxcbiAgd2FybXVwOiB7Z2V0OiAoKSA9PiB3YXJtdXB9LFxuICBkb206IHtnZXQ6ICgpID0+IGRvbX0sXG4gIG1vZGVzOiB7Z2V0OiAoKSA9PiBwYXJzZXIubW9kZXN9LFxufSk7XG5cbi8vLyBDT05TVEFOVFNcblxuY29uc3QgTWVzc2FnZXMgPSB7XG4gIEluaXRpYWxpemVGaXJzdDogYFRyeSBjYWxsaW5nIE1hcmt1cC5pbml0aWFsaXplKCkudGhlbijigKYpIGZpcnN0LmAsXG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYXJrdXA7XG4iXSwibmFtZXMiOlsiYWxsIiwiU3ltYm9scyIsImRlZmF1bHRzIiwic3ludGF4ZXMiLCJDbG9zdXJlcyIsInNlcXVlbmNlIiwicmF3IiwibWF0Y2hlcnMiLCJyZWFkeSIsImhlbHBlcnMuaWRlbnRpZmllciIsImRvY3VtZW50IiwiRWxlbWVudCIsIk5vZGUiLCJUZXh0IiwiRG9jdW1lbnRGcmFnbWVudCIsImNyZWF0ZUVsZW1lbnQiLCJjcmVhdGVUZXh0IiwiY3JlYXRlRnJhZ21lbnQiLCJkb20uZG9jdW1lbnQiLCJyZW5kZXJlciIsImluc3RhbGwiLCJkb20ubmF0aXZlIiwibmF0aXZlIiwiZG9tLnBzZXVkbyIsIm1vZGVzLnJlYWR5Iiwic3VwcG9ydGVkIiwiZG9tIiwicmVuZGVyZXJzIiwicGFyc2VyLmRlZmF1bHRzIiwibW9kZXMuaW5zdGFsbCIsImRvbS5pbnN0YWxsIiwidG9rZW5pemUiLCJyZW5kZXIiLCJwYXJzZXIucmVuZGVyIiwibWFya3VwIiwicGFyc2VyLm1vZGVzIl0sIm1hcHBpbmdzIjoiQUFBQTtBQUNBLEFBQU8sU0FBUyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRTtFQUNsRSxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO0NBQy9DOzs7OztBQUtELEFBQU8s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
