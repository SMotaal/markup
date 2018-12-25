var markup = (function (exports) {
  'use strict';

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
  typeof process === 'object' && console.info('[ESM]: %o', (typeof document !== 'undefined' ? document.currentScript && document.currentScript.src || document.baseURI : new (typeof URL !== 'undefined' ? URL : require('ur'+'l').URL)('file:' + __filename).href));

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

  const ready$2 = (async () => void (await ready$1))();

  const versions = [parser];

  // const versions = [parser, parser2];

  const initialize = () =>
    exports.initialized ||
    (exports.initialized = async () => {
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
      exports.tokenize = (source, options = {}) => {
        const version = options.version > 1 ? versions[options.version - 1] : versions[0];
        options.tokenize = (version || parser).tokenize;
        try {
          return version.tokenize(source, {options}, defaults$$1);
        } finally {
          !version || lastVersion === (lastVersion = version) || console.log({version});
        }
      };

      exports.render = async (source, options) => {
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

      exports.initialized = true;

      return markup$1;
    })();

  exports.render = async (source, options) => {
    await initialize();
    return await exports.render(source, options);
  };

  exports.tokenize = (source, options) => {
    if (!exports.initialized) throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
    else if (exports.initialized.then) ;
    return markup$1.tokenize(source, options);
  };

  const keyFrom = options => (options && JSON.stringify(options)) || '';
  const skim = iterable => {
  };

  const warmup = async (source, options) => {
    const key = (options && keyFrom(options)) || '';
    let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
    cache || warmup.cache.set(key, (cache = new Set()));
    await (exports.initialized || initialize());
    // let tokens;
    cache.has(source) || (skim(exports.tokenize(source, options)), cache.add(source));
    // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
    return true;
  };

  const markup$1 = Object.create(parser, {
    initialize: {get: () => initialize},
    render: {get: () => exports.render},
    tokenize: {get: () => exports.tokenize},
    warmup: {get: () => warmup},
    dom: {get: () => dom$1},
    modes: {get: () => modes},
  });

  /// CONSTANTS

  const Messages = {
    InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
  };

  exports.ready = ready$2;
  exports.versions = versions;
  exports.warmup = warmup;
  exports.markup = markup$1;
  exports.default = markup$1;

  return exports;

}({}));
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya3VwLmpzIiwic291cmNlcyI6WyIuLi9saWIvbWFya3VwLXBhcnNlci5qcyIsIi4uL2xpYi9oZWxwZXJzLmpzIiwiLi4vbGliL21hcmt1cC1wYXR0ZXJucy5qcyIsIi4uL2xpYi9leHRlbnNpb25zL3Bvc3RzY3JpcHQvcG9zdHNjcmlwdC1tb2RlLmpzIiwiLi4vbGliL21hcmt1cC1tb2Rlcy5qcyIsIi4uL3BhY2thZ2VzL3BzZXVkb20vbGliL3BzZXVkby5tanMiLCIuLi9wYWNrYWdlcy9wc2V1ZG9tL2xpYi9uYXRpdmUubWpzIiwiLi4vcGFja2FnZXMvcHNldWRvbS9wc2V1ZG9tLmpzIiwiLi4vbGliL21hcmt1cC1kb20uanMiLCIuLi9saWIvbWFya3VwLmpzIl0sInNvdXJjZXNDb250ZW50IjpbIi8qKiBNYXJrdXAgKHJlbmRlcikgQGF1dGhvciBTYWxlaCBBYmRlbCBNb3RhYWwgKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrdXAoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICByZXR1cm4gWy4uLnJlbmRlcihzb3VyY2UsIG9wdGlvbnMsIGRlZmF1bHRzKV07XG59XG5cbi8vLyBSRUdVTEFSIEVYUFJFU1NJT05TXG5cbi8qKiBOb24tYWxwaGFudW1lcmljIHN5bWJvbCBtYXRjaGluZyBleHByZXNzaW9ucyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBtYXRjaGVycyA9IHtcbiAgZXNjYXBlczogLyhcXG4pfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcKlxcL3xgfFwifCd8XFwkXFx7KS9nLFxuICBjb21tZW50czogLyhcXG4pfChcXCpcXC98XFxiKD86W2Etel0rXFw6XFwvXFwvfFxcd1tcXHdcXCtcXC5dKlxcd0BbYS16XSspXFxTK3xAW2Etel0rKS9naSxcbiAgcXVvdGVzOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKT98YHxcInwnfFxcJFxceykvZyxcbiAgeG1sOiAvKFtcXHNcXG5dKyl8KFwifCd8PXwmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3xcXC8/Pnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KD89W2Etel0rXFw6P1thLXpcXC1dKlthLXpdfFthLXpdKykpL2dpLFxuICBzZXF1ZW5jZXM6IC8oW1xcc1xcbl0rKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xcXC9cXC98XFwvXFwqfFxcKlxcL3xcXCh8XFwpfFxcW3xcXF18LHw7fFxcLlxcLlxcLnxcXC58XFxiOlxcL1xcL1xcYnw6Onw6fFxcP3xgfFwifCd8XFwkXFx7fFxce3xcXH18PT58PFxcL3xcXC8+fFxcKyt8XFwtK3xcXCorfCYrfFxcfCt8PSt8IT17MCwzfXw8ezEsM309P3w+ezEsMn09Pyl8WytcXC0qLyZ8XiU8Pn4hXT0/L2csXG59O1xuXG4vKiogU3BlY2lhbCBhbHBoYS1udW1lcmljIHN5bWJvbCB0ZXN0IGV4cHJlc3Npb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IHBhdHRlcm5zID0ge1xuICAvKiogQmFzaWMgbGF0aW4gS2V5d29yZCBsaWtlIHN5bWJvbCAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbiAgbWF5YmVLZXl3b3JkOiAvXlthLXpdKFxcdyopJC9pLFxufTtcblxuLy8vIFNZTlRBWEVTXG4vKiogU3ludGF4IGRlZmluaXRpb25zIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuZXhwb3J0IGNvbnN0IHN5bnRheGVzID0ge2RlZmF1bHQ6IHtwYXR0ZXJucywgbWF0Y2hlcjogbWF0Y2hlcnMuc2VxdWVuY2VzfX07XG5cbi8qKiBNb2RlIHN0YXRlcyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBtb2RlcyA9IHtkZWZhdWx0OiB7c3ludGF4OiAnZGVmYXVsdCd9fTtcblxuLy8vIERFRkFVTFRTXG4vKiogUGFyc2luZyBkZWZhdWx0cyAoaW50ZWRlZCB0byBiZSBleHRlbmRlZCkgKi9cbmV4cG9ydCBjb25zdCBkZWZhdWx0cyA9IChtYXJrdXAuZGVmYXVsdHMgPSB7XG4gIG1hdGNoZXI6IG1hdGNoZXJzLnNlcXVlbmNlcyxcbiAgc3ludGF4OiAnZGVmYXVsdCcsXG4gIHNvdXJjZVR5cGU6ICdkZWZhdWx0JyxcbiAgcmVuZGVyZXJzOiB7dGV4dDogU3RyaW5nfSxcbiAgcmVuZGVyZXIsXG4gIGdldCBzeW50YXhlcygpIHtcbiAgICByZXR1cm4gc3ludGF4ZXM7XG4gIH0sXG4gIHNldCBzeW50YXhlcyh2YWx1ZSkge1xuICAgIGlmICh0aGlzICE9PSBkZWZhdWx0cylcbiAgICAgIHRocm93IEVycm9yKFxuICAgICAgICAnSW52YWxpZCBhc3NpZ25tZW50OiBkaXJlY3QgYXNzaWdubWVudCB0byBkZWZhdWx0cyBpcyBub3QgYWxsb3dlZC4gVXNlIE9iamVjdC5jcmVhdGUoZGVmYXVsdHMpIHRvIGNyZWF0ZSBhIG11dGFibGUgaW5zdGFuY2Ugb2YgZGVmYXVsdHMgZmlyc3QuJyxcbiAgICAgICk7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsICdzeW50YXhlcycsIHt2YWx1ZX0pO1xuICB9LFxufSk7XG5cbmNvbnN0IE51bGwgPSBPYmplY3QuZnJlZXplKE9iamVjdC5jcmVhdGUobnVsbCkpO1xuXG4vLy8gUkVOREVSSU5HXG4vKiogVG9rZW4gcHJvdG90eXBlIChpbnRlZGVkIHRvIGJlIGV4dGVuZGVkKSAqL1xuY2xhc3MgVG9rZW4ge1xuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy50ZXh0O1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogcmVuZGVyZXIodG9rZW5zKSB7XG4gIGxldCBpID0gMDtcbiAgZm9yIGF3YWl0IChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHtcbiAgICBpZiAoIXRva2VuKSBjb250aW51ZTtcbiAgICBpKysgJSAxMCB8fCAoYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDEpKSk7XG4gICAgeWllbGQgT2JqZWN0LnNldFByb3RvdHlwZU9mKHRva2VuLCBUb2tlbi5wcm90b3R5cGUpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZW5kZXIoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICBjb25zdCB7c3ludGF4LCByZW5kZXJlciA9IGRlZmF1bHRzLnJlbmRlcmVyLCAuLi50b2tlbml6ZXJPcHRpb25zfSA9IG9wdGlvbnMgfHwgZGVmYXVsdHM7XG4gIGNvbnN0IHN0YXRlID0ge29wdGlvbnM6IHRva2VuaXplck9wdGlvbnN9O1xuICByZXR1cm4gcmVuZGVyZXIoKG9wdGlvbnMudG9rZW5pemUgfHwgdG9rZW5pemUpKHNvdXJjZSwgc3RhdGUsIGRlZmF1bHRzKSk7XG59XG5cbi8vLyBHUk9VUElOR1xuY29uc3QgR3JvdXBlciA9ICh7XG4gIC8qIGdyb3VwZXIgY29udGV4dCAqL1xuICBzeW50YXgsXG4gIGdvYWwgPSBzeW50YXgsXG4gIHF1b3RlLFxuICBjb21tZW50LFxuICBjbG9zdXJlLFxuICBzcGFuLFxuICBncm91cGluZyA9IGNvbW1lbnQgfHwgY2xvc3VyZSB8fCBzcGFuIHx8IHVuZGVmaW5lZCxcblxuICBwdW5jdHVhdG9yLFxuICAvLyB0ZXJtaW5hdG9yID0gKGNvbW1lbnQgJiYgY29tbWVudC5jbG9zZXIpIHx8IHVuZGVmaW5lZCxcbiAgc3BhbnMgPSAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuc3BhbnMpIHx8IHVuZGVmaW5lZCxcbiAgbWF0Y2hlciA9IChncm91cGluZyAmJiBncm91cGluZy5tYXRjaGVyKSB8fCB1bmRlZmluZWQsXG4gIHF1b3RlcyA9IChncm91cGluZyAmJiBncm91cGluZy5xdW90ZXMpIHx8IHVuZGVmaW5lZCxcbiAgcHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSxcbiAgb3BlbmVyID0gcXVvdGUgfHwgKGdyb3VwaW5nICYmIGdyb3VwaW5nLm9wZW5lcikgfHwgdW5kZWZpbmVkLFxuICBjbG9zZXIgPSBxdW90ZSB8fCAoZ3JvdXBpbmcgJiYgZ3JvdXBpbmcuY2xvc2VyKSB8fCB1bmRlZmluZWQsXG4gIGhpbnRlcixcbiAgb3BlbiA9IChncm91cGluZyAmJiBncm91cGluZy5vcGVuKSB8fCB1bmRlZmluZWQsXG4gIGNsb3NlID0gKGdyb3VwaW5nICYmIGdyb3VwaW5nLmNsb3NlKSB8fCB1bmRlZmluZWQsXG59KSA9PiAoe1xuICBzeW50YXgsXG4gIGdvYWwsXG4gIHB1bmN0dWF0b3IsXG4gIC8vIHRlcm1pbmF0b3IsXG4gIHNwYW5zLFxuICBtYXRjaGVyLFxuICBxdW90ZXMsXG4gIHB1bmN0dWF0b3JzLFxuICBvcGVuZXIsXG4gIGNsb3NlcixcbiAgaGludGVyLFxuICBvcGVuLFxuICBjbG9zZSxcbn0pO1xuXG5jb25zdCBjcmVhdGVHcm91cGVyID0gR3JvdXBlcjtcblxuLy8vIFRPS0VOSVpBVElPTlxuXG5leHBvcnQgZnVuY3Rpb24qIGNvbnRleHR1YWxpemVyKCQsIGRlZmF1bHRzKSB7XG4gIGxldCBkb25lLCBncm91cGVyO1xuXG4gICQgIT09IHVuZGVmaW5lZCB8fFxuICAgICgkID0gKGRlZmF1bHRzICYmIGRlZmF1bHRzLnN5bnRheGVzICYmIGRlZmF1bHRzLnN5bnRheGVzLmRlZmF1bHQpIHx8IHN5bnRheGVzLmRlZmF1bHQpO1xuXG4gIGNvbnN0IGluaXRpYWxpemUgPSBjb250ZXh0ID0+IHtcbiAgICBjb250ZXh0LnRva2VuIHx8XG4gICAgICAoY29udGV4dC50b2tlbiA9ICh0b2tlbml6ZXIgPT4gKHRva2VuaXplci5uZXh0KCksIHRva2VuID0+IHRva2VuaXplci5uZXh0KHRva2VuKS52YWx1ZSkpKFxuICAgICAgICB0b2tlbml6ZXIoY29udGV4dCksXG4gICAgICApKTtcbiAgICBjb250ZXh0O1xuICB9O1xuXG4gIGlmICghJC5jb250ZXh0KSB7XG4gICAgY29uc3Qge1xuICAgICAgc3ludGF4LFxuICAgICAgbWF0Y2hlciA9ICgkLm1hdGNoZXIgPSBkZWZhdWx0cy5tYXRjaGVyKSxcbiAgICAgIHF1b3RlcyxcbiAgICAgIHB1bmN0dWF0b3JzID0gKCQucHVuY3R1YXRvcnMgPSB7YWdncmVnYXRvcnM6IHt9fSksXG4gICAgICBwdW5jdHVhdG9yczoge2FnZ3JlZ2F0b3JzID0gKCRwdW5jdHVhdG9ycy5hZ2dyZWdhdG9ycyA9IHt9KX0sXG4gICAgICBwYXR0ZXJuczoge1xuICAgICAgICBtYXliZUtleXdvcmQgPSAoJC5wYXR0ZXJucy5tYXliZUtleXdvcmQgPVxuICAgICAgICAgICgoZGVmYXVsdHMgJiYgZGVmYXVsdHMucGF0dGVybnMpIHx8IHBhdHRlcm5zKS5tYXliZUtleXdvcmQgfHwgdW5kZWZpbmVkKSxcbiAgICAgIH0gPSAoJC5wYXR0ZXJucyA9IHttYXliZUtleXdvcmQ6IG51bGx9KSxcbiAgICAgIHNwYW5zOiB7W3N5bnRheF06IHNwYW5zfSA9IE51bGwsXG4gICAgfSA9ICQ7XG5cbiAgICAvLyBtYXRjaGVyLm1hdGNoZXIgfHxcbiAgICAvLyAgIChtYXRjaGVyLm1hdGNoZXIgPSBuZXcgUmVnRXhwKG1hdGNoZXIuc291cmNlLCBtYXRjaGVyLmZsYWdzLnJlcGxhY2UoJ2cnLCAneScpKSk7XG5cbiAgICBpbml0aWFsaXplKFxuICAgICAgKCQuY29udGV4dCA9IHtcbiAgICAgICAgLy8gLi4uICQsXG4gICAgICAgICQsXG4gICAgICAgIHB1bmN0dWF0b3JzLFxuICAgICAgICBhZ2dyZWdhdG9ycyxcbiAgICAgICAgLy8gbWF0Y2hlcjogbWF0Y2hlci5tYXRjaGVyLFxuICAgICAgICBtYXRjaGVyLFxuICAgICAgICBxdW90ZXMsXG4gICAgICAgIHNwYW5zLFxuICAgICAgfSksXG4gICAgKTtcbiAgfVxuXG4gIGNvbnN0IHtcbiAgICBzeW50YXg6ICRzeW50YXgsXG4gICAgbWF0Y2hlcjogJG1hdGNoZXIsXG4gICAgcXVvdGVzOiAkcXVvdGVzLFxuICAgIHB1bmN0dWF0b3JzOiAkcHVuY3R1YXRvcnMsXG4gICAgcHVuY3R1YXRvcnM6IHthZ2dyZWdhdG9yczogJGFnZ3JlZ2F0b3JzfSxcbiAgfSA9ICQ7XG5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICBpZiAoXG4gICAgICBncm91cGVyICE9PSAoZ3JvdXBlciA9IHlpZWxkIChncm91cGVyICYmIGdyb3VwZXIuY29udGV4dCkgfHwgJC5jb250ZXh0KSAmJlxuICAgICAgZ3JvdXBlciAmJlxuICAgICAgIWdyb3VwZXIuY29udGV4dFxuICAgICkge1xuICAgICAgY29uc3Qge1xuICAgICAgICBnb2FsID0gJHN5bnRheCxcbiAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgcHVuY3R1YXRvcnMgPSAkcHVuY3R1YXRvcnMsXG4gICAgICAgIGFnZ3JlZ2F0b3JzID0gJGFnZ3JlZ2F0b3JzLFxuICAgICAgICBjbG9zZXIsXG4gICAgICAgIHNwYW5zLFxuICAgICAgICBtYXRjaGVyID0gJG1hdGNoZXIsXG4gICAgICAgIHF1b3RlcyA9ICRxdW90ZXMsXG4gICAgICAgIGZvcm1pbmcgPSBnb2FsID09PSAkc3ludGF4LFxuICAgICAgfSA9IGdyb3VwZXI7XG5cbiAgICAgIC8vICFtYXRjaGVyIHx8XG4gICAgICAvLyAgIG1hdGNoZXIubWF0Y2hlciB8fFxuICAgICAgLy8gICAobWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChtYXRjaGVyLnNvdXJjZSwgbWF0Y2hlci5mbGFncy5yZXBsYWNlKCdnJywgJ3knKSkpO1xuXG4gICAgICBpbml0aWFsaXplKFxuICAgICAgICAoZ3JvdXBlci5jb250ZXh0ID0ge1xuICAgICAgICAgIC8vIC4uLiAkLmNvbnRleHQsXG4gICAgICAgICAgJCxcbiAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgIHB1bmN0dWF0b3JzLFxuICAgICAgICAgIGFnZ3JlZ2F0b3JzLFxuICAgICAgICAgIGNsb3NlcixcbiAgICAgICAgICBzcGFucyxcbiAgICAgICAgICAvLyBtYXRjaGVyOiBtYXRjaGVyICYmIG1hdGNoZXIubWF0Y2hlcixcbiAgICAgICAgICBtYXRjaGVyLFxuICAgICAgICAgIHF1b3RlcyxcbiAgICAgICAgICBmb3JtaW5nLFxuICAgICAgICB9KSxcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogdG9rZW5pemVyKGNvbnRleHQpIHtcbiAgbGV0IGRvbmUsIG5leHQ7XG5cbiAgY29uc3Qge1xuICAgICQ6IHtcbiAgICAgIHN5bnRheCxcbiAgICAgIGtleXdvcmRzLFxuICAgICAgYXNzaWduZXJzLFxuICAgICAgb3BlcmF0b3JzLFxuICAgICAgY29tYmluYXRvcnMsXG4gICAgICBub25icmVha2VycyxcbiAgICAgIGNvbW1lbnRzLFxuICAgICAgY2xvc3VyZXMsXG4gICAgICBicmVha2VycyxcbiAgICAgIHBhdHRlcm5zLFxuICAgIH0sXG4gICAgcHVuY3R1YXRvcnMsXG4gICAgYWdncmVnYXRvcnMsXG4gICAgc3BhbnMsXG4gICAgcXVvdGVzLFxuICAgIGZvcm1pbmcgPSB0cnVlLFxuXG4gICAgLy8gc3ludGF4LFxuICAgIC8vIGtleXdvcmRzLFxuICAgIC8vIGFzc2lnbmVycyxcbiAgICAvLyBvcGVyYXRvcnMsXG4gICAgLy8gY29tYmluYXRvcnMsXG4gICAgLy8gbm9uYnJlYWtlcnMsXG4gICAgLy8gY29tbWVudHMsXG4gICAgLy8gY2xvc3VyZXMsXG4gICAgLy8gYnJlYWtlcnMsXG4gICAgLy8gcGF0dGVybnMsXG4gIH0gPSBjb250ZXh0O1xuXG4gIGNvbnN0IHttYXliZUlkZW50aWZpZXIsIG1heWJlS2V5d29yZH0gPSBwYXR0ZXJucyB8fCBjb250ZXh0O1xuICBjb25zdCB3b3JkaW5nID0ga2V5d29yZHMgfHwgbWF5YmVJZGVudGlmaWVyID8gdHJ1ZSA6IGZhbHNlO1xuXG4gIGNvbnN0IExpbmVFbmRpbmdzID0gLyQvZ207XG4gIGNvbnN0IHB1bmN0dWF0ZSA9IHRleHQgPT5cbiAgICAobm9uYnJlYWtlcnMgJiYgbm9uYnJlYWtlcnMuaW5jbHVkZXModGV4dCkgJiYgJ25vbmJyZWFrZXInKSB8fFxuICAgIChvcGVyYXRvcnMgJiYgb3BlcmF0b3JzLmluY2x1ZGVzKHRleHQpICYmICdvcGVyYXRvcicpIHx8XG4gICAgKGNvbW1lbnRzICYmIGNvbW1lbnRzLmluY2x1ZGVzKHRleHQpICYmICdjb21tZW50JykgfHxcbiAgICAoc3BhbnMgJiYgc3BhbnMuaW5jbHVkZXModGV4dCkgJiYgJ3NwYW4nKSB8fFxuICAgIChxdW90ZXMgJiYgcXVvdGVzLmluY2x1ZGVzKHRleHQpICYmICdxdW90ZScpIHx8XG4gICAgKGNsb3N1cmVzICYmIGNsb3N1cmVzLmluY2x1ZGVzKHRleHQpICYmICdjbG9zdXJlJykgfHxcbiAgICAoYnJlYWtlcnMgJiYgYnJlYWtlcnMuaW5jbHVkZXModGV4dCkgJiYgJ2JyZWFrZXInKSB8fFxuICAgIGZhbHNlO1xuXG4gIGNvbnN0IGFnZ3JlZ2F0ZSA9XG4gICAgKChhc3NpZ25lcnMgJiYgYXNzaWduZXJzLnNpemUpIHx8IChjb21iaW5hdG9ycyAmJiBjb21iaW5hdG9ycy5zaXplKSkgJiZcbiAgICAodGV4dCA9PlxuICAgICAgKGFzc2lnbmVycyAmJiBhc3NpZ25lcnMuaW5jbHVkZXModGV4dCkgJiYgJ2Fzc2lnbmVyJykgfHxcbiAgICAgIChjb21iaW5hdG9ycyAmJiBjb21iaW5hdG9ycy5pbmNsdWRlcyh0ZXh0KSAmJiAnY29tYmluYXRvcicpIHx8XG4gICAgICBmYWxzZSk7XG5cbiAgLy8gY29uc3Qgc2VlbiA9IHRva2VuaXplci5zZWVuIHx8IG5ldyBXZWFrU2V0KCk7XG4gIC8vIGxldCB1bnNlZW47XG4gIC8vIHNlZW4uaGFzKGNvbnRleHQpIHx8XG4gIC8vICAgKHNlZW4uYWRkKFxuICAvLyAgICAgT2JqZWN0LnZhbHVlcyhcbiAgLy8gICAgICAgKHVuc2VlbiA9IHtjb250ZXh0fSksXG4gIC8vICAgICAgICFhZ2dyZWdhdG9ycyB8fCAodW5zZWVuLmFnZ3JlZ2F0b3JzID0gYWdncmVnYXRvcnMpLFxuICAvLyAgICAgICAhcHVuY3R1YXRvcnMgfHwgKHVuc2Vlbi5wdW5jdHVhdG9ycyA9IHB1bmN0dWF0b3JzKSxcbiAgLy8gICAgICAgdW5zZWVuLFxuICAvLyAgICAgKSxcbiAgLy8gICApICYmIGNvbnNvbGUubG9nKHVuc2VlbikpO1xuXG4gIHdoaWxlICghZG9uZSkge1xuICAgIGxldCB0b2tlbiwgcHVuY3R1YXRvcjtcbiAgICBpZiAobmV4dCAmJiBuZXh0LnRleHQpIHtcbiAgICAgIGNvbnN0IHtcbiAgICAgICAgdGV4dCwgLy8gVGV4dCBmb3IgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIHR5cGUsIC8vIFR5cGUgb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIG9mZnNldCwgLy8gSW5kZXggb2YgbmV4dCBwcm9kdWN0aW9uXG4gICAgICAgIC8vIGJyZWFrcywgLy8gTGluZWJyZWFrcyBpbiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgaGludCwgLy8gSGludCBvZiBuZXh0IHByb2R1Y3Rpb25cbiAgICAgICAgcHJldmlvdXMsIC8vIFByZXZpb3VzIHByb2R1Y3Rpb25cbiAgICAgICAgcGFyZW50ID0gKG5leHQucGFyZW50ID0gKHByZXZpb3VzICYmIHByZXZpb3VzLnBhcmVudCkgfHwgdW5kZWZpbmVkKSwgLy8gUGFyZW50IG9mIG5leHQgcHJvZHVjdGlvblxuICAgICAgICBsYXN0LCAvLyBMYXN0IHNpZ25pZmljYW50IHByb2R1Y3Rpb25cbiAgICAgIH0gPSBuZXh0O1xuXG4gICAgICBpZiAodHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgICAgICAobmV4dC5wdW5jdHVhdG9yID1cbiAgICAgICAgICAoYWdncmVnYXRlICYmXG4gICAgICAgICAgICBwcmV2aW91cyAmJlxuICAgICAgICAgICAgKGFnZ3JlZ2F0b3JzW3RleHRdIHx8XG4gICAgICAgICAgICAgICghKHRleHQgaW4gYWdncmVnYXRvcnMpICYmIChhZ2dyZWdhdG9yc1t0ZXh0XSA9IGFnZ3JlZ2F0ZSh0ZXh0KSkpKSkgfHxcbiAgICAgICAgICAocHVuY3R1YXRvcnNbdGV4dF0gfHxcbiAgICAgICAgICAgICghKHRleHQgaW4gcHVuY3R1YXRvcnMpICYmIChwdW5jdHVhdG9yc1t0ZXh0XSA9IHB1bmN0dWF0ZSh0ZXh0KSkpKSB8fFxuICAgICAgICAgIHVuZGVmaW5lZCkgJiYgKG5leHQudHlwZSA9ICdwdW5jdHVhdG9yJyk7XG4gICAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICd3aGl0ZXNwYWNlJykge1xuICAgICAgICBuZXh0LmJyZWFrcyA9IHRleHQubWF0Y2goTGluZUVuZGluZ3MpLmxlbmd0aCAtIDE7XG4gICAgICB9IGVsc2UgaWYgKGZvcm1pbmcgJiYgd29yZGluZykge1xuICAgICAgICAvLyB0eXBlICE9PSAnaW5kZW50JyAmJlxuICAgICAgICBjb25zdCB3b3JkID0gdGV4dC50cmltKCk7XG4gICAgICAgIHdvcmQgJiZcbiAgICAgICAgICAoKGtleXdvcmRzICYmXG4gICAgICAgICAgICBrZXl3b3Jkcy5pbmNsdWRlcyh3b3JkKSAmJlxuICAgICAgICAgICAgKCFsYXN0IHx8IGxhc3QucHVuY3R1YXRvciAhPT0gJ25vbmJyZWFrZXInIHx8IChwcmV2aW91cyAmJiBwcmV2aW91cy5icmVha3MgPiAwKSkgJiZcbiAgICAgICAgICAgIChuZXh0LnR5cGUgPSAna2V5d29yZCcpKSB8fFxuICAgICAgICAgICAgKG1heWJlSWRlbnRpZmllciAmJiBtYXliZUlkZW50aWZpZXIudGVzdCh3b3JkKSAmJiAobmV4dC50eXBlID0gJ2lkZW50aWZpZXInKSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbmV4dC50eXBlID0gJ3RleHQnO1xuICAgICAgfVxuXG4gICAgICBwcmV2aW91cyAmJiAocHJldmlvdXMubmV4dCA9IG5leHQpO1xuXG4gICAgICB0b2tlbiA9IG5leHQ7XG4gICAgfVxuXG4gICAgbmV4dCA9IHlpZWxkIHRva2VuO1xuICB9XG59XG5cbi8vIFRPRE86IDxAU01vdGFhbD4gUmVmYWN0b3JcbmV4cG9ydCBmdW5jdGlvbiogdG9rZW5pemUoc291cmNlLCBzdGF0ZSA9IHt9LCBkZWZhdWx0cyA9IG1hcmt1cC5kZWZhdWx0cykge1xuICBjb25zdCBzeW50YXhlcyA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGxldCB7XG4gICAgbWF0Y2gsXG4gICAgaW5kZXgsXG4gICAgb3B0aW9uczoge1xuICAgICAgc291cmNlVHlwZSA9IChzdGF0ZS5vcHRpb25zLnNvdXJjZVR5cGUgPSBzdGF0ZS5vcHRpb25zLnN5bnRheCB8fCBkZWZhdWx0cy5zb3VyY2VUeXBlKSxcbiAgICB9ID0gKHN0YXRlLm9wdGlvbnMgPSB7fSksXG4gICAgcHJldmlvdXMgPSBudWxsLFxuICAgIG1vZGUgPSAoc3RhdGUubW9kZSA9IG1vZGVzW3NvdXJjZVR5cGVdIHx8IG1vZGVzW2RlZmF1bHRzLnNvdXJjZVR5cGVdKSxcbiAgICBtb2RlOiB7c3ludGF4fSxcbiAgICBncm91cGluZyA9IChzdGF0ZS5ncm91cGluZyA9IHtcbiAgICAgIGhpbnRzOiBuZXcgU2V0KCksXG4gICAgICBncm91cGluZ3M6IFtdLFxuICAgICAgZ3JvdXBlcnM6IG1vZGUuZ3JvdXBlcnMgfHwgKG1vZGUuZ3JvdXBlcnMgPSB7fSksXG4gICAgfSksXG4gIH0gPSBzdGF0ZTtcblxuICAoc3RhdGUuc291cmNlID09PSAoc3RhdGUuc291cmNlID0gc291cmNlKSAmJiBpbmRleCA+PSAwKSB8fFxuICAgIChpbmRleCA9IHN0YXRlLmluZGV4ID0gKGluZGV4ID4gMCAmJiBpbmRleCAlIHNvdXJjZS5sZW5ndGgpIHx8IDApO1xuXG4gIGNvbnN0IHRvcCA9IHt0eXBlOiAndG9wJywgdGV4dDogJycsIG9mZnNldDogaW5kZXh9O1xuXG4gIGxldCBkb25lLFxuICAgIHBhcmVudCA9IHRvcCxcbiAgICBsYXN0O1xuXG4gIGxldCBsYXN0Q29udGV4dDtcblxuICBjb25zdCB7XG4gICAgWyhzdGF0ZS5zeW50YXggPSBzdGF0ZS5tb2RlLnN5bnRheCldOiAkID0gZGVmYXVsdHMuc3ludGF4ZXNbZGVmYXVsdHMuc3ludGF4XSxcbiAgfSA9IGRlZmF1bHRzLnN5bnRheGVzO1xuXG4gIGNvbnN0ICRjb250ZXh0aW5nID0gY29udGV4dHVhbGl6ZXIoJCwgZGVmYXVsdHMpO1xuICBsZXQgJGNvbnRleHQgPSAkY29udGV4dGluZy5uZXh0KCkudmFsdWU7XG5cbiAgLy8gSW5pdGlhbCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheClcbiAgIXN5bnRheCB8fFxuICAgIChncm91cGluZy5nb2FsIHx8IChncm91cGluZy5nb2FsID0gc3ludGF4KSwgZ3JvdXBpbmcuaGludCAmJiBncm91cGluZy5sYXN0U3ludGF4ID09PSBzeW50YXgpIHx8XG4gICAgKGdyb3VwaW5nLmhpbnRzLmFkZChzeW50YXgpLmRlbGV0ZShncm91cGluZy5sYXN0U3ludGF4KSxcbiAgICAoZ3JvdXBpbmcuaGludCA9IFsuLi5ncm91cGluZy5oaW50c10uam9pbignICcpKSxcbiAgICAoZ3JvdXBpbmcuY29udGV4dCA9IHN0YXRlLmNvbnRleHQgfHwgKHN0YXRlLmNvbnRleHQgPSBncm91cGluZy5sYXN0U3ludGF4ID0gc3ludGF4KSkpO1xuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgY29uc3Qge1xuICAgICAgJDoge3N5bnRheCwgbWF0Y2hlcnMsIGNvbW1lbnRzLCBzcGFucywgY2xvc3VyZXN9LFxuICAgICAgLy8gc3ludGF4LCBtYXRjaGVycywgY29tbWVudHMsIHNwYW5zLCBjbG9zdXJlcyxcblxuICAgICAgcHVuY3R1YXRvcjogJCRwdW5jdHVhdG9yLFxuICAgICAgY2xvc2VyOiAkJGNsb3NlcixcbiAgICAgIHNwYW5zOiAkJHNwYW5zLFxuICAgICAgLy8gbWF0Y2hlcjogJCRtYXRjaGVyLFxuICAgICAgbWF0Y2hlcjoge1xuICAgICAgICBtYXRjaGVyOiAkJG1hdGNoZXIgPSAoJGNvbnRleHQubWF0Y2hlci5tYXRjaGVyID0gbmV3IFJlZ0V4cChcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLnNvdXJjZSxcbiAgICAgICAgICAkY29udGV4dC5tYXRjaGVyLmZsYWdzLCAvLyAucmVwbGFjZSgnZycsICd5JyksXG4gICAgICAgICkpLFxuICAgICAgfSxcbiAgICAgIHRva2VuLFxuICAgICAgLy8gdG9rZW4gPSAoJGNvbnRleHQudG9rZW4gPSAodG9rZW5pemVyID0+IChcbiAgICAgIC8vICAgdG9rZW5pemVyLm5leHQoKSwgdG9rZW4gPT4gdG9rZW5pemVyLm5leHQodG9rZW4pLnZhbHVlXG4gICAgICAvLyApKSh0b2tlbml6ZXIoJGNvbnRleHQpKSksXG4gICAgICBmb3JtaW5nID0gdHJ1ZSxcbiAgICB9ID0gJGNvbnRleHQ7XG5cbiAgICAvLyBQcmltZSBNYXRjaGVyXG4gICAgLy8gKChzdGF0ZS5tYXRjaGVyICE9PSAkJG1hdGNoZXIgJiYgKHN0YXRlLm1hdGNoZXIgPSAkJG1hdGNoZXIpKSB8fFxuICAgIC8vICAgc3RhdGUuaW5kZXggIT09ICQkbWF0Y2hlci5sYXN0SW5kZXgpICYmXG4gICAgLy8gICAkJG1hdGNoZXIuZXhlYyhzdGF0ZS5zb3VyY2UpO1xuXG4gICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGhpbnQgKHN5bnRheCBvciBoaW50KVxuICAgIGNvbnN0IGhpbnQgPSBncm91cGluZy5oaW50O1xuXG4gICAgd2hpbGUgKGxhc3RDb250ZXh0ID09PSAobGFzdENvbnRleHQgPSAkY29udGV4dCkpIHtcbiAgICAgIGxldCBuZXh0O1xuXG4gICAgICBzdGF0ZS5sYXN0ID0gbGFzdDtcblxuICAgICAgY29uc3QgbGFzdEluZGV4ID0gc3RhdGUuaW5kZXggfHwgMDtcblxuICAgICAgJCRtYXRjaGVyLmxhc3RJbmRleCA9PT0gbGFzdEluZGV4IHx8ICgkJG1hdGNoZXIubGFzdEluZGV4ID0gbGFzdEluZGV4KTtcbiAgICAgIG1hdGNoID0gc3RhdGUubWF0Y2ggPSAkJG1hdGNoZXIuZXhlYyhzb3VyY2UpO1xuICAgICAgZG9uZSA9IGluZGV4ID09PSAoaW5kZXggPSBzdGF0ZS5pbmRleCA9ICQkbWF0Y2hlci5sYXN0SW5kZXgpIHx8ICFtYXRjaDtcblxuICAgICAgaWYgKGRvbmUpIHJldHVybjtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIG1hdGNoXG4gICAgICBjb25zdCB7MDogdGV4dCwgMTogd2hpdGVzcGFjZSwgMjogc2VxdWVuY2UsIGluZGV4OiBvZmZzZXR9ID0gbWF0Y2g7XG5cbiAgICAgIC8vIEN1cnJlbnQgcXVhc2ktY29udGV4dHVhbCBmcmFnbWVudFxuICAgICAgY29uc3QgcHJlID0gc291cmNlLnNsaWNlKGxhc3RJbmRleCwgb2Zmc2V0KTtcbiAgICAgIHByZSAmJlxuICAgICAgICAoKG5leHQgPSB0b2tlbih7dHlwZTogJ3ByZScsIHRleHQ6IHByZSwgb2Zmc2V0OiBsYXN0SW5kZXgsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KSksXG4gICAgICAgIHlpZWxkIChwcmV2aW91cyA9IG5leHQpKTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIGZyYWdtZW50XG4gICAgICBjb25zdCB0eXBlID0gKHdoaXRlc3BhY2UgJiYgJ3doaXRlc3BhY2UnKSB8fCAoc2VxdWVuY2UgJiYgJ3NlcXVlbmNlJykgfHwgJ3RleHQnO1xuICAgICAgbmV4dCA9IHRva2VuKHt0eXBlLCB0ZXh0LCBvZmZzZXQsIHByZXZpb3VzLCBwYXJlbnQsIGhpbnQsIGxhc3R9KTtcblxuICAgICAgLy8gQ3VycmVudCBjb250ZXh0dWFsIHB1bmN0dWF0b3IgKGZyb20gc2VxdWVuY2UpXG4gICAgICBjb25zdCBjbG9zaW5nID1cbiAgICAgICAgJCRjbG9zZXIgJiZcbiAgICAgICAgKCQkY2xvc2VyLnRlc3RcbiAgICAgICAgICA/ICQkY2xvc2VyLnRlc3QodGV4dClcbiAgICAgICAgICA6ICQkY2xvc2VyID09PSB0ZXh0IHx8ICh3aGl0ZXNwYWNlICYmIHdoaXRlc3BhY2UuaW5jbHVkZXMoJCRjbG9zZXIpKSk7XG5cbiAgICAgIGxldCBhZnRlcjtcbiAgICAgIGxldCBwdW5jdHVhdG9yID0gbmV4dC5wdW5jdHVhdG9yO1xuXG4gICAgICBpZiAocHVuY3R1YXRvciB8fCBjbG9zaW5nKSB7XG4gICAgICAgIC8vIHB1bmN0dWF0b3IgdGV4dCBjbG9zaW5nIG5leHQgcGFyZW50XG4gICAgICAgIC8vIHN5bnRheCBtYXRjaGVycyBjbG9zdXJlcyBzcGFucyAkJHNwYW5zXG5cbiAgICAgICAgbGV0IGhpbnRlciA9IHB1bmN0dWF0b3IgPyBgJHtzeW50YXh9LSR7cHVuY3R1YXRvcn1gIDogZ3JvdXBpbmcuaGludDtcbiAgICAgICAgbGV0IGNsb3NlZCwgb3BlbmVkLCBncm91cGVyO1xuXG4gICAgICAgIGlmIChjbG9zaW5nKSB7XG4gICAgICAgICAgY2xvc2VkID0gZ3JvdXBlciA9IGNsb3NpbmcgJiYgZ3JvdXBpbmcuZ3JvdXBpbmdzLnBvcCgpO1xuICAgICAgICAgIG5leHQuY2xvc2VkID0gY2xvc2VkO1xuICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5pbmNsdWRlcyhncm91cGVyKSB8fCBncm91cGluZy5oaW50cy5kZWxldGUoZ3JvdXBlci5oaW50ZXIpO1xuICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciA9PT0gJ29wZW5lcicgJiYgKG5leHQucHVuY3R1YXRvciA9ICdjbG9zZXInKSkgfHxcbiAgICAgICAgICAgIChjbG9zZWQucHVuY3R1YXRvciAmJiAobmV4dC5wdW5jdHVhdG9yID0gY2xvc2VkLnB1bmN0dWF0b3IpKTtcbiAgICAgICAgICBhZnRlciA9IGdyb3VwZXIuY2xvc2UgJiYgZ3JvdXBlci5jbG9zZShuZXh0LCBzdGF0ZSwgJGNvbnRleHQpO1xuXG4gICAgICAgICAgY29uc3QgcHJldmlvdXNHcm91cGVyID0gKGdyb3VwZXIgPSBncm91cGluZy5ncm91cGluZ3NbZ3JvdXBpbmcuZ3JvdXBpbmdzLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgICBncm91cGluZy5nb2FsID0gKHByZXZpb3VzR3JvdXBlciAmJiBwcmV2aW91c0dyb3VwZXIuZ29hbCkgfHwgc3ludGF4O1xuICAgICAgICAgIHBhcmVudCA9IChwYXJlbnQgJiYgcGFyZW50LnBhcmVudCkgfHwgdG9wO1xuICAgICAgICB9IGVsc2UgaWYgKCQkcHVuY3R1YXRvciAhPT0gJ2NvbW1lbnQnKSB7XG4gICAgICAgICAgY29uc3QgZ3JvdXAgPSBgJHtoaW50ZXJ9LCR7dGV4dH1gO1xuICAgICAgICAgIGdyb3VwZXIgPSBncm91cGluZy5ncm91cGVyc1tncm91cF07XG5cbiAgICAgICAgICBpZiAoJCRzcGFucyAmJiBwdW5jdHVhdG9yID09PSAnc3BhbicpIHtcbiAgICAgICAgICAgIC8vIGNvbnN0IHNwYW4gPSAkJHNwYW5zW3RleHRdO1xuICAgICAgICAgICAgY29uc3Qgc3BhbiA9ICQkc3BhbnMuZ2V0KHRleHQpO1xuICAgICAgICAgICAgbmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9ICdzcGFuJztcbiAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgY3JlYXRlR3JvdXBlcih7XG4gICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICBzcGFuLFxuICAgICAgICAgICAgICAgIG1hdGNoZXI6IHNwYW4ubWF0Y2hlciB8fCAobWF0Y2hlcnMgJiYgbWF0Y2hlcnMuc3BhbikgfHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgIHNwYW5zOiAoc3BhbnMgJiYgc3BhbnNbdGV4dF0pIHx8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgkJHB1bmN0dWF0b3IgIT09ICdxdW90ZScpIHtcbiAgICAgICAgICAgIGlmIChwdW5jdHVhdG9yID09PSAncXVvdGUnKSB7XG4gICAgICAgICAgICAgIG9wZW5lZCA9XG4gICAgICAgICAgICAgICAgZ3JvdXBlciB8fFxuICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgc3ludGF4LFxuICAgICAgICAgICAgICAgICAgZ29hbDogcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIHF1b3RlOiB0ZXh0LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogKG1hdGNoZXJzICYmIG1hdGNoZXJzLnF1b3RlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBzcGFuczogKHNwYW5zICYmIHNwYW5zW3RleHRdKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY29tbWVudCcpIHtcbiAgICAgICAgICAgICAgLy8gY29uc3QgY29tbWVudCA9IGNvbW1lbnRzW3RleHRdO1xuICAgICAgICAgICAgICBjb25zdCBjb21tZW50ID0gY29tbWVudHMuZ2V0KHRleHQpO1xuICAgICAgICAgICAgICBvcGVuZWQgPVxuICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICBjcmVhdGVHcm91cGVyKHtcbiAgICAgICAgICAgICAgICAgIHN5bnRheCxcbiAgICAgICAgICAgICAgICAgIGdvYWw6IHB1bmN0dWF0b3IsXG4gICAgICAgICAgICAgICAgICBjb21tZW50LFxuICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY29tbWVudC5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jb21tZW50KSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICBoaW50ZXIsXG4gICAgICAgICAgICAgICAgICBwdW5jdHVhdG9yLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChwdW5jdHVhdG9yID09PSAnY2xvc3VyZScpIHtcbiAgICAgICAgICAgICAgLy8gY29uc3QgY2xvc3VyZSA9IChncm91cGVyICYmIGdyb3VwZXIuY2xvc3VyZSkgfHwgY2xvc3VyZXNbdGV4dF07XG4gICAgICAgICAgICAgIGNvbnN0IGNsb3N1cmUgPSAoZ3JvdXBlciAmJiBncm91cGVyLmNsb3N1cmUpIHx8IGNsb3N1cmVzLmdldCh0ZXh0KTtcbiAgICAgICAgICAgICAgcHVuY3R1YXRvciA9IG5leHQucHVuY3R1YXRvciA9ICdvcGVuZXInO1xuICAgICAgICAgICAgICAvLyAnb3BlbmVyJyAhPT1cbiAgICAgICAgICAgICAgLy8gICAocHVuY3R1YXRvciA9XG4gICAgICAgICAgICAgIC8vICAgICAoY2xvc3VyZS5vcGVuICYmXG4gICAgICAgICAgICAgIC8vICAgICAgIChuZXh0ID0gY2xvc3VyZS5vcGVuKG5leHQsIHN0YXRlLCBwcmV2aW91cykgfHwgbmV4dCkucHVuY3R1YXRvcikgfHxcbiAgICAgICAgICAgICAgLy8gICAgIChuZXh0LnB1bmN0dWF0b3IgPSAnb3BlbmVyJykpIHx8XG4gICAgICAgICAgICAgIGNsb3N1cmUgJiZcbiAgICAgICAgICAgICAgICAob3BlbmVkID1cbiAgICAgICAgICAgICAgICAgIGdyb3VwZXIgfHxcbiAgICAgICAgICAgICAgICAgIGNyZWF0ZUdyb3VwZXIoe1xuICAgICAgICAgICAgICAgICAgICBzeW50YXgsXG4gICAgICAgICAgICAgICAgICAgIGdvYWw6IHN5bnRheCxcbiAgICAgICAgICAgICAgICAgICAgY2xvc3VyZSxcbiAgICAgICAgICAgICAgICAgICAgbWF0Y2hlcjogY2xvc3VyZS5tYXRjaGVyIHx8IChtYXRjaGVycyAmJiBtYXRjaGVycy5jbG9zdXJlKSB8fCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgIGhpbnRlcixcbiAgICAgICAgICAgICAgICAgICAgcHVuY3R1YXRvcixcbiAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICBpZiAob3BlbmVkKSB7XG4gICAgICAgICAgICAvLyBhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCBvcGVuZWQpO1xuICAgICAgICAgICAgZ3JvdXBpbmcuZ3JvdXBlcnNbZ3JvdXBdIHx8IChncm91cGluZy5ncm91cGVyc1tncm91cF0gPSBncm91cGVyID0gb3BlbmVkKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdyb3VwaW5ncy5wdXNoKGdyb3VwZXIpLCBncm91cGluZy5oaW50cy5hZGQoaGludGVyKTtcbiAgICAgICAgICAgIGdyb3VwaW5nLmdvYWwgPSAoZ3JvdXBlciAmJiBncm91cGVyLmdvYWwpIHx8IHN5bnRheDtcbiAgICAgICAgICAgIHBhcmVudCA9IG5leHQ7XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RhdGUuY29udGV4dCA9IGdyb3VwaW5nLmNvbnRleHQgPSBncm91cGluZy5nb2FsIHx8IHN5bnRheDtcblxuICAgICAgICBpZiAob3BlbmVkIHx8IGNsb3NlZCkge1xuICAgICAgICAgICRjb250ZXh0ID0gJGNvbnRleHRpbmcubmV4dCgoc3RhdGUuZ3JvdXBlciA9IGdyb3VwZXIgfHwgdW5kZWZpbmVkKSkudmFsdWU7XG4gICAgICAgICAgZ3JvdXBpbmcuaGludCA9IGAke1suLi5ncm91cGluZy5oaW50c10uam9pbignICcpfSAke1xuICAgICAgICAgICAgZ3JvdXBpbmcuY29udGV4dCA/IGBpbi0ke2dyb3VwaW5nLmNvbnRleHR9YCA6ICcnXG4gICAgICAgICAgfWA7XG4gICAgICAgICAgb3BlbmVkICYmIChhZnRlciA9IG9wZW5lZC5vcGVuICYmIG9wZW5lZC5vcGVuKG5leHQsIHN0YXRlLCAkY29udGV4dCkpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEN1cnJlbnQgY29udGV4dHVhbCB0YWlsIHRva2VuICh5aWVsZCBmcm9tIHNlcXVlbmNlKVxuICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCk7XG5cbiAgICAgIC8vIE5leHQgcmVmZXJlbmNlIHRvIGxhc3QgY29udGV4dHVhbCBzZXF1ZW5jZSB0b2tlblxuICAgICAgbmV4dCAmJiAhd2hpdGVzcGFjZSAmJiBmb3JtaW5nICYmIChsYXN0ID0gbmV4dCk7XG5cbiAgICAgIGlmIChhZnRlcikge1xuICAgICAgICBsZXQgdG9rZW5zLCB0b2tlbiwgbmV4dEluZGV4OyAvLyAgPSBhZnRlci5lbmQgfHwgYWZ0ZXIuaW5kZXhcblxuICAgICAgICBpZiAoYWZ0ZXIuc3ludGF4KSB7XG4gICAgICAgICAgY29uc3Qge3N5bnRheCwgb2Zmc2V0LCBpbmRleH0gPSBhZnRlcjtcbiAgICAgICAgICBjb25zdCBib2R5ID0gaW5kZXggPiBvZmZzZXQgJiYgc291cmNlLnNsaWNlKG9mZnNldCwgaW5kZXggLSAxKTtcbiAgICAgICAgICBpZiAoYm9keSkge1xuICAgICAgICAgICAgYm9keS5sZW5ndGggPiAwICYmXG4gICAgICAgICAgICAgICgodG9rZW5zID0gdG9rZW5pemUoYm9keSwge29wdGlvbnM6IHtzeW50YXh9fSwgZGVmYXVsdHMpKSwgKG5leHRJbmRleCA9IGluZGV4KSk7XG4gICAgICAgICAgICBjb25zdCBoaW50ID0gYCR7c3ludGF4fS1pbi0keyQuc3ludGF4fWA7XG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuID0+IChcbiAgICAgICAgICAgICAgKHRva2VuLmhpbnQgPSBgJHsodG9rZW4uaGludCAmJiBgJHt0b2tlbi5oaW50fSBgKSB8fCAnJ30ke2hpbnR9YCksIHRva2VuXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmIChhZnRlci5sZW5ndGgpIHtcbiAgICAgICAgICBjb25zdCBoaW50ID0gZ3JvdXBpbmcuaGludDtcbiAgICAgICAgICB0b2tlbiA9IHRva2VuID0+IChcbiAgICAgICAgICAgICh0b2tlbi5oaW50ID0gYCR7aGludH0gJHt0b2tlbi50eXBlIHx8ICdjb2RlJ31gKSwgJGNvbnRleHQudG9rZW4odG9rZW4pXG4gICAgICAgICAgKTtcbiAgICAgICAgICAodG9rZW5zID0gYWZ0ZXIpLmVuZCAmJiAobmV4dEluZGV4ID0gYWZ0ZXIuZW5kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0b2tlbnMpIHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7dG9rZW4sIHRva2VucywgbmV4dEluZGV4fSk7XG4gICAgICAgICAgZm9yIChjb25zdCBuZXh0IG9mIHRva2Vucykge1xuICAgICAgICAgICAgcHJldmlvdXMgJiYgKChuZXh0LnByZXZpb3VzID0gcHJldmlvdXMpLm5leHQgPSBuZXh0KTtcbiAgICAgICAgICAgIHRva2VuICYmIHRva2VuKG5leHQpO1xuICAgICAgICAgICAgeWllbGQgKHByZXZpb3VzID0gbmV4dCk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIG5leHRJbmRleCA+IGluZGV4ICYmIChzdGF0ZS5pbmRleCA9IG5leHRJbmRleCk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIChuZXh0LnB1bmN0dWF0b3IgPSBwdW5jdHVhdG9yID1cbi8vICAgKGNsb3N1cmUub3BlbiAmJlxuLy8gICAgIGNsb3N1cmUub3BlbihuZXh0LCBzdGF0ZSwgcHJldmlvdXMpICYmXG4vLyAgICAgKG5leHQucHVuY3R1YXRvciB8fCBwdW5jdHVhdG9yKSkgfHxcbi8vICAgJ29wZW5lcicpIHx8XG4vLyAobmV4dC5wdW5jdHVhdG9yID0gcHVuY3R1YXRvciA9XG4vLyAgIChjbG9zdXJlLm9wZW4gJiYgY2xvc3VyZS5vcGVuKG5leHQsIHN0YXRlLCBwcmV2aW91cykpIHx8ICdvcGVuZXInKSB8fFxuLy8gaWYgKGJvZHkuc3ludGF4ICYmIGJvZHkudGV4dCkge1xuLy8gICBjb25zdCB7c3ludGF4LCB0ZXh0fSA9IGJvZHk7XG4vLyAgIGNvbnN0IHN0YXRlID0ge29wdGlvbnM6IHtzeW50YXh9fTtcbi8vICAgY29uc3QgdG9rZW5zID0gdG9rZW5pemUodGV4dCwgc3RhdGUsIGRlZmF1bHRzKTtcbi8vICAgZm9yIChjb25zdCB0b2tlbiBvZiB0b2tlbnMpIHlpZWxkIHRva2VuO1xuLy8gfVxuXG4vLyBjb25zdCBhZ2dyZWdhdGUgPVxuLy8gICBhc3NpZ25lcnMgfHwgY29tYmluYXRvcnNcbi8vICAgICA/ICgoLi4uYWdncmVnYXRvcnMpID0+IHtcbi8vICAgICAgICAgY29uc3QgYWdncmVnYXRlcyA9IHt9O1xuLy8gICAgICAgICBpZiAoYWdncmVnYXRvcnMubGVuZ3RoKSB7XG4vLyAgICAgICAgICAgbGV0IGFnZ3JlZ2F0ZWQgPSAwO1xuLy8gICAgICAgICAgIGZvciAoY29uc3QgYWdncmVnYXRlIG9mIGFnZ3JlZ2F0b3JzKVxuLy8gICAgICAgICAgICAgaWYgKGFnZ3JlZ2F0ZSlcbi8vICAgICAgICAgICAgICAgZm9yIChjb25zdCBzeW1ib2wgb2YgYWdncmVnYXRlWzFdKVxuLy8gICAgICAgICAgICAgICAgICFzeW1ib2wgfHxcbi8vICAgICAgICAgICAgICAgICAgIGFnZ3JlZ2F0ZXNbc3ltYm9sXSB8fFxuLy8gICAgICAgICAgICAgICAgICAgKChhZ2dyZWdhdGVzW3N5bWJvbF0gPSBhZ2dyZWdhdGVbMF0pLCBhZ2dyZWdhdGVkKyspO1xuLy8gICAgICAgICAgIGlmICghYWdncmVnYXRlZCkgcmV0dXJuIGZhbHNlO1xuLy8gICAgICAgICB9XG4vLyAgICAgICAgIGNvbnN0IGFnZ3JlZ2F0b3IgPSB0ZXh0ID0+IGFnZ3JlZ2F0ZXNbdGV4dF0gfHwgZmFsc2U7XG4vLyAgICAgICAgIGFnZ3JlZ2F0b3IuYWdncmVnYXRlcyA9IGFnZ3JlZ2F0ZXM7XG4vLyAgICAgICAgIHJldHVybiBhZ2dyZWdhdG9yO1xuLy8gICAgICAgfSkoXG4vLyAgICAgICAgIGFzc2lnbmVycyAmJiAoYXNzaWduZXJzLnNpemUgPiAwIHx8IGFzc2lnbmVycy5sZW5ndGggPiAwKSAmJiBbJ2Fzc2lnbmVyJywgYXNzaWduZXJzXSxcbi8vICAgICAgICAgY29tYmluYXRvcnMgJiZcbi8vICAgICAgICAgICAoY29tYmluYXRvcnMuc2l6ZSA+IDAgfHwgY29tYmluYXRvcnMubGVuZ3RoID4gMCkgJiYgWydjb21iaW5hdG9yJywgY29tYmluYXRvcnNdLFxuLy8gICAgICAgKVxuLy8gICAgIDogZmFsc2U7XG4iLCIvLy8gSGVscGVyc1xuZXhwb3J0IGNvbnN0IHJhdyA9IFN0cmluZy5yYXc7XG5cbi8qKlxuICogQ3JlYXRlIGEgc2VxdWVuY2UgbWF0Y2ggZXhwcmVzc2lvbiBmcm9tIHBhdHRlcm5zLlxuICpcbiAqIEBwYXJhbSAgey4uLlBhdHRlcm59IHBhdHRlcm5zXG4gKi9cbmV4cG9ydCBjb25zdCBzZXF1ZW5jZSA9ICguLi5wYXR0ZXJucykgPT5cbiAgbmV3IFJlZ0V4cChSZWZsZWN0LmFwcGx5KHJhdywgbnVsbCwgcGF0dGVybnMubWFwKHAgPT4gKHAgJiYgcC5zb3VyY2UpIHx8IHAgfHwgJycpKSwgJ2cnKTtcblxuLyoqXG4gKiBDcmVhdGUgYSBtYXliZUlkZW50aWZpZXIgdGVzdCAoaWUgWzxmaXJzdD5dWzxvdGhlcj5dKikgZXhwcmVzc2lvbi5cbiAqXG4gKiBAcGFyYW0gIHtFbnRpdHl9IGZpcnN0IC0gVmFsaWQgXls84oCmPl0gZW50aXR5XG4gKiBAcGFyYW0gIHtFbnRpdHl9IG90aGVyIC0gVmFsaWQgWzzigKY+XSokIGVudGl0eVxuICogQHBhcmFtICB7c3RyaW5nfSBbZmxhZ3NdIC0gUmVnRXhwIGZsYWdzIChkZWZhdWx0cyB0byAndScpXG4gKiBAcGFyYW0gIHt1bmtub3dufSBbYm91bmRhcnldXG4gKi9cbmV4cG9ydCBjb25zdCBpZGVudGlmaWVyID0gKFxuICBmaXJzdCxcbiAgb3RoZXIgPSBmaXJzdCxcbiAgZmxhZ3MgPSAndScsXG4gIGJvdW5kYXJ5ID0gL3lnLy50ZXN0KGZsYWdzKSAmJiAnXFxcXGInLFxuKSA9PiBuZXcgUmVnRXhwKGAke2JvdW5kYXJ5IHx8ICdeJ31bJHtmaXJzdH1dWyR7b3RoZXJ9XSoke2JvdW5kYXJ5IHx8ICckJ31gLCBmbGFncyk7XG5cbi8qKlxuICogQ3JlYXRlIGEgc2VxdWVuY2UgcGF0dGVybiBmcm9tIHBhdHRlcm5zLlxuICpcbiAqIEBwYXJhbSAgey4uLlBhdHRlcm59IHBhdHRlcm5zXG4gKi9cbmV4cG9ydCBjb25zdCBhbGwgPSAoLi4ucGF0dGVybnMpID0+IHBhdHRlcm5zLm1hcChwID0+IChwICYmIHAuZXhlYyA/IHAuc291cmNlIDogcCkpLmpvaW4oJ3wnKTtcblxuLy8vIFN5bWJvbHNcblxuZXhwb3J0IGNsYXNzIFN5bWJvbHMgZXh0ZW5kcyBTZXQge1xuICBzdGF0aWMgZnJvbSguLi5zb3VyY2VzKSB7XG4gICAgY29uc3QgU3BlY2llcyA9IHRoaXMgfHwgU3ltYm9scztcbiAgICBjb25zdCBzeW1ib2xzID0gKHNvdXJjZXMubGVuZ3RoICYmIFNwZWNpZXMuc3BsaXQoc291cmNlcykpIHx8IFtdO1xuICAgIHJldHVybiBuZXcgU3BlY2llcyhzeW1ib2xzKTtcbiAgfVxuXG4gIGdldChzeW1ib2wpIHtcbiAgICBpZiAodGhpcy5oYXMoc3ltYm9sKSkgcmV0dXJuIHN5bWJvbDtcbiAgfVxuXG4gIHN0YXRpYyBzcGxpdCguLi5zb3VyY2VzKSB7XG4gICAgY29uc3QgU3BlY2llcyA9IHRoaXMgfHwgU3ltYm9scztcbiAgICBjb25zdCBzeW1ib2xzID0gW107XG4gICAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcy5mbGF0KCkpIHtcbiAgICAgIHNvdXJjZSAmJlxuICAgICAgICAodHlwZW9mIHNvdXJjZSA9PT0gJ3N0cmluZydcbiAgICAgICAgICA/IHN5bWJvbHMucHVzaCguLi5zb3VyY2Uuc3BsaXQoLyArLykpXG4gICAgICAgICAgOiBTeW1ib2wuaXRlcmF0b3IgaW4gc291cmNlICYmIHN5bWJvbHMucHVzaCguLi5TcGVjaWVzLnNwbGl0KC4uLnNvdXJjZSkpKTtcbiAgICB9XG4gICAgcmV0dXJuIHN5bWJvbHM7XG4gIH1cbn1cblxue1xuICBjb25zdCB7aGFzfSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKFNldC5wcm90b3R5cGUpO1xuICBjb25zdCB7bWFwfSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKEFycmF5LnByb3RvdHlwZSk7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKFN5bWJvbHMucHJvdG90eXBlLCB7aW5jbHVkZXM6IGhhcywgbWFwfSk7XG59XG5cbi8vLyBDbG9zdXJlc1xuXG5leHBvcnQgY2xhc3MgQ2xvc3VyZSBleHRlbmRzIFN0cmluZyB7XG4gIGNvbnN0cnVjdG9yKG9wZW5lciwgY2xvc2VyID0gb3BlbmVyKSB7XG4gICAgaWYgKCFvcGVuZXIgfHwgIWNsb3NlcikgdGhyb3cgRXJyb3IoYENhbm5vdCBjb25zdHJ1Y3QgY2xvc3VyZSBmcm9tIFwiJHtvcGVuZXJ9XCIg4oCmIFwiJHtjbG9zZXJ9XCJgKTtcbiAgICBzdXBlcihgJHtvcGVuZXJ94oCmJHtjbG9zZXJ9YCk7XG4gICAgdGhpcy5vcGVuZXIgPSBvcGVuZXI7XG4gICAgdGhpcy5jbG9zZXIgPSBjbG9zZXI7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIENsb3N1cmVzIGV4dGVuZHMgTWFwIHtcbiAgc3RhdGljIGZyb20oLi4uc291cmNlcykge1xuICAgIGNvbnN0IFNwZWNpZXMgPSB0aGlzIHx8IENsb3N1cmVzO1xuICAgIGNvbnN0IGNsb3N1cmVzID0gKHNvdXJjZXMubGVuZ3RoICYmIFNwZWNpZXMuc3BsaXQoc291cmNlcykpIHx8IFtdO1xuICAgIHJldHVybiBuZXcgU3BlY2llcyhjbG9zdXJlcyk7XG4gIH1cbiAgc3RhdGljIHNwbGl0KC4uLnNvdXJjZXMpIHtcbiAgICBjb25zdCBTcGVjaWVzID0gdGhpcyB8fCBDbG9zdXJlcztcbiAgICBjb25zdCBNZW1iZXIgPSBTcGVjaWVzLkVsZW1lbnQgfHwgQ2xvc3VyZTtcbiAgICBjb25zdCBjbG9zdXJlcyA9IFtdO1xuICAgIGZvciAoY29uc3Qgc291cmNlIG9mIHNvdXJjZXMuZmxhdCgpKSB7XG4gICAgICBpZiAoc291cmNlKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZW9mIHNvdXJjZSkge1xuICAgICAgICAgIGNhc2UgJ29iamVjdCc6IHtcbiAgICAgICAgICAgIGlmIChzb3VyY2UgaW5zdGFuY2VvZiBNZW1iZXIpIHtcbiAgICAgICAgICAgICAgY2xvc3VyZXMucHVzaChbc291cmNlLm9wZW5lciwgc291cmNlXSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHNvdXJjZSBpbnN0YW5jZW9mIFNwZWNpZXMpIHtcbiAgICAgICAgICAgICAgY2xvc3VyZXMucHVzaCguLi5zb3VyY2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNhc2UgJ3N0cmluZyc6IHtcbiAgICAgICAgICAgIGZvciAoY29uc3QgcGFpciBvZiBzb3VyY2Uuc3BsaXQoLyAqPyhbXiBdK+KAplteIF0rfFteIOKApl0rKSAqPy8pKSB7XG4gICAgICAgICAgICAgIGlmICghcGFpcikgY29udGludWU7XG4gICAgICAgICAgICAgIGNvbnN0IFtvcGVuZXIsIGNsb3Nlcl0gPSBwYWlyLnNwbGl0KCfigKYnKTtcbiAgICAgICAgICAgICAgY29uc3QgY2xvc3VyZSA9IG5ldyBNZW1iZXIob3BlbmVyLCBjbG9zZXIpO1xuICAgICAgICAgICAgICBjbG9zdXJlcy5wdXNoKFtvcGVuZXIsIGNsb3N1cmVdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY2xvc3VyZXM7XG4gIH1cbn1cblxue1xuICBjb25zdCB7aGFzfSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JzKE1hcC5wcm90b3R5cGUpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhDbG9zdXJlcy5wcm90b3R5cGUsIHtpbmNsdWRlczogaGFzfSk7XG59XG5cbi8vIGV4cG9ydCBjb25zdCBTeW1ib2xzID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KFxuLy8gICBzb3VyY2UgPT5cbi8vICAgICAoc291cmNlICYmXG4vLyAgICAgICAoKHR5cGVvZiBzb3VyY2UgPT09ICdzdHJpbmcnICYmIHNvdXJjZS5zcGxpdCgvICsvKSkgfHxcbi8vICAgICAgICAgKFN5bWJvbC5pdGVyYXRvciBpbiBzb3VyY2UgJiYgWy4uLnNvdXJjZV0pKSkgfHxcbi8vICAgICBbXSxcbi8vICAgJ2Zyb20nLFxuLy8gICB7dmFsdWU6ICguLi5hcmdzKSA9PiBbLi4ubmV3IFNldChbXS5jb25jYXQoLi4uYXJncy5tYXAoU3ltYm9scykpKV19LFxuLy8gKTtcbi8vIGV4cG9ydCBjb25zdCBTeW1ib2xzID0gT2JqZWN0LmRlZmluZVByb3BlcnR5KHNvdXJjZSA9PiBTeW1ib2xzLmZyb20oc291cmNlKSwgJ2Zyb20nLCB7XG4vLyAgIHZhbHVlOiAoLi4uYXJncykgPT4gU3ltYm9scy5mcm9tKC4uLmFyZ3MpLFxuLy8gfSk7XG5cbi8vIGV4cG9ydCBjb25zdCBjbG9zdXJlcyA9IHN0cmluZyA9PiB7XG4vLyAgIGNvbnN0IHBhaXJzID0gU3ltYm9scy5mcm9tKHN0cmluZyk7XG4vLyAgIGNvbnN0IGFycmF5ID0gbmV3IEFycmF5KHBhaXJzLnNpemUpO1xuLy8gICBjb25zdCBlbnRyaWVzID0ge307XG4vLyAgIGFycmF5LnBhaXJzID0gcGFpcnM7XG4vLyAgIGxldCBpID0gMDtcbi8vICAgZm9yIChjb25zdCBwYWlyIG9mIHBhaXJzKSB7XG4vLyAgICAgY29uc3QgW29wZW5lciwgY2xvc2VyXSA9IHBhaXIuc3BsaXQoJ+KApicpO1xuLy8gICAgIC8vIGFycmF5WyhhcnJheVtpKytdID0gb3BlbmVyKV0gPSB7b3BlbmVyLCBjbG9zZXJ9O1xuLy8gICAgIGVudHJpZXNbKGFycmF5W2krK10gPSBvcGVuZXIpXSA9IHtvcGVuZXIsIGNsb3Nlcn07XG4vLyAgIH1cbi8vICAgYXJyYXkuZ2V0ID0gb3BlbmVyID0+IGVudHJpZXNbb3BlbmVyXTtcbi8vICAgYXJyYXkudG9TdHJpbmcgPSAoKSA9PiBzdHJpbmc7XG4vLyAgIHJldHVybiBhcnJheTtcbi8vIH07XG5cbi8vIGV4cG9ydCBjb25zdCBsaW5lcyA9IHN0cmluZyA9PiBzdHJpbmcuc3BsaXQoL1xcbisvKSxcbiIsIi8qKiBAdHlwZWRlZiB7UmVnRXhwfHN0cmluZ30gUGF0dGVybiAtIFZhbGlkIC8o4oCmKS8gc3ViIGV4cHJlc3Npb24gKi9cbi8qKiBAdHlwZWRlZiB7c3RyaW5nfHtzb3VyY2U6IHN0cmluZ319IEVudGl0eSAtIFZhbGlkIC9b4oCmXS8gc3ViIGV4cHJlc3Npb24gKi9cblxuZXhwb3J0IHtwYXR0ZXJuc30gZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcbmltcG9ydCB7cmF3fSBmcm9tICcuL2hlbHBlcnMuanMnO1xuXG4vLy8gRW50aXRpZXNcblxuLyoqXG4gKiBUaGUgY29sbGVjdGlvbiBvZiBSZWd1bGFyIEV4cHJlc3Npb25zIHVzZWQgdG8gbWF0Y2ggc3BlY2lmaWNcbiAqIG1hcmt1cCBzZXF1ZW5jZXMgaW4gYSBnaXZlbiBjb250ZXh0IG9yIHRvIHRlc3QgbWF0Y2hlZCBzZXF1ZW5jZXMgdmVyYm9zZWx5XG4gKiBpbiBvcmRlciB0byBmdXJ0aGVyIGNhdGVnb3JpemUgdGhlbS4gRnVsbCBzdXBwb3J0IGZvciBVbmljb2RlIENsYXNzZXMgYW5kXG4gKiBQcm9wZXJ0aWVzIGhhcyBiZWVuIGluY2x1ZGVkIGluIHRoZSBFQ01BU2NyaXB0IHNwZWNpZmljYXRpb24gYnV0IGNlcnRhaW5cbiAqIGVuZ2luZXMgYXJlIHN0aWxsIGltcGxlbWVudGluZyB0aGVtLlxuICpcbiAqIEB0eXBlIHt7W25hbWU6IHN0cmluZ106IHtbbmFtZTogc3RyaW5nXTogRW50aXR5fX19XG4gKi9cbmV4cG9ydCBjb25zdCBlbnRpdGllcyA9IHtcbiAgZXM6IHtcbiAgICAvKiogaHR0cDovL3d3dy5lY21hLWludGVybmF0aW9uYWwub3JnL2VjbWEtMjYyLzkuMC8jcHJvZC1JZGVudGlmaWVyU3RhcnQgKi9cbiAgICBJZGVudGlmaWVyU3RhcnQ6IHJhd2BfJFxccHtJRF9TdGFydH1gLFxuICAgIC8qKiBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvOS4wLyNwcm9kLUlkZW50aWZpZXJQYXJ0ICovXG4gICAgSWRlbnRpZmllclBhcnQ6IHJhd2BfJFxcdTIwMGNcXHUyMDBkXFxwe0lEX0NvbnRpbnVlfWAsXG4gIH0sXG59O1xuXG4vKiogSW50ZXJvcGVyYWJpbGl0eSAoZm9yIHNvbWUgYnJvd3NlcnMpICovXG4oUmFuZ2VzID0+IHtcbiAgY29uc3QgdHJhbnNmb3JtcyA9IFtdO1xuXG4gIGlmICghc3VwcG9ydHMocmF3YFxccHtJRF9TdGFydH1gLCAndScpKSB7XG4gICAgY29uc3QgVW5pY29kZVByb3BlcnR5RXNjYXBlcyA9IC9cXFxccHsgKihcXHcrKSAqfS9nO1xuICAgIFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMucmVwbGFjZSA9IChtLCBwcm9wZXJ0eUtleSkgPT4ge1xuICAgICAgaWYgKHByb3BlcnR5S2V5IGluIFJhbmdlcykgcmV0dXJuIFJhbmdlc1twcm9wZXJ0eUtleV0udG9TdHJpbmcoKTtcbiAgICAgIHRocm93IFJhbmdlRXJyb3IoYENhbm5vdCByZXdyaXRlIHVuaWNvZGUgcHJvcGVydHkgXCIke3Byb3BlcnR5S2V5fVwiYCk7XG4gICAgfTtcbiAgICB0cmFuc2Zvcm1zLnB1c2goZXhwcmVzc2lvbiA9PiB7XG4gICAgICBsZXQgZmxhZ3MgPSBleHByZXNzaW9uICYmIGV4cHJlc3Npb24uZmxhZ3M7XG4gICAgICBsZXQgc291cmNlID0gZXhwcmVzc2lvbiAmJiBgJHtleHByZXNzaW9uLnNvdXJjZSB8fCBleHByZXNzaW9uIHx8ICcnfWA7XG4gICAgICBzb3VyY2UgJiZcbiAgICAgICAgVW5pY29kZVByb3BlcnR5RXNjYXBlcy50ZXN0KHNvdXJjZSkgJiZcbiAgICAgICAgKHNvdXJjZSA9IHNvdXJjZS5yZXBsYWNlKFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMsIFVuaWNvZGVQcm9wZXJ0eUVzY2FwZXMucmVwbGFjZSkpO1xuICAgICAgcmV0dXJuIChmbGFncyAmJiBuZXcgUmVnRXhwKHNvdXJjZSwgZmxhZ3MpKSB8fCBzb3VyY2U7XG4gICAgfSk7XG4gIH1cblxuICBpZiAoIXRyYW5zZm9ybXMubGVuZ3RoKSByZXR1cm47XG5cbiAgZm9yIChjb25zdCBrZXkgaW4gZW50aXRpZXMpIHtcbiAgICBjb25zdCBzb3VyY2VzID0gZW50aXRpZXNba2V5XTtcbiAgICBjb25zdCBjaGFuZ2VzID0ge307XG4gICAgZm9yIChjb25zdCBpZCBpbiBzb3VyY2VzKSB7XG4gICAgICBsZXQgc291cmNlID0gc291cmNlc1tpZF07XG4gICAgICBpZiAoIXNvdXJjZSB8fCB0eXBlb2Ygc291cmNlICE9PSAnc3RyaW5nJykgY29udGludWU7XG4gICAgICBmb3IgKGNvbnN0IHRyYW5zZm9ybSBvZiB0cmFuc2Zvcm1zKSBzb3VyY2UgPSB0cmFuc2Zvcm0oc291cmNlKTtcbiAgICAgICFzb3VyY2UgfHwgc291cmNlID09PSBzb3VyY2VzW2lkXSB8fCAoY2hhbmdlc1tpZF0gPSBzb3VyY2UpO1xuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKHNvdXJjZXMsIGNoYW5nZXMpO1xuICB9XG5cbiAgLy8gcHJldHRpZXItaWdub3JlXG4gIGZ1bmN0aW9uIHN1cHBvcnRzKCkge3RyeSB7cmV0dXJuICEhUmVnRXhwKC4uLiBhcmd1bWVudHMpfSBjYXRjaCAoZSkgeyB9fVxufSkoe1xuICBJRF9TdGFydDogcmF3YGEtekEtWlxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjYCxcbiAgSURfQ29udGludWU6IHJhd2BhLXpBLVowLTlcXHhhYVxceGI1XFx4YmFcXHhjMC1cXHhkNlxceGQ4LVxceGY2XFx4ZjgtXFx1MDJjMVxcdTAyYzYtXFx1MDJkMVxcdTAyZTAtXFx1MDJlNFxcdTAyZWNcXHUwMmVlXFx1MDM3MC1cXHUwMzc0XFx1MDM3NlxcdTAzNzdcXHUwMzdhLVxcdTAzN2RcXHUwMzdmXFx1MDM4NlxcdTAzODgtXFx1MDM4YVxcdTAzOGNcXHUwMzhlLVxcdTAzYTFcXHUwM2EzLVxcdTAzZjVcXHUwM2Y3LVxcdTA0ODFcXHUwNDhhLVxcdTA1MmZcXHUwNTMxLVxcdTA1NTZcXHUwNTU5XFx1MDU2MC1cXHUwNTg4XFx1MDVkMC1cXHUwNWVhXFx1MDVlZi1cXHUwNWYyXFx1MDYyMC1cXHUwNjRhXFx1MDY2ZVxcdTA2NmZcXHUwNjcxLVxcdTA2ZDNcXHUwNmQ1XFx1MDZlNVxcdTA2ZTZcXHUwNmVlXFx1MDZlZlxcdTA2ZmEtXFx1MDZmY1xcdTA2ZmZcXHUwNzEwXFx1MDcxMi1cXHUwNzJmXFx1MDc0ZC1cXHUwN2E1XFx1MDdiMVxcdTA3Y2EtXFx1MDdlYVxcdTA3ZjRcXHUwN2Y1XFx1MDdmYVxcdTA4MDAtXFx1MDgxNVxcdTA4MWFcXHUwODI0XFx1MDgyOFxcdTA4NDAtXFx1MDg1OFxcdTA4NjAtXFx1MDg2YVxcdTA4YTAtXFx1MDhiNFxcdTA4YjYtXFx1MDhiZFxcdTA5MDQtXFx1MDkzOVxcdTA5M2RcXHUwOTUwXFx1MDk1OC1cXHUwOTYxXFx1MDk3MS1cXHUwOTgwXFx1MDk4NS1cXHUwOThjXFx1MDk4ZlxcdTA5OTBcXHUwOTkzLVxcdTA5YThcXHUwOWFhLVxcdTA5YjBcXHUwOWIyXFx1MDliNi1cXHUwOWI5XFx1MDliZFxcdTA5Y2VcXHUwOWRjXFx1MDlkZFxcdTA5ZGYtXFx1MDllMVxcdTA5ZjBcXHUwOWYxXFx1MDlmY1xcdTBhMDUtXFx1MGEwYVxcdTBhMGZcXHUwYTEwXFx1MGExMy1cXHUwYTI4XFx1MGEyYS1cXHUwYTMwXFx1MGEzMlxcdTBhMzNcXHUwYTM1XFx1MGEzNlxcdTBhMzhcXHUwYTM5XFx1MGE1OS1cXHUwYTVjXFx1MGE1ZVxcdTBhNzItXFx1MGE3NFxcdTBhODUtXFx1MGE4ZFxcdTBhOGYtXFx1MGE5MVxcdTBhOTMtXFx1MGFhOFxcdTBhYWEtXFx1MGFiMFxcdTBhYjJcXHUwYWIzXFx1MGFiNS1cXHUwYWI5XFx1MGFiZFxcdTBhZDBcXHUwYWUwXFx1MGFlMVxcdTBhZjlcXHUwYjA1LVxcdTBiMGNcXHUwYjBmXFx1MGIxMFxcdTBiMTMtXFx1MGIyOFxcdTBiMmEtXFx1MGIzMFxcdTBiMzJcXHUwYjMzXFx1MGIzNS1cXHUwYjM5XFx1MGIzZFxcdTBiNWNcXHUwYjVkXFx1MGI1Zi1cXHUwYjYxXFx1MGI3MVxcdTBiODNcXHUwYjg1LVxcdTBiOGFcXHUwYjhlLVxcdTBiOTBcXHUwYjkyLVxcdTBiOTVcXHUwYjk5XFx1MGI5YVxcdTBiOWNcXHUwYjllXFx1MGI5ZlxcdTBiYTNcXHUwYmE0XFx1MGJhOC1cXHUwYmFhXFx1MGJhZS1cXHUwYmI5XFx1MGJkMFxcdTBjMDUtXFx1MGMwY1xcdTBjMGUtXFx1MGMxMFxcdTBjMTItXFx1MGMyOFxcdTBjMmEtXFx1MGMzOVxcdTBjM2RcXHUwYzU4LVxcdTBjNWFcXHUwYzYwXFx1MGM2MVxcdTBjODBcXHUwYzg1LVxcdTBjOGNcXHUwYzhlLVxcdTBjOTBcXHUwYzkyLVxcdTBjYThcXHUwY2FhLVxcdTBjYjNcXHUwY2I1LVxcdTBjYjlcXHUwY2JkXFx1MGNkZVxcdTBjZTBcXHUwY2UxXFx1MGNmMVxcdTBjZjJcXHUwZDA1LVxcdTBkMGNcXHUwZDBlLVxcdTBkMTBcXHUwZDEyLVxcdTBkM2FcXHUwZDNkXFx1MGQ0ZVxcdTBkNTQtXFx1MGQ1NlxcdTBkNWYtXFx1MGQ2MVxcdTBkN2EtXFx1MGQ3ZlxcdTBkODUtXFx1MGQ5NlxcdTBkOWEtXFx1MGRiMVxcdTBkYjMtXFx1MGRiYlxcdTBkYmRcXHUwZGMwLVxcdTBkYzZcXHUwZTAxLVxcdTBlMzBcXHUwZTMyXFx1MGUzM1xcdTBlNDAtXFx1MGU0NlxcdTBlODFcXHUwZTgyXFx1MGU4NFxcdTBlODdcXHUwZTg4XFx1MGU4YVxcdTBlOGRcXHUwZTk0LVxcdTBlOTdcXHUwZTk5LVxcdTBlOWZcXHUwZWExLVxcdTBlYTNcXHUwZWE1XFx1MGVhN1xcdTBlYWFcXHUwZWFiXFx1MGVhZC1cXHUwZWIwXFx1MGViMlxcdTBlYjNcXHUwZWJkXFx1MGVjMC1cXHUwZWM0XFx1MGVjNlxcdTBlZGMtXFx1MGVkZlxcdTBmMDBcXHUwZjQwLVxcdTBmNDdcXHUwZjQ5LVxcdTBmNmNcXHUwZjg4LVxcdTBmOGNcXHUxMDAwLVxcdTEwMmFcXHUxMDNmXFx1MTA1MC1cXHUxMDU1XFx1MTA1YS1cXHUxMDVkXFx1MTA2MVxcdTEwNjVcXHUxMDY2XFx1MTA2ZS1cXHUxMDcwXFx1MTA3NS1cXHUxMDgxXFx1MTA4ZVxcdTEwYTAtXFx1MTBjNVxcdTEwYzdcXHUxMGNkXFx1MTBkMC1cXHUxMGZhXFx1MTBmYy1cXHUxMjQ4XFx1MTI0YS1cXHUxMjRkXFx1MTI1MC1cXHUxMjU2XFx1MTI1OFxcdTEyNWEtXFx1MTI1ZFxcdTEyNjAtXFx1MTI4OFxcdTEyOGEtXFx1MTI4ZFxcdTEyOTAtXFx1MTJiMFxcdTEyYjItXFx1MTJiNVxcdTEyYjgtXFx1MTJiZVxcdTEyYzBcXHUxMmMyLVxcdTEyYzVcXHUxMmM4LVxcdTEyZDZcXHUxMmQ4LVxcdTEzMTBcXHUxMzEyLVxcdTEzMTVcXHUxMzE4LVxcdTEzNWFcXHUxMzgwLVxcdTEzOGZcXHUxM2EwLVxcdTEzZjVcXHUxM2Y4LVxcdTEzZmRcXHUxNDAxLVxcdTE2NmNcXHUxNjZmLVxcdTE2N2ZcXHUxNjgxLVxcdTE2OWFcXHUxNmEwLVxcdTE2ZWFcXHUxNmVlLVxcdTE2ZjhcXHUxNzAwLVxcdTE3MGNcXHUxNzBlLVxcdTE3MTFcXHUxNzIwLVxcdTE3MzFcXHUxNzQwLVxcdTE3NTFcXHUxNzYwLVxcdTE3NmNcXHUxNzZlLVxcdTE3NzBcXHUxNzgwLVxcdTE3YjNcXHUxN2Q3XFx1MTdkY1xcdTE4MjAtXFx1MTg3OFxcdTE4ODAtXFx1MThhOFxcdTE4YWFcXHUxOGIwLVxcdTE4ZjVcXHUxOTAwLVxcdTE5MWVcXHUxOTUwLVxcdTE5NmRcXHUxOTcwLVxcdTE5NzRcXHUxOTgwLVxcdTE5YWJcXHUxOWIwLVxcdTE5YzlcXHUxYTAwLVxcdTFhMTZcXHUxYTIwLVxcdTFhNTRcXHUxYWE3XFx1MWIwNS1cXHUxYjMzXFx1MWI0NS1cXHUxYjRiXFx1MWI4My1cXHUxYmEwXFx1MWJhZVxcdTFiYWZcXHUxYmJhLVxcdTFiZTVcXHUxYzAwLVxcdTFjMjNcXHUxYzRkLVxcdTFjNGZcXHUxYzVhLVxcdTFjN2RcXHUxYzgwLVxcdTFjODhcXHUxYzkwLVxcdTFjYmFcXHUxY2JkLVxcdTFjYmZcXHUxY2U5LVxcdTFjZWNcXHUxY2VlLVxcdTFjZjFcXHUxY2Y1XFx1MWNmNlxcdTFkMDAtXFx1MWRiZlxcdTFlMDAtXFx1MWYxNVxcdTFmMTgtXFx1MWYxZFxcdTFmMjAtXFx1MWY0NVxcdTFmNDgtXFx1MWY0ZFxcdTFmNTAtXFx1MWY1N1xcdTFmNTlcXHUxZjViXFx1MWY1ZFxcdTFmNWYtXFx1MWY3ZFxcdTFmODAtXFx1MWZiNFxcdTFmYjYtXFx1MWZiY1xcdTFmYmVcXHUxZmMyLVxcdTFmYzRcXHUxZmM2LVxcdTFmY2NcXHUxZmQwLVxcdTFmZDNcXHUxZmQ2LVxcdTFmZGJcXHUxZmUwLVxcdTFmZWNcXHUxZmYyLVxcdTFmZjRcXHUxZmY2LVxcdTFmZmNcXHUyMDcxXFx1MjA3ZlxcdTIwOTAtXFx1MjA5Y1xcdTIxMDJcXHUyMTA3XFx1MjEwYS1cXHUyMTEzXFx1MjExNVxcdTIxMTgtXFx1MjExZFxcdTIxMjRcXHUyMTI2XFx1MjEyOFxcdTIxMmEtXFx1MjEzOVxcdTIxM2MtXFx1MjEzZlxcdTIxNDUtXFx1MjE0OVxcdTIxNGVcXHUyMTYwLVxcdTIxODhcXHUyYzAwLVxcdTJjMmVcXHUyYzMwLVxcdTJjNWVcXHUyYzYwLVxcdTJjZTRcXHUyY2ViLVxcdTJjZWVcXHUyY2YyXFx1MmNmM1xcdTJkMDAtXFx1MmQyNVxcdTJkMjdcXHUyZDJkXFx1MmQzMC1cXHUyZDY3XFx1MmQ2ZlxcdTJkODAtXFx1MmQ5NlxcdTJkYTAtXFx1MmRhNlxcdTJkYTgtXFx1MmRhZVxcdTJkYjAtXFx1MmRiNlxcdTJkYjgtXFx1MmRiZVxcdTJkYzAtXFx1MmRjNlxcdTJkYzgtXFx1MmRjZVxcdTJkZDAtXFx1MmRkNlxcdTJkZDgtXFx1MmRkZVxcdTMwMDUtXFx1MzAwN1xcdTMwMjEtXFx1MzAyOVxcdTMwMzEtXFx1MzAzNVxcdTMwMzgtXFx1MzAzY1xcdTMwNDEtXFx1MzA5NlxcdTMwOWItXFx1MzA5ZlxcdTMwYTEtXFx1MzBmYVxcdTMwZmMtXFx1MzBmZlxcdTMxMDUtXFx1MzEyZlxcdTMxMzEtXFx1MzE4ZVxcdTMxYTAtXFx1MzFiYVxcdTMxZjAtXFx1MzFmZlxcdTM0MDAtXFx1NGRiNVxcdTRlMDAtXFx1OWZlZlxcdWEwMDAtXFx1YTQ4Y1xcdWE0ZDAtXFx1YTRmZFxcdWE1MDAtXFx1YTYwY1xcdWE2MTAtXFx1YTYxZlxcdWE2MmFcXHVhNjJiXFx1YTY0MC1cXHVhNjZlXFx1YTY3Zi1cXHVhNjlkXFx1YTZhMC1cXHVhNmVmXFx1YTcxNy1cXHVhNzFmXFx1YTcyMi1cXHVhNzg4XFx1YTc4Yi1cXHVhN2I5XFx1YTdmNy1cXHVhODAxXFx1YTgwMy1cXHVhODA1XFx1YTgwNy1cXHVhODBhXFx1YTgwYy1cXHVhODIyXFx1YTg0MC1cXHVhODczXFx1YTg4Mi1cXHVhOGIzXFx1YThmMi1cXHVhOGY3XFx1YThmYlxcdWE4ZmRcXHVhOGZlXFx1YTkwYS1cXHVhOTI1XFx1YTkzMC1cXHVhOTQ2XFx1YTk2MC1cXHVhOTdjXFx1YTk4NC1cXHVhOWIyXFx1YTljZlxcdWE5ZTAtXFx1YTllNFxcdWE5ZTYtXFx1YTllZlxcdWE5ZmEtXFx1YTlmZVxcdWFhMDAtXFx1YWEyOFxcdWFhNDAtXFx1YWE0MlxcdWFhNDQtXFx1YWE0YlxcdWFhNjAtXFx1YWE3NlxcdWFhN2FcXHVhYTdlLVxcdWFhYWZcXHVhYWIxXFx1YWFiNVxcdWFhYjZcXHVhYWI5LVxcdWFhYmRcXHVhYWMwXFx1YWFjMlxcdWFhZGItXFx1YWFkZFxcdWFhZTAtXFx1YWFlYVxcdWFhZjItXFx1YWFmNFxcdWFiMDEtXFx1YWIwNlxcdWFiMDktXFx1YWIwZVxcdWFiMTEtXFx1YWIxNlxcdWFiMjAtXFx1YWIyNlxcdWFiMjgtXFx1YWIyZVxcdWFiMzAtXFx1YWI1YVxcdWFiNWMtXFx1YWI2NVxcdWFiNzAtXFx1YWJlMlxcdWFjMDAtXFx1ZDdhM1xcdWQ3YjAtXFx1ZDdjNlxcdWQ3Y2ItXFx1ZDdmYlxcdWY5MDAtXFx1ZmE2ZFxcdWZhNzAtXFx1ZmFkOVxcdWZiMDAtXFx1ZmIwNlxcdWZiMTMtXFx1ZmIxN1xcdWZiMWRcXHVmYjFmLVxcdWZiMjhcXHVmYjJhLVxcdWZiMzZcXHVmYjM4LVxcdWZiM2NcXHVmYjNlXFx1ZmI0MFxcdWZiNDFcXHVmYjQzXFx1ZmI0NFxcdWZiNDYtXFx1ZmJiMVxcdWZiZDMtXFx1ZmQzZFxcdWZkNTAtXFx1ZmQ4ZlxcdWZkOTItXFx1ZmRjN1xcdWZkZjAtXFx1ZmRmYlxcdWZlNzAtXFx1ZmU3NFxcdWZlNzYtXFx1ZmVmY1xcdWZmMjEtXFx1ZmYzYVxcdWZmNDEtXFx1ZmY1YVxcdWZmNjYtXFx1ZmZiZVxcdWZmYzItXFx1ZmZjN1xcdWZmY2EtXFx1ZmZjZlxcdWZmZDItXFx1ZmZkN1xcdWZmZGEtXFx1ZmZkY1xcdTIwMGNcXHUyMDBkXFx4YjdcXHUwMzAwLVxcdTAzNmZcXHUwMzg3XFx1MDQ4My1cXHUwNDg3XFx1MDU5MS1cXHUwNWJkXFx1MDViZlxcdTA1YzFcXHUwNWMyXFx1MDVjNFxcdTA1YzVcXHUwNWM3XFx1MDYxMC1cXHUwNjFhXFx1MDY0Yi1cXHUwNjY5XFx1MDY3MFxcdTA2ZDYtXFx1MDZkY1xcdTA2ZGYtXFx1MDZlNFxcdTA2ZTdcXHUwNmU4XFx1MDZlYS1cXHUwNmVkXFx1MDZmMC1cXHUwNmY5XFx1MDcxMVxcdTA3MzAtXFx1MDc0YVxcdTA3YTYtXFx1MDdiMFxcdTA3YzAtXFx1MDdjOVxcdTA3ZWItXFx1MDdmM1xcdTA3ZmRcXHUwODE2LVxcdTA4MTlcXHUwODFiLVxcdTA4MjNcXHUwODI1LVxcdTA4MjdcXHUwODI5LVxcdTA4MmRcXHUwODU5LVxcdTA4NWJcXHUwOGQzLVxcdTA4ZTFcXHUwOGUzLVxcdTA5MDNcXHUwOTNhLVxcdTA5M2NcXHUwOTNlLVxcdTA5NGZcXHUwOTUxLVxcdTA5NTdcXHUwOTYyXFx1MDk2M1xcdTA5NjYtXFx1MDk2ZlxcdTA5ODEtXFx1MDk4M1xcdTA5YmNcXHUwOWJlLVxcdTA5YzRcXHUwOWM3XFx1MDljOFxcdTA5Y2ItXFx1MDljZFxcdTA5ZDdcXHUwOWUyXFx1MDllM1xcdTA5ZTYtXFx1MDllZlxcdTA5ZmVcXHUwYTAxLVxcdTBhMDNcXHUwYTNjXFx1MGEzZS1cXHUwYTQyXFx1MGE0N1xcdTBhNDhcXHUwYTRiLVxcdTBhNGRcXHUwYTUxXFx1MGE2Ni1cXHUwYTcxXFx1MGE3NVxcdTBhODEtXFx1MGE4M1xcdTBhYmNcXHUwYWJlLVxcdTBhYzVcXHUwYWM3LVxcdTBhYzlcXHUwYWNiLVxcdTBhY2RcXHUwYWUyXFx1MGFlM1xcdTBhZTYtXFx1MGFlZlxcdTBhZmEtXFx1MGFmZlxcdTBiMDEtXFx1MGIwM1xcdTBiM2NcXHUwYjNlLVxcdTBiNDRcXHUwYjQ3XFx1MGI0OFxcdTBiNGItXFx1MGI0ZFxcdTBiNTZcXHUwYjU3XFx1MGI2MlxcdTBiNjNcXHUwYjY2LVxcdTBiNmZcXHUwYjgyXFx1MGJiZS1cXHUwYmMyXFx1MGJjNi1cXHUwYmM4XFx1MGJjYS1cXHUwYmNkXFx1MGJkN1xcdTBiZTYtXFx1MGJlZlxcdTBjMDAtXFx1MGMwNFxcdTBjM2UtXFx1MGM0NFxcdTBjNDYtXFx1MGM0OFxcdTBjNGEtXFx1MGM0ZFxcdTBjNTVcXHUwYzU2XFx1MGM2MlxcdTBjNjNcXHUwYzY2LVxcdTBjNmZcXHUwYzgxLVxcdTBjODNcXHUwY2JjXFx1MGNiZS1cXHUwY2M0XFx1MGNjNi1cXHUwY2M4XFx1MGNjYS1cXHUwY2NkXFx1MGNkNVxcdTBjZDZcXHUwY2UyXFx1MGNlM1xcdTBjZTYtXFx1MGNlZlxcdTBkMDAtXFx1MGQwM1xcdTBkM2JcXHUwZDNjXFx1MGQzZS1cXHUwZDQ0XFx1MGQ0Ni1cXHUwZDQ4XFx1MGQ0YS1cXHUwZDRkXFx1MGQ1N1xcdTBkNjJcXHUwZDYzXFx1MGQ2Ni1cXHUwZDZmXFx1MGQ4MlxcdTBkODNcXHUwZGNhXFx1MGRjZi1cXHUwZGQ0XFx1MGRkNlxcdTBkZDgtXFx1MGRkZlxcdTBkZTYtXFx1MGRlZlxcdTBkZjJcXHUwZGYzXFx1MGUzMVxcdTBlMzQtXFx1MGUzYVxcdTBlNDctXFx1MGU0ZVxcdTBlNTAtXFx1MGU1OVxcdTBlYjFcXHUwZWI0LVxcdTBlYjlcXHUwZWJiXFx1MGViY1xcdTBlYzgtXFx1MGVjZFxcdTBlZDAtXFx1MGVkOVxcdTBmMThcXHUwZjE5XFx1MGYyMC1cXHUwZjI5XFx1MGYzNVxcdTBmMzdcXHUwZjM5XFx1MGYzZVxcdTBmM2ZcXHUwZjcxLVxcdTBmODRcXHUwZjg2XFx1MGY4N1xcdTBmOGQtXFx1MGY5N1xcdTBmOTktXFx1MGZiY1xcdTBmYzZcXHUxMDJiLVxcdTEwM2VcXHUxMDQwLVxcdTEwNDlcXHUxMDU2LVxcdTEwNTlcXHUxMDVlLVxcdTEwNjBcXHUxMDYyLVxcdTEwNjRcXHUxMDY3LVxcdTEwNmRcXHUxMDcxLVxcdTEwNzRcXHUxMDgyLVxcdTEwOGRcXHUxMDhmLVxcdTEwOWRcXHUxMzVkLVxcdTEzNWZcXHUxMzY5LVxcdTEzNzFcXHUxNzEyLVxcdTE3MTRcXHUxNzMyLVxcdTE3MzRcXHUxNzUyXFx1MTc1M1xcdTE3NzJcXHUxNzczXFx1MTdiNC1cXHUxN2QzXFx1MTdkZFxcdTE3ZTAtXFx1MTdlOVxcdTE4MGItXFx1MTgwZFxcdTE4MTAtXFx1MTgxOVxcdTE4YTlcXHUxOTIwLVxcdTE5MmJcXHUxOTMwLVxcdTE5M2JcXHUxOTQ2LVxcdTE5NGZcXHUxOWQwLVxcdTE5ZGFcXHUxYTE3LVxcdTFhMWJcXHUxYTU1LVxcdTFhNWVcXHUxYTYwLVxcdTFhN2NcXHUxYTdmLVxcdTFhODlcXHUxYTkwLVxcdTFhOTlcXHUxYWIwLVxcdTFhYmRcXHUxYjAwLVxcdTFiMDRcXHUxYjM0LVxcdTFiNDRcXHUxYjUwLVxcdTFiNTlcXHUxYjZiLVxcdTFiNzNcXHUxYjgwLVxcdTFiODJcXHUxYmExLVxcdTFiYWRcXHUxYmIwLVxcdTFiYjlcXHUxYmU2LVxcdTFiZjNcXHUxYzI0LVxcdTFjMzdcXHUxYzQwLVxcdTFjNDlcXHUxYzUwLVxcdTFjNTlcXHUxY2QwLVxcdTFjZDJcXHUxY2Q0LVxcdTFjZThcXHUxY2VkXFx1MWNmMi1cXHUxY2Y0XFx1MWNmNy1cXHUxY2Y5XFx1MWRjMC1cXHUxZGY5XFx1MWRmYi1cXHUxZGZmXFx1MjAzZlxcdTIwNDBcXHUyMDU0XFx1MjBkMC1cXHUyMGRjXFx1MjBlMVxcdTIwZTUtXFx1MjBmMFxcdTJjZWYtXFx1MmNmMVxcdTJkN2ZcXHUyZGUwLVxcdTJkZmZcXHUzMDJhLVxcdTMwMmZcXHUzMDk5XFx1MzA5YVxcdWE2MjAtXFx1YTYyOVxcdWE2NmZcXHVhNjc0LVxcdWE2N2RcXHVhNjllXFx1YTY5ZlxcdWE2ZjBcXHVhNmYxXFx1YTgwMlxcdWE4MDZcXHVhODBiXFx1YTgyMy1cXHVhODI3XFx1YTg4MFxcdWE4ODFcXHVhOGI0LVxcdWE4YzVcXHVhOGQwLVxcdWE4ZDlcXHVhOGUwLVxcdWE4ZjFcXHVhOGZmLVxcdWE5MDlcXHVhOTI2LVxcdWE5MmRcXHVhOTQ3LVxcdWE5NTNcXHVhOTgwLVxcdWE5ODNcXHVhOWIzLVxcdWE5YzBcXHVhOWQwLVxcdWE5ZDlcXHVhOWU1XFx1YTlmMC1cXHVhOWY5XFx1YWEyOS1cXHVhYTM2XFx1YWE0M1xcdWFhNGNcXHVhYTRkXFx1YWE1MC1cXHVhYTU5XFx1YWE3Yi1cXHVhYTdkXFx1YWFiMFxcdWFhYjItXFx1YWFiNFxcdWFhYjdcXHVhYWI4XFx1YWFiZVxcdWFhYmZcXHVhYWMxXFx1YWFlYi1cXHVhYWVmXFx1YWFmNVxcdWFhZjZcXHVhYmUzLVxcdWFiZWFcXHVhYmVjXFx1YWJlZFxcdWFiZjAtXFx1YWJmOVxcdWZiMWVcXHVmZTAwLVxcdWZlMGZcXHVmZTIwLVxcdWZlMmZcXHVmZTMzXFx1ZmUzNFxcdWZlNGQtXFx1ZmU0ZlxcdWZmMTAtXFx1ZmYxOVxcdWZmM2ZgLFxufSk7XG5cbmV4cG9ydCBjb25zdCByZWFkeSA9IFByb21pc2UucmVzb2x2ZSgpO1xuXG4vLyAvLy8gUmVndWxhciBFeHByZXNzaW9uc1xuLy8gZXhwb3J0IGNvbnN0IFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzID0gL1xcXFxweyAqKFxcdyspICp9L2c7XG5cbi8vIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJlcGxhY2UgPSAobSwgcHJvcGVydHlLZXkpID0+IHtcbi8vICAgLy8gY29uc3QgcHJvcGVydHkgPSBBU0NJSVtwcm9wZXJ0eUtleV0gfHwgVW5pY29kZVtwcm9wZXJ0eUtleV07XG4vLyAgIGNvbnN0IHByb3BlcnR5ID0gUmFuZ2VzW3Byb3BlcnR5S2V5XTtcbi8vICAgaWYgKHByb3BlcnR5KSByZXR1cm4gcHJvcGVydHkudG9TdHJpbmcoKTtcbi8vICAgdGhyb3cgUmFuZ2VFcnJvcihgQ2Fubm90IHJld3JpdGUgdW5pY29kZSBwcm9wZXJ0eSBcIiR7cHJvcGVydHlLZXl9XCJgKTtcbi8vIH07XG5cbi8vIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnJld3JpdGUgPSBleHByZXNzaW9uID0+IHtcbi8vICAgbGV0IGZsYWdzID0gZXhwcmVzc2lvbiAmJiBleHByZXNzaW9uLmZsYWdzO1xuLy8gICBsZXQgc291cmNlID0gZXhwcmVzc2lvbiAmJiBgJHtleHByZXNzaW9uLnNvdXJjZSB8fCBleHByZXNzaW9uIHx8ICcnfWA7XG4vLyAgIHNvdXJjZSAmJlxuLy8gICAgIFJlZ0V4cFVuaWNvZGVQcm9wZXJ0aWVzLnRlc3Qoc291cmNlKSAmJlxuLy8gICAgIChzb3VyY2UgPSBzb3VyY2UucmVwbGFjZShSZWdFeHBVbmljb2RlUHJvcGVydGllcywgUmVnRXhwVW5pY29kZVByb3BlcnRpZXMucmVwbGFjZSkpO1xuLy8gICByZXR1cm4gKGZsYWdzICYmIG5ldyBSZWdFeHAoc291cmNlLCBmbGFncykpIHx8IHNvdXJjZTtcbi8vIH07XG5cbi8vIC8vLyBJbnRlcm9wZXJhYmlsaXR5XG4vLyBleHBvcnQgY29uc3Qgc3VwcG9ydGVkID1cbi8vICAgLy8gVE9ETzogUmVtb3ZlIHdoZW4gc3N1cHBvcnRpbmcgbm9uLXVuaWNvZGUgcnVudGltZXMgW25vdCBpbiBzY29wZV1cbi8vICAgbmV3IFJlZ0V4cChyYXdgXFx1RkZGRmAsICd1JykgJiZcbi8vICAgc3VwcG9ydHMoXG4vLyAgICAgVW5pY29kZVByb3BlcnRpZXMgPT4gbmV3IFJlZ0V4cChyYXdgXFxwe0x9YCwgJ3UnKSxcbi8vICAgICBVbmljb2RlQ2xhc3NlcyA9PiBuZXcgUmVnRXhwKHJhd2BcXHB7SURfU3RhcnR9XFxwe0lEX0NvbnRpbnVlfWAsICd1JyksXG4vLyAgICk7XG5cbi8vIGFzeW5jIGZ1bmN0aW9uIHJlcGxhY2VVbnN1cHBvcnRlZEV4cHJlc3Npb25zKCkge1xuLy8gICAvLyBhd2FpdCBVbmljb2RlLmluaXRpYWxpemUoKTsgY29uc29sZS5sb2coVW5pY29kZSk7XG4vLyAgIGZvciAoY29uc3Qga2V5IGluIGVudGl0aWVzKSB7XG4vLyAgICAgY29uc3Qgc291cmNlcyA9IGVudGl0aWVzW2tleV07XG4vLyAgICAgY29uc3QgcmVwbGFjZW1lbnRzID0ge307XG4vLyAgICAgZm9yIChjb25zdCBpZCBpbiBzb3VyY2VzKVxuLy8gICAgICAgIXNvdXJjZXNbaWRdIHx8XG4vLyAgICAgICAgIHR5cGVvZiAoc291cmNlc1tpZF0uc291cmNlIHx8IHNvdXJjZXNbaWRdKSAhPT0gJ3N0cmluZycgfHxcbi8vICAgICAgICAgKHJlcGxhY2VtZW50c1tpZF0gPSBSZWdFeHBVbmljb2RlUHJvcGVydGllcy5yZXdyaXRlKHNvdXJjZXNbaWRdKSk7XG4vLyAgICAgT2JqZWN0LmFzc2lnbihzb3VyY2VzLCByZXBsYWNlbWVudHMpO1xuLy8gICB9XG4vLyAgIHJldHVybjtcbi8vIH1cblxuLy8gZnVuY3Rpb24gc3VwcG9ydHMoZmVhdHVyZSwgLi4uZmVhdHVyZXMpIHtcbi8vICAgaWYgKGZlYXR1cmUpIHtcbi8vICAgICB0cnkge1xuLy8gICAgICAgZmVhdHVyZSgpO1xuLy8gICAgIH0gY2F0Y2ggKGV4Y2VwdGlvbikge1xuLy8gICAgICAgcmV0dXJuIGZhbHNlO1xuLy8gICAgIH1cbi8vICAgfVxuLy8gICByZXR1cm4gIWZlYXR1cmVzLmxlbmd0aCB8fCBSZWZsZWN0LmFwcGx5KHN1cHBvcnRzLCBudWxsLCBmZWF0dXJlcyk7XG4vLyB9XG5cbi8vIC8vIFRPRE86IEZpeCBVbmljb2RlUmFuZ2UubWVyZ2UgaWYgbm90IGltcGxlbWVudGVkIGluIEZpcmVmb3ggc29vblxuLy8gLy8gaW1wb3J0IHtVbmljb2RlfSBmcm9tICcuL3VuaWNvZGUvdW5pY29kZS5qcyc7XG5cbi8vIC8vIFRPRE86IFJlbW92ZSBSYW5nZXMgb25jZSBVbmljb2RlUmFuZ2UgaXMgd29ya2luZ1xuLy8gY29uc3QgUmFuZ2VzID0ge1xuLy8gICAvLyBMOiAnYS16QS1aJyxcbi8vICAgLy8gTjogJzAtOScsXG4vLyAgIElEX1N0YXJ0OiByYXdgYS16QS1aXFx4YWFcXHhiNVxceGJhXFx4YzAtXFx4ZDZcXHhkOC1cXHhmNlxceGY4LVxcdTAyYzFcXHUwMmM2LVxcdTAyZDFcXHUwMmUwLVxcdTAyZTRcXHUwMmVjXFx1MDJlZVxcdTAzNzAtXFx1MDM3NFxcdTAzNzZcXHUwMzc3XFx1MDM3YS1cXHUwMzdkXFx1MDM3ZlxcdTAzODZcXHUwMzg4LVxcdTAzOGFcXHUwMzhjXFx1MDM4ZS1cXHUwM2ExXFx1MDNhMy1cXHUwM2Y1XFx1MDNmNy1cXHUwNDgxXFx1MDQ4YS1cXHUwNTJmXFx1MDUzMS1cXHUwNTU2XFx1MDU1OVxcdTA1NjAtXFx1MDU4OFxcdTA1ZDAtXFx1MDVlYVxcdTA1ZWYtXFx1MDVmMlxcdTA2MjAtXFx1MDY0YVxcdTA2NmVcXHUwNjZmXFx1MDY3MS1cXHUwNmQzXFx1MDZkNVxcdTA2ZTVcXHUwNmU2XFx1MDZlZVxcdTA2ZWZcXHUwNmZhLVxcdTA2ZmNcXHUwNmZmXFx1MDcxMFxcdTA3MTItXFx1MDcyZlxcdTA3NGQtXFx1MDdhNVxcdTA3YjFcXHUwN2NhLVxcdTA3ZWFcXHUwN2Y0XFx1MDdmNVxcdTA3ZmFcXHUwODAwLVxcdTA4MTVcXHUwODFhXFx1MDgyNFxcdTA4MjhcXHUwODQwLVxcdTA4NThcXHUwODYwLVxcdTA4NmFcXHUwOGEwLVxcdTA4YjRcXHUwOGI2LVxcdTA4YmRcXHUwOTA0LVxcdTA5MzlcXHUwOTNkXFx1MDk1MFxcdTA5NTgtXFx1MDk2MVxcdTA5NzEtXFx1MDk4MFxcdTA5ODUtXFx1MDk4Y1xcdTA5OGZcXHUwOTkwXFx1MDk5My1cXHUwOWE4XFx1MDlhYS1cXHUwOWIwXFx1MDliMlxcdTA5YjYtXFx1MDliOVxcdTA5YmRcXHUwOWNlXFx1MDlkY1xcdTA5ZGRcXHUwOWRmLVxcdTA5ZTFcXHUwOWYwXFx1MDlmMVxcdTA5ZmNcXHUwYTA1LVxcdTBhMGFcXHUwYTBmXFx1MGExMFxcdTBhMTMtXFx1MGEyOFxcdTBhMmEtXFx1MGEzMFxcdTBhMzJcXHUwYTMzXFx1MGEzNVxcdTBhMzZcXHUwYTM4XFx1MGEzOVxcdTBhNTktXFx1MGE1Y1xcdTBhNWVcXHUwYTcyLVxcdTBhNzRcXHUwYTg1LVxcdTBhOGRcXHUwYThmLVxcdTBhOTFcXHUwYTkzLVxcdTBhYThcXHUwYWFhLVxcdTBhYjBcXHUwYWIyXFx1MGFiM1xcdTBhYjUtXFx1MGFiOVxcdTBhYmRcXHUwYWQwXFx1MGFlMFxcdTBhZTFcXHUwYWY5XFx1MGIwNS1cXHUwYjBjXFx1MGIwZlxcdTBiMTBcXHUwYjEzLVxcdTBiMjhcXHUwYjJhLVxcdTBiMzBcXHUwYjMyXFx1MGIzM1xcdTBiMzUtXFx1MGIzOVxcdTBiM2RcXHUwYjVjXFx1MGI1ZFxcdTBiNWYtXFx1MGI2MVxcdTBiNzFcXHUwYjgzXFx1MGI4NS1cXHUwYjhhXFx1MGI4ZS1cXHUwYjkwXFx1MGI5Mi1cXHUwYjk1XFx1MGI5OVxcdTBiOWFcXHUwYjljXFx1MGI5ZVxcdTBiOWZcXHUwYmEzXFx1MGJhNFxcdTBiYTgtXFx1MGJhYVxcdTBiYWUtXFx1MGJiOVxcdTBiZDBcXHUwYzA1LVxcdTBjMGNcXHUwYzBlLVxcdTBjMTBcXHUwYzEyLVxcdTBjMjhcXHUwYzJhLVxcdTBjMzlcXHUwYzNkXFx1MGM1OC1cXHUwYzVhXFx1MGM2MFxcdTBjNjFcXHUwYzgwXFx1MGM4NS1cXHUwYzhjXFx1MGM4ZS1cXHUwYzkwXFx1MGM5Mi1cXHUwY2E4XFx1MGNhYS1cXHUwY2IzXFx1MGNiNS1cXHUwY2I5XFx1MGNiZFxcdTBjZGVcXHUwY2UwXFx1MGNlMVxcdTBjZjFcXHUwY2YyXFx1MGQwNS1cXHUwZDBjXFx1MGQwZS1cXHUwZDEwXFx1MGQxMi1cXHUwZDNhXFx1MGQzZFxcdTBkNGVcXHUwZDU0LVxcdTBkNTZcXHUwZDVmLVxcdTBkNjFcXHUwZDdhLVxcdTBkN2ZcXHUwZDg1LVxcdTBkOTZcXHUwZDlhLVxcdTBkYjFcXHUwZGIzLVxcdTBkYmJcXHUwZGJkXFx1MGRjMC1cXHUwZGM2XFx1MGUwMS1cXHUwZTMwXFx1MGUzMlxcdTBlMzNcXHUwZTQwLVxcdTBlNDZcXHUwZTgxXFx1MGU4MlxcdTBlODRcXHUwZTg3XFx1MGU4OFxcdTBlOGFcXHUwZThkXFx1MGU5NC1cXHUwZTk3XFx1MGU5OS1cXHUwZTlmXFx1MGVhMS1cXHUwZWEzXFx1MGVhNVxcdTBlYTdcXHUwZWFhXFx1MGVhYlxcdTBlYWQtXFx1MGViMFxcdTBlYjJcXHUwZWIzXFx1MGViZFxcdTBlYzAtXFx1MGVjNFxcdTBlYzZcXHUwZWRjLVxcdTBlZGZcXHUwZjAwXFx1MGY0MC1cXHUwZjQ3XFx1MGY0OS1cXHUwZjZjXFx1MGY4OC1cXHUwZjhjXFx1MTAwMC1cXHUxMDJhXFx1MTAzZlxcdTEwNTAtXFx1MTA1NVxcdTEwNWEtXFx1MTA1ZFxcdTEwNjFcXHUxMDY1XFx1MTA2NlxcdTEwNmUtXFx1MTA3MFxcdTEwNzUtXFx1MTA4MVxcdTEwOGVcXHUxMGEwLVxcdTEwYzVcXHUxMGM3XFx1MTBjZFxcdTEwZDAtXFx1MTBmYVxcdTEwZmMtXFx1MTI0OFxcdTEyNGEtXFx1MTI0ZFxcdTEyNTAtXFx1MTI1NlxcdTEyNThcXHUxMjVhLVxcdTEyNWRcXHUxMjYwLVxcdTEyODhcXHUxMjhhLVxcdTEyOGRcXHUxMjkwLVxcdTEyYjBcXHUxMmIyLVxcdTEyYjVcXHUxMmI4LVxcdTEyYmVcXHUxMmMwXFx1MTJjMi1cXHUxMmM1XFx1MTJjOC1cXHUxMmQ2XFx1MTJkOC1cXHUxMzEwXFx1MTMxMi1cXHUxMzE1XFx1MTMxOC1cXHUxMzVhXFx1MTM4MC1cXHUxMzhmXFx1MTNhMC1cXHUxM2Y1XFx1MTNmOC1cXHUxM2ZkXFx1MTQwMS1cXHUxNjZjXFx1MTY2Zi1cXHUxNjdmXFx1MTY4MS1cXHUxNjlhXFx1MTZhMC1cXHUxNmVhXFx1MTZlZS1cXHUxNmY4XFx1MTcwMC1cXHUxNzBjXFx1MTcwZS1cXHUxNzExXFx1MTcyMC1cXHUxNzMxXFx1MTc0MC1cXHUxNzUxXFx1MTc2MC1cXHUxNzZjXFx1MTc2ZS1cXHUxNzcwXFx1MTc4MC1cXHUxN2IzXFx1MTdkN1xcdTE3ZGNcXHUxODIwLVxcdTE4NzhcXHUxODgwLVxcdTE4YThcXHUxOGFhXFx1MThiMC1cXHUxOGY1XFx1MTkwMC1cXHUxOTFlXFx1MTk1MC1cXHUxOTZkXFx1MTk3MC1cXHUxOTc0XFx1MTk4MC1cXHUxOWFiXFx1MTliMC1cXHUxOWM5XFx1MWEwMC1cXHUxYTE2XFx1MWEyMC1cXHUxYTU0XFx1MWFhN1xcdTFiMDUtXFx1MWIzM1xcdTFiNDUtXFx1MWI0YlxcdTFiODMtXFx1MWJhMFxcdTFiYWVcXHUxYmFmXFx1MWJiYS1cXHUxYmU1XFx1MWMwMC1cXHUxYzIzXFx1MWM0ZC1cXHUxYzRmXFx1MWM1YS1cXHUxYzdkXFx1MWM4MC1cXHUxYzg4XFx1MWM5MC1cXHUxY2JhXFx1MWNiZC1cXHUxY2JmXFx1MWNlOS1cXHUxY2VjXFx1MWNlZS1cXHUxY2YxXFx1MWNmNVxcdTFjZjZcXHUxZDAwLVxcdTFkYmZcXHUxZTAwLVxcdTFmMTVcXHUxZjE4LVxcdTFmMWRcXHUxZjIwLVxcdTFmNDVcXHUxZjQ4LVxcdTFmNGRcXHUxZjUwLVxcdTFmNTdcXHUxZjU5XFx1MWY1YlxcdTFmNWRcXHUxZjVmLVxcdTFmN2RcXHUxZjgwLVxcdTFmYjRcXHUxZmI2LVxcdTFmYmNcXHUxZmJlXFx1MWZjMi1cXHUxZmM0XFx1MWZjNi1cXHUxZmNjXFx1MWZkMC1cXHUxZmQzXFx1MWZkNi1cXHUxZmRiXFx1MWZlMC1cXHUxZmVjXFx1MWZmMi1cXHUxZmY0XFx1MWZmNi1cXHUxZmZjXFx1MjA3MVxcdTIwN2ZcXHUyMDkwLVxcdTIwOWNcXHUyMTAyXFx1MjEwN1xcdTIxMGEtXFx1MjExM1xcdTIxMTVcXHUyMTE4LVxcdTIxMWRcXHUyMTI0XFx1MjEyNlxcdTIxMjhcXHUyMTJhLVxcdTIxMzlcXHUyMTNjLVxcdTIxM2ZcXHUyMTQ1LVxcdTIxNDlcXHUyMTRlXFx1MjE2MC1cXHUyMTg4XFx1MmMwMC1cXHUyYzJlXFx1MmMzMC1cXHUyYzVlXFx1MmM2MC1cXHUyY2U0XFx1MmNlYi1cXHUyY2VlXFx1MmNmMlxcdTJjZjNcXHUyZDAwLVxcdTJkMjVcXHUyZDI3XFx1MmQyZFxcdTJkMzAtXFx1MmQ2N1xcdTJkNmZcXHUyZDgwLVxcdTJkOTZcXHUyZGEwLVxcdTJkYTZcXHUyZGE4LVxcdTJkYWVcXHUyZGIwLVxcdTJkYjZcXHUyZGI4LVxcdTJkYmVcXHUyZGMwLVxcdTJkYzZcXHUyZGM4LVxcdTJkY2VcXHUyZGQwLVxcdTJkZDZcXHUyZGQ4LVxcdTJkZGVcXHUzMDA1LVxcdTMwMDdcXHUzMDIxLVxcdTMwMjlcXHUzMDMxLVxcdTMwMzVcXHUzMDM4LVxcdTMwM2NcXHUzMDQxLVxcdTMwOTZcXHUzMDliLVxcdTMwOWZcXHUzMGExLVxcdTMwZmFcXHUzMGZjLVxcdTMwZmZcXHUzMTA1LVxcdTMxMmZcXHUzMTMxLVxcdTMxOGVcXHUzMWEwLVxcdTMxYmFcXHUzMWYwLVxcdTMxZmZcXHUzNDAwLVxcdTRkYjVcXHU0ZTAwLVxcdTlmZWZcXHVhMDAwLVxcdWE0OGNcXHVhNGQwLVxcdWE0ZmRcXHVhNTAwLVxcdWE2MGNcXHVhNjEwLVxcdWE2MWZcXHVhNjJhXFx1YTYyYlxcdWE2NDAtXFx1YTY2ZVxcdWE2N2YtXFx1YTY5ZFxcdWE2YTAtXFx1YTZlZlxcdWE3MTctXFx1YTcxZlxcdWE3MjItXFx1YTc4OFxcdWE3OGItXFx1YTdiOVxcdWE3ZjctXFx1YTgwMVxcdWE4MDMtXFx1YTgwNVxcdWE4MDctXFx1YTgwYVxcdWE4MGMtXFx1YTgyMlxcdWE4NDAtXFx1YTg3M1xcdWE4ODItXFx1YThiM1xcdWE4ZjItXFx1YThmN1xcdWE4ZmJcXHVhOGZkXFx1YThmZVxcdWE5MGEtXFx1YTkyNVxcdWE5MzAtXFx1YTk0NlxcdWE5NjAtXFx1YTk3Y1xcdWE5ODQtXFx1YTliMlxcdWE5Y2ZcXHVhOWUwLVxcdWE5ZTRcXHVhOWU2LVxcdWE5ZWZcXHVhOWZhLVxcdWE5ZmVcXHVhYTAwLVxcdWFhMjhcXHVhYTQwLVxcdWFhNDJcXHVhYTQ0LVxcdWFhNGJcXHVhYTYwLVxcdWFhNzZcXHVhYTdhXFx1YWE3ZS1cXHVhYWFmXFx1YWFiMVxcdWFhYjVcXHVhYWI2XFx1YWFiOS1cXHVhYWJkXFx1YWFjMFxcdWFhYzJcXHVhYWRiLVxcdWFhZGRcXHVhYWUwLVxcdWFhZWFcXHVhYWYyLVxcdWFhZjRcXHVhYjAxLVxcdWFiMDZcXHVhYjA5LVxcdWFiMGVcXHVhYjExLVxcdWFiMTZcXHVhYjIwLVxcdWFiMjZcXHVhYjI4LVxcdWFiMmVcXHVhYjMwLVxcdWFiNWFcXHVhYjVjLVxcdWFiNjVcXHVhYjcwLVxcdWFiZTJcXHVhYzAwLVxcdWQ3YTNcXHVkN2IwLVxcdWQ3YzZcXHVkN2NiLVxcdWQ3ZmJcXHVmOTAwLVxcdWZhNmRcXHVmYTcwLVxcdWZhZDlcXHVmYjAwLVxcdWZiMDZcXHVmYjEzLVxcdWZiMTdcXHVmYjFkXFx1ZmIxZi1cXHVmYjI4XFx1ZmIyYS1cXHVmYjM2XFx1ZmIzOC1cXHVmYjNjXFx1ZmIzZVxcdWZiNDBcXHVmYjQxXFx1ZmI0M1xcdWZiNDRcXHVmYjQ2LVxcdWZiYjFcXHVmYmQzLVxcdWZkM2RcXHVmZDUwLVxcdWZkOGZcXHVmZDkyLVxcdWZkYzdcXHVmZGYwLVxcdWZkZmJcXHVmZTcwLVxcdWZlNzRcXHVmZTc2LVxcdWZlZmNcXHVmZjIxLVxcdWZmM2FcXHVmZjQxLVxcdWZmNWFcXHVmZjY2LVxcdWZmYmVcXHVmZmMyLVxcdWZmYzdcXHVmZmNhLVxcdWZmY2ZcXHVmZmQyLVxcdWZmZDdcXHVmZmRhLVxcdWZmZGNgLFxuLy8gICBJRF9Db250aW51ZTogcmF3YGEtekEtWjAtOVxceGFhXFx4YjVcXHhiYVxceGMwLVxceGQ2XFx4ZDgtXFx4ZjZcXHhmOC1cXHUwMmMxXFx1MDJjNi1cXHUwMmQxXFx1MDJlMC1cXHUwMmU0XFx1MDJlY1xcdTAyZWVcXHUwMzcwLVxcdTAzNzRcXHUwMzc2XFx1MDM3N1xcdTAzN2EtXFx1MDM3ZFxcdTAzN2ZcXHUwMzg2XFx1MDM4OC1cXHUwMzhhXFx1MDM4Y1xcdTAzOGUtXFx1MDNhMVxcdTAzYTMtXFx1MDNmNVxcdTAzZjctXFx1MDQ4MVxcdTA0OGEtXFx1MDUyZlxcdTA1MzEtXFx1MDU1NlxcdTA1NTlcXHUwNTYwLVxcdTA1ODhcXHUwNWQwLVxcdTA1ZWFcXHUwNWVmLVxcdTA1ZjJcXHUwNjIwLVxcdTA2NGFcXHUwNjZlXFx1MDY2ZlxcdTA2NzEtXFx1MDZkM1xcdTA2ZDVcXHUwNmU1XFx1MDZlNlxcdTA2ZWVcXHUwNmVmXFx1MDZmYS1cXHUwNmZjXFx1MDZmZlxcdTA3MTBcXHUwNzEyLVxcdTA3MmZcXHUwNzRkLVxcdTA3YTVcXHUwN2IxXFx1MDdjYS1cXHUwN2VhXFx1MDdmNFxcdTA3ZjVcXHUwN2ZhXFx1MDgwMC1cXHUwODE1XFx1MDgxYVxcdTA4MjRcXHUwODI4XFx1MDg0MC1cXHUwODU4XFx1MDg2MC1cXHUwODZhXFx1MDhhMC1cXHUwOGI0XFx1MDhiNi1cXHUwOGJkXFx1MDkwNC1cXHUwOTM5XFx1MDkzZFxcdTA5NTBcXHUwOTU4LVxcdTA5NjFcXHUwOTcxLVxcdTA5ODBcXHUwOTg1LVxcdTA5OGNcXHUwOThmXFx1MDk5MFxcdTA5OTMtXFx1MDlhOFxcdTA5YWEtXFx1MDliMFxcdTA5YjJcXHUwOWI2LVxcdTA5YjlcXHUwOWJkXFx1MDljZVxcdTA5ZGNcXHUwOWRkXFx1MDlkZi1cXHUwOWUxXFx1MDlmMFxcdTA5ZjFcXHUwOWZjXFx1MGEwNS1cXHUwYTBhXFx1MGEwZlxcdTBhMTBcXHUwYTEzLVxcdTBhMjhcXHUwYTJhLVxcdTBhMzBcXHUwYTMyXFx1MGEzM1xcdTBhMzVcXHUwYTM2XFx1MGEzOFxcdTBhMzlcXHUwYTU5LVxcdTBhNWNcXHUwYTVlXFx1MGE3Mi1cXHUwYTc0XFx1MGE4NS1cXHUwYThkXFx1MGE4Zi1cXHUwYTkxXFx1MGE5My1cXHUwYWE4XFx1MGFhYS1cXHUwYWIwXFx1MGFiMlxcdTBhYjNcXHUwYWI1LVxcdTBhYjlcXHUwYWJkXFx1MGFkMFxcdTBhZTBcXHUwYWUxXFx1MGFmOVxcdTBiMDUtXFx1MGIwY1xcdTBiMGZcXHUwYjEwXFx1MGIxMy1cXHUwYjI4XFx1MGIyYS1cXHUwYjMwXFx1MGIzMlxcdTBiMzNcXHUwYjM1LVxcdTBiMzlcXHUwYjNkXFx1MGI1Y1xcdTBiNWRcXHUwYjVmLVxcdTBiNjFcXHUwYjcxXFx1MGI4M1xcdTBiODUtXFx1MGI4YVxcdTBiOGUtXFx1MGI5MFxcdTBiOTItXFx1MGI5NVxcdTBiOTlcXHUwYjlhXFx1MGI5Y1xcdTBiOWVcXHUwYjlmXFx1MGJhM1xcdTBiYTRcXHUwYmE4LVxcdTBiYWFcXHUwYmFlLVxcdTBiYjlcXHUwYmQwXFx1MGMwNS1cXHUwYzBjXFx1MGMwZS1cXHUwYzEwXFx1MGMxMi1cXHUwYzI4XFx1MGMyYS1cXHUwYzM5XFx1MGMzZFxcdTBjNTgtXFx1MGM1YVxcdTBjNjBcXHUwYzYxXFx1MGM4MFxcdTBjODUtXFx1MGM4Y1xcdTBjOGUtXFx1MGM5MFxcdTBjOTItXFx1MGNhOFxcdTBjYWEtXFx1MGNiM1xcdTBjYjUtXFx1MGNiOVxcdTBjYmRcXHUwY2RlXFx1MGNlMFxcdTBjZTFcXHUwY2YxXFx1MGNmMlxcdTBkMDUtXFx1MGQwY1xcdTBkMGUtXFx1MGQxMFxcdTBkMTItXFx1MGQzYVxcdTBkM2RcXHUwZDRlXFx1MGQ1NC1cXHUwZDU2XFx1MGQ1Zi1cXHUwZDYxXFx1MGQ3YS1cXHUwZDdmXFx1MGQ4NS1cXHUwZDk2XFx1MGQ5YS1cXHUwZGIxXFx1MGRiMy1cXHUwZGJiXFx1MGRiZFxcdTBkYzAtXFx1MGRjNlxcdTBlMDEtXFx1MGUzMFxcdTBlMzJcXHUwZTMzXFx1MGU0MC1cXHUwZTQ2XFx1MGU4MVxcdTBlODJcXHUwZTg0XFx1MGU4N1xcdTBlODhcXHUwZThhXFx1MGU4ZFxcdTBlOTQtXFx1MGU5N1xcdTBlOTktXFx1MGU5ZlxcdTBlYTEtXFx1MGVhM1xcdTBlYTVcXHUwZWE3XFx1MGVhYVxcdTBlYWJcXHUwZWFkLVxcdTBlYjBcXHUwZWIyXFx1MGViM1xcdTBlYmRcXHUwZWMwLVxcdTBlYzRcXHUwZWM2XFx1MGVkYy1cXHUwZWRmXFx1MGYwMFxcdTBmNDAtXFx1MGY0N1xcdTBmNDktXFx1MGY2Y1xcdTBmODgtXFx1MGY4Y1xcdTEwMDAtXFx1MTAyYVxcdTEwM2ZcXHUxMDUwLVxcdTEwNTVcXHUxMDVhLVxcdTEwNWRcXHUxMDYxXFx1MTA2NVxcdTEwNjZcXHUxMDZlLVxcdTEwNzBcXHUxMDc1LVxcdTEwODFcXHUxMDhlXFx1MTBhMC1cXHUxMGM1XFx1MTBjN1xcdTEwY2RcXHUxMGQwLVxcdTEwZmFcXHUxMGZjLVxcdTEyNDhcXHUxMjRhLVxcdTEyNGRcXHUxMjUwLVxcdTEyNTZcXHUxMjU4XFx1MTI1YS1cXHUxMjVkXFx1MTI2MC1cXHUxMjg4XFx1MTI4YS1cXHUxMjhkXFx1MTI5MC1cXHUxMmIwXFx1MTJiMi1cXHUxMmI1XFx1MTJiOC1cXHUxMmJlXFx1MTJjMFxcdTEyYzItXFx1MTJjNVxcdTEyYzgtXFx1MTJkNlxcdTEyZDgtXFx1MTMxMFxcdTEzMTItXFx1MTMxNVxcdTEzMTgtXFx1MTM1YVxcdTEzODAtXFx1MTM4ZlxcdTEzYTAtXFx1MTNmNVxcdTEzZjgtXFx1MTNmZFxcdTE0MDEtXFx1MTY2Y1xcdTE2NmYtXFx1MTY3ZlxcdTE2ODEtXFx1MTY5YVxcdTE2YTAtXFx1MTZlYVxcdTE2ZWUtXFx1MTZmOFxcdTE3MDAtXFx1MTcwY1xcdTE3MGUtXFx1MTcxMVxcdTE3MjAtXFx1MTczMVxcdTE3NDAtXFx1MTc1MVxcdTE3NjAtXFx1MTc2Y1xcdTE3NmUtXFx1MTc3MFxcdTE3ODAtXFx1MTdiM1xcdTE3ZDdcXHUxN2RjXFx1MTgyMC1cXHUxODc4XFx1MTg4MC1cXHUxOGE4XFx1MThhYVxcdTE4YjAtXFx1MThmNVxcdTE5MDAtXFx1MTkxZVxcdTE5NTAtXFx1MTk2ZFxcdTE5NzAtXFx1MTk3NFxcdTE5ODAtXFx1MTlhYlxcdTE5YjAtXFx1MTljOVxcdTFhMDAtXFx1MWExNlxcdTFhMjAtXFx1MWE1NFxcdTFhYTdcXHUxYjA1LVxcdTFiMzNcXHUxYjQ1LVxcdTFiNGJcXHUxYjgzLVxcdTFiYTBcXHUxYmFlXFx1MWJhZlxcdTFiYmEtXFx1MWJlNVxcdTFjMDAtXFx1MWMyM1xcdTFjNGQtXFx1MWM0ZlxcdTFjNWEtXFx1MWM3ZFxcdTFjODAtXFx1MWM4OFxcdTFjOTAtXFx1MWNiYVxcdTFjYmQtXFx1MWNiZlxcdTFjZTktXFx1MWNlY1xcdTFjZWUtXFx1MWNmMVxcdTFjZjVcXHUxY2Y2XFx1MWQwMC1cXHUxZGJmXFx1MWUwMC1cXHUxZjE1XFx1MWYxOC1cXHUxZjFkXFx1MWYyMC1cXHUxZjQ1XFx1MWY0OC1cXHUxZjRkXFx1MWY1MC1cXHUxZjU3XFx1MWY1OVxcdTFmNWJcXHUxZjVkXFx1MWY1Zi1cXHUxZjdkXFx1MWY4MC1cXHUxZmI0XFx1MWZiNi1cXHUxZmJjXFx1MWZiZVxcdTFmYzItXFx1MWZjNFxcdTFmYzYtXFx1MWZjY1xcdTFmZDAtXFx1MWZkM1xcdTFmZDYtXFx1MWZkYlxcdTFmZTAtXFx1MWZlY1xcdTFmZjItXFx1MWZmNFxcdTFmZjYtXFx1MWZmY1xcdTIwNzFcXHUyMDdmXFx1MjA5MC1cXHUyMDljXFx1MjEwMlxcdTIxMDdcXHUyMTBhLVxcdTIxMTNcXHUyMTE1XFx1MjExOC1cXHUyMTFkXFx1MjEyNFxcdTIxMjZcXHUyMTI4XFx1MjEyYS1cXHUyMTM5XFx1MjEzYy1cXHUyMTNmXFx1MjE0NS1cXHUyMTQ5XFx1MjE0ZVxcdTIxNjAtXFx1MjE4OFxcdTJjMDAtXFx1MmMyZVxcdTJjMzAtXFx1MmM1ZVxcdTJjNjAtXFx1MmNlNFxcdTJjZWItXFx1MmNlZVxcdTJjZjJcXHUyY2YzXFx1MmQwMC1cXHUyZDI1XFx1MmQyN1xcdTJkMmRcXHUyZDMwLVxcdTJkNjdcXHUyZDZmXFx1MmQ4MC1cXHUyZDk2XFx1MmRhMC1cXHUyZGE2XFx1MmRhOC1cXHUyZGFlXFx1MmRiMC1cXHUyZGI2XFx1MmRiOC1cXHUyZGJlXFx1MmRjMC1cXHUyZGM2XFx1MmRjOC1cXHUyZGNlXFx1MmRkMC1cXHUyZGQ2XFx1MmRkOC1cXHUyZGRlXFx1MzAwNS1cXHUzMDA3XFx1MzAyMS1cXHUzMDI5XFx1MzAzMS1cXHUzMDM1XFx1MzAzOC1cXHUzMDNjXFx1MzA0MS1cXHUzMDk2XFx1MzA5Yi1cXHUzMDlmXFx1MzBhMS1cXHUzMGZhXFx1MzBmYy1cXHUzMGZmXFx1MzEwNS1cXHUzMTJmXFx1MzEzMS1cXHUzMThlXFx1MzFhMC1cXHUzMWJhXFx1MzFmMC1cXHUzMWZmXFx1MzQwMC1cXHU0ZGI1XFx1NGUwMC1cXHU5ZmVmXFx1YTAwMC1cXHVhNDhjXFx1YTRkMC1cXHVhNGZkXFx1YTUwMC1cXHVhNjBjXFx1YTYxMC1cXHVhNjFmXFx1YTYyYVxcdWE2MmJcXHVhNjQwLVxcdWE2NmVcXHVhNjdmLVxcdWE2OWRcXHVhNmEwLVxcdWE2ZWZcXHVhNzE3LVxcdWE3MWZcXHVhNzIyLVxcdWE3ODhcXHVhNzhiLVxcdWE3YjlcXHVhN2Y3LVxcdWE4MDFcXHVhODAzLVxcdWE4MDVcXHVhODA3LVxcdWE4MGFcXHVhODBjLVxcdWE4MjJcXHVhODQwLVxcdWE4NzNcXHVhODgyLVxcdWE4YjNcXHVhOGYyLVxcdWE4ZjdcXHVhOGZiXFx1YThmZFxcdWE4ZmVcXHVhOTBhLVxcdWE5MjVcXHVhOTMwLVxcdWE5NDZcXHVhOTYwLVxcdWE5N2NcXHVhOTg0LVxcdWE5YjJcXHVhOWNmXFx1YTllMC1cXHVhOWU0XFx1YTllNi1cXHVhOWVmXFx1YTlmYS1cXHVhOWZlXFx1YWEwMC1cXHVhYTI4XFx1YWE0MC1cXHVhYTQyXFx1YWE0NC1cXHVhYTRiXFx1YWE2MC1cXHVhYTc2XFx1YWE3YVxcdWFhN2UtXFx1YWFhZlxcdWFhYjFcXHVhYWI1XFx1YWFiNlxcdWFhYjktXFx1YWFiZFxcdWFhYzBcXHVhYWMyXFx1YWFkYi1cXHVhYWRkXFx1YWFlMC1cXHVhYWVhXFx1YWFmMi1cXHVhYWY0XFx1YWIwMS1cXHVhYjA2XFx1YWIwOS1cXHVhYjBlXFx1YWIxMS1cXHVhYjE2XFx1YWIyMC1cXHVhYjI2XFx1YWIyOC1cXHVhYjJlXFx1YWIzMC1cXHVhYjVhXFx1YWI1Yy1cXHVhYjY1XFx1YWI3MC1cXHVhYmUyXFx1YWMwMC1cXHVkN2EzXFx1ZDdiMC1cXHVkN2M2XFx1ZDdjYi1cXHVkN2ZiXFx1ZjkwMC1cXHVmYTZkXFx1ZmE3MC1cXHVmYWQ5XFx1ZmIwMC1cXHVmYjA2XFx1ZmIxMy1cXHVmYjE3XFx1ZmIxZFxcdWZiMWYtXFx1ZmIyOFxcdWZiMmEtXFx1ZmIzNlxcdWZiMzgtXFx1ZmIzY1xcdWZiM2VcXHVmYjQwXFx1ZmI0MVxcdWZiNDNcXHVmYjQ0XFx1ZmI0Ni1cXHVmYmIxXFx1ZmJkMy1cXHVmZDNkXFx1ZmQ1MC1cXHVmZDhmXFx1ZmQ5Mi1cXHVmZGM3XFx1ZmRmMC1cXHVmZGZiXFx1ZmU3MC1cXHVmZTc0XFx1ZmU3Ni1cXHVmZWZjXFx1ZmYyMS1cXHVmZjNhXFx1ZmY0MS1cXHVmZjVhXFx1ZmY2Ni1cXHVmZmJlXFx1ZmZjMi1cXHVmZmM3XFx1ZmZjYS1cXHVmZmNmXFx1ZmZkMi1cXHVmZmQ3XFx1ZmZkYS1cXHVmZmRjXFx1MjAwY1xcdTIwMGRcXHhiN1xcdTAzMDAtXFx1MDM2ZlxcdTAzODdcXHUwNDgzLVxcdTA0ODdcXHUwNTkxLVxcdTA1YmRcXHUwNWJmXFx1MDVjMVxcdTA1YzJcXHUwNWM0XFx1MDVjNVxcdTA1YzdcXHUwNjEwLVxcdTA2MWFcXHUwNjRiLVxcdTA2NjlcXHUwNjcwXFx1MDZkNi1cXHUwNmRjXFx1MDZkZi1cXHUwNmU0XFx1MDZlN1xcdTA2ZThcXHUwNmVhLVxcdTA2ZWRcXHUwNmYwLVxcdTA2ZjlcXHUwNzExXFx1MDczMC1cXHUwNzRhXFx1MDdhNi1cXHUwN2IwXFx1MDdjMC1cXHUwN2M5XFx1MDdlYi1cXHUwN2YzXFx1MDdmZFxcdTA4MTYtXFx1MDgxOVxcdTA4MWItXFx1MDgyM1xcdTA4MjUtXFx1MDgyN1xcdTA4MjktXFx1MDgyZFxcdTA4NTktXFx1MDg1YlxcdTA4ZDMtXFx1MDhlMVxcdTA4ZTMtXFx1MDkwM1xcdTA5M2EtXFx1MDkzY1xcdTA5M2UtXFx1MDk0ZlxcdTA5NTEtXFx1MDk1N1xcdTA5NjJcXHUwOTYzXFx1MDk2Ni1cXHUwOTZmXFx1MDk4MS1cXHUwOTgzXFx1MDliY1xcdTA5YmUtXFx1MDljNFxcdTA5YzdcXHUwOWM4XFx1MDljYi1cXHUwOWNkXFx1MDlkN1xcdTA5ZTJcXHUwOWUzXFx1MDllNi1cXHUwOWVmXFx1MDlmZVxcdTBhMDEtXFx1MGEwM1xcdTBhM2NcXHUwYTNlLVxcdTBhNDJcXHUwYTQ3XFx1MGE0OFxcdTBhNGItXFx1MGE0ZFxcdTBhNTFcXHUwYTY2LVxcdTBhNzFcXHUwYTc1XFx1MGE4MS1cXHUwYTgzXFx1MGFiY1xcdTBhYmUtXFx1MGFjNVxcdTBhYzctXFx1MGFjOVxcdTBhY2ItXFx1MGFjZFxcdTBhZTJcXHUwYWUzXFx1MGFlNi1cXHUwYWVmXFx1MGFmYS1cXHUwYWZmXFx1MGIwMS1cXHUwYjAzXFx1MGIzY1xcdTBiM2UtXFx1MGI0NFxcdTBiNDdcXHUwYjQ4XFx1MGI0Yi1cXHUwYjRkXFx1MGI1NlxcdTBiNTdcXHUwYjYyXFx1MGI2M1xcdTBiNjYtXFx1MGI2ZlxcdTBiODJcXHUwYmJlLVxcdTBiYzJcXHUwYmM2LVxcdTBiYzhcXHUwYmNhLVxcdTBiY2RcXHUwYmQ3XFx1MGJlNi1cXHUwYmVmXFx1MGMwMC1cXHUwYzA0XFx1MGMzZS1cXHUwYzQ0XFx1MGM0Ni1cXHUwYzQ4XFx1MGM0YS1cXHUwYzRkXFx1MGM1NVxcdTBjNTZcXHUwYzYyXFx1MGM2M1xcdTBjNjYtXFx1MGM2ZlxcdTBjODEtXFx1MGM4M1xcdTBjYmNcXHUwY2JlLVxcdTBjYzRcXHUwY2M2LVxcdTBjYzhcXHUwY2NhLVxcdTBjY2RcXHUwY2Q1XFx1MGNkNlxcdTBjZTJcXHUwY2UzXFx1MGNlNi1cXHUwY2VmXFx1MGQwMC1cXHUwZDAzXFx1MGQzYlxcdTBkM2NcXHUwZDNlLVxcdTBkNDRcXHUwZDQ2LVxcdTBkNDhcXHUwZDRhLVxcdTBkNGRcXHUwZDU3XFx1MGQ2MlxcdTBkNjNcXHUwZDY2LVxcdTBkNmZcXHUwZDgyXFx1MGQ4M1xcdTBkY2FcXHUwZGNmLVxcdTBkZDRcXHUwZGQ2XFx1MGRkOC1cXHUwZGRmXFx1MGRlNi1cXHUwZGVmXFx1MGRmMlxcdTBkZjNcXHUwZTMxXFx1MGUzNC1cXHUwZTNhXFx1MGU0Ny1cXHUwZTRlXFx1MGU1MC1cXHUwZTU5XFx1MGViMVxcdTBlYjQtXFx1MGViOVxcdTBlYmJcXHUwZWJjXFx1MGVjOC1cXHUwZWNkXFx1MGVkMC1cXHUwZWQ5XFx1MGYxOFxcdTBmMTlcXHUwZjIwLVxcdTBmMjlcXHUwZjM1XFx1MGYzN1xcdTBmMzlcXHUwZjNlXFx1MGYzZlxcdTBmNzEtXFx1MGY4NFxcdTBmODZcXHUwZjg3XFx1MGY4ZC1cXHUwZjk3XFx1MGY5OS1cXHUwZmJjXFx1MGZjNlxcdTEwMmItXFx1MTAzZVxcdTEwNDAtXFx1MTA0OVxcdTEwNTYtXFx1MTA1OVxcdTEwNWUtXFx1MTA2MFxcdTEwNjItXFx1MTA2NFxcdTEwNjctXFx1MTA2ZFxcdTEwNzEtXFx1MTA3NFxcdTEwODItXFx1MTA4ZFxcdTEwOGYtXFx1MTA5ZFxcdTEzNWQtXFx1MTM1ZlxcdTEzNjktXFx1MTM3MVxcdTE3MTItXFx1MTcxNFxcdTE3MzItXFx1MTczNFxcdTE3NTJcXHUxNzUzXFx1MTc3MlxcdTE3NzNcXHUxN2I0LVxcdTE3ZDNcXHUxN2RkXFx1MTdlMC1cXHUxN2U5XFx1MTgwYi1cXHUxODBkXFx1MTgxMC1cXHUxODE5XFx1MThhOVxcdTE5MjAtXFx1MTkyYlxcdTE5MzAtXFx1MTkzYlxcdTE5NDYtXFx1MTk0ZlxcdTE5ZDAtXFx1MTlkYVxcdTFhMTctXFx1MWExYlxcdTFhNTUtXFx1MWE1ZVxcdTFhNjAtXFx1MWE3Y1xcdTFhN2YtXFx1MWE4OVxcdTFhOTAtXFx1MWE5OVxcdTFhYjAtXFx1MWFiZFxcdTFiMDAtXFx1MWIwNFxcdTFiMzQtXFx1MWI0NFxcdTFiNTAtXFx1MWI1OVxcdTFiNmItXFx1MWI3M1xcdTFiODAtXFx1MWI4MlxcdTFiYTEtXFx1MWJhZFxcdTFiYjAtXFx1MWJiOVxcdTFiZTYtXFx1MWJmM1xcdTFjMjQtXFx1MWMzN1xcdTFjNDAtXFx1MWM0OVxcdTFjNTAtXFx1MWM1OVxcdTFjZDAtXFx1MWNkMlxcdTFjZDQtXFx1MWNlOFxcdTFjZWRcXHUxY2YyLVxcdTFjZjRcXHUxY2Y3LVxcdTFjZjlcXHUxZGMwLVxcdTFkZjlcXHUxZGZiLVxcdTFkZmZcXHUyMDNmXFx1MjA0MFxcdTIwNTRcXHUyMGQwLVxcdTIwZGNcXHUyMGUxXFx1MjBlNS1cXHUyMGYwXFx1MmNlZi1cXHUyY2YxXFx1MmQ3ZlxcdTJkZTAtXFx1MmRmZlxcdTMwMmEtXFx1MzAyZlxcdTMwOTlcXHUzMDlhXFx1YTYyMC1cXHVhNjI5XFx1YTY2ZlxcdWE2NzQtXFx1YTY3ZFxcdWE2OWVcXHVhNjlmXFx1YTZmMFxcdWE2ZjFcXHVhODAyXFx1YTgwNlxcdWE4MGJcXHVhODIzLVxcdWE4MjdcXHVhODgwXFx1YTg4MVxcdWE4YjQtXFx1YThjNVxcdWE4ZDAtXFx1YThkOVxcdWE4ZTAtXFx1YThmMVxcdWE4ZmYtXFx1YTkwOVxcdWE5MjYtXFx1YTkyZFxcdWE5NDctXFx1YTk1M1xcdWE5ODAtXFx1YTk4M1xcdWE5YjMtXFx1YTljMFxcdWE5ZDAtXFx1YTlkOVxcdWE5ZTVcXHVhOWYwLVxcdWE5ZjlcXHVhYTI5LVxcdWFhMzZcXHVhYTQzXFx1YWE0Y1xcdWFhNGRcXHVhYTUwLVxcdWFhNTlcXHVhYTdiLVxcdWFhN2RcXHVhYWIwXFx1YWFiMi1cXHVhYWI0XFx1YWFiN1xcdWFhYjhcXHVhYWJlXFx1YWFiZlxcdWFhYzFcXHVhYWViLVxcdWFhZWZcXHVhYWY1XFx1YWFmNlxcdWFiZTMtXFx1YWJlYVxcdWFiZWNcXHVhYmVkXFx1YWJmMC1cXHVhYmY5XFx1ZmIxZVxcdWZlMDAtXFx1ZmUwZlxcdWZlMjAtXFx1ZmUyZlxcdWZlMzNcXHVmZTM0XFx1ZmU0ZC1cXHVmZTRmXFx1ZmYxMC1cXHVmZjE5XFx1ZmYzZmAsXG4vLyB9O1xuXG4vLyAvLy8gQm9vdHN0cmFwXG4vLyBleHBvcnQgY29uc3QgcmVhZHkgPSAoZW50aXRpZXMucmVhZHkgPSBzdXBwb3J0ZWRcbi8vICAgPyBQcm9taXNlLnJlc29sdmUoKVxuLy8gICA6IHJlcGxhY2VVbnN1cHBvcnRlZEV4cHJlc3Npb25zKCkpO1xuIiwiY29uc3QgZGVmYXVsdHMgPSB7XG4gIGFsaWFzZXM6IFsncHMnLCAnZXBzJ10sXG4gIHN5bnRheDogJ3Bvc3RzY3JpcHQnLFxufTtcblxuY29uc3Qga2V5d29yZHMgPVxuICAnYWJzIGFkZCBhbG9hZCBhbmNob3JzZWFyY2ggYW5kIGFyYyBhcmNuIGFyY3QgYXJjdG8gYXJyYXkgYXNob3cgYXN0b3JlIGF0YW4gYXdpZHRoc2hvdyBiZWdpbiBiaW5kIGJpdHNoaWZ0IGJ5dGVzYXZhaWxhYmxlIGNhY2hlc3RhdHVzIGNlaWxpbmcgY2hhcnBhdGggY2xlYXIgY2xlYXJ0b21hcmsgY2xlYXJkaWN0c3RhY2sgY2xpcCBjbGlwcGF0aCBjbG9zZWZpbGUgY2xvc2VwYXRoIGNvbG9yaW1hZ2UgY29uY2F0IGNvbmNhdG1hdHJpeCBjb25kaXRpb24gY29uZmlndXJhdGlvbmVycm9yIGNvcHkgY29weXBhZ2UgY29zIGNvdW50IGNvdW50ZGljdHN0YWNrIGNvdW50ZXhlY3N0YWNrIGNvdW50dG9tYXJrIGNzaG93IGN1cnJlbnRibGFja2dlbmVyYXRpb24gY3VycmVudGNhY2hlcGFyYW1zIGN1cnJlbnRjbXlrY29sb3IgY3VycmVudGNvbG9yIGN1cnJlbnRjb2xvcnJlbmRlcmluZyBjdXJyZW50Y29sb3JzY3JlZW4gY3VycmVudGNvbG9yc3BhY2UgY3VycmVudGNvbG9ydHJhbnNmZXIgY3VycmVudGNvbnRleHQgY3VycmVudGRhc2ggY3VycmVudGRldnBhcmFtcyBjdXJyZW50ZGljdCBjdXJyZW50ZmlsZSBjdXJyZW50ZmxhdCBjdXJyZW50Zm9udCBjdXJyZW50Z2xvYmFsIGN1cnJlbnRncmF5IGN1cnJlbnRnc3RhdGUgY3VycmVudGhhbGZ0b25lIGN1cnJlbnRoYWxmdG9uZXBoYXNlIGN1cnJlbnRoc2Jjb2xvciBjdXJyZW50bGluZWNhcCBjdXJyZW50bGluZWpvaW4gY3VycmVudGxpbmV3aWR0aCBjdXJyZW50bWF0cml4IGN1cnJlbnRtaXRlcmxpbWl0IGN1cnJlbnRvYmplY3Rmb3JtYXQgY3VycmVudHBhY2tpbmcgY3VycmVudHBhZ2VkZXZpY2UgY3VycmVudHBvaW50IGN1cnJlbnRyZ2Jjb2xvciBjdXJyZW50c2NyZWVuIGN1cnJlbnRzaGFyZWQgY3VycmVudHN0cm9rZWFkanVzdCBjdXJyZW50c3lzdGVtcGFyYW1zIGN1cnJlbnR0cmFuc2ZlciBjdXJyZW50dW5kZXJjb2xvcnJlbW92YWwgY3VycmVudHVzZXJwYXJhbXMgY3VydmV0byBjdmkgY3ZsaXQgY3ZuIGN2ciBjdnJzIGN2cyBjdnggZGVmIGRlZmF1bHRtYXRyaXggZGVmaW5lZm9udCBkZWZpbmVyZXNvdXJjZSBkZWZpbmV1c2VybmFtZSBkZWZpbmV1c2Vyb2JqZWN0IGRlbGV0ZWZpbGUgZGV0YWNoIGRldmljZWluZm8gZGljdCBkaWN0ZnVsbCBkaWN0c3RhY2sgZGljdHN0YWNrb3ZlcmZsb3cgZGljdHN0YWNrdW5kZXJmbG93IGRpdiBkdHJhbnNmb3JtIGR1cCBlY2hvIGVleGVjIGVuZCBlb2NsaXAgZW9maWxsIGVvdmlld2NsaXAgZXEgZXJhc2VwYWdlIGVycm9yZGljdCBleGNoIGV4ZWMgZXhlY2Zvcm0gZXhlY3N0YWNrIGV4ZWNzdGFja292ZXJmbG93IGV4ZWN1c2Vyb2JqZWN0IGV4ZWN1dGVvbmx5IGV4ZWN1dGl2ZSBleGl0IGV4cCBmYWxzZSBmaWxlIGZpbGVuYW1lZm9yYWxsIGZpbGVwb3NpdGlvbiBmaWxsIGZpbHRlciBmaW5kZW5jb2RpbmcgZmluZGZvbnQgZmluZHJlc291cmNlIGZsYXR0ZW5wYXRoIGZsb29yIGZsdXNoIGZsdXNoZmlsZSBGb250RGlyZWN0b3J5IGZvciBmb3JhbGwgZm9yayBnZSBnZXQgZ2V0aW50ZXJ2YWwgZ2xvYmFsZGljdCBHbG9iYWxGb250RGlyZWN0b3J5IGdseXBoc2hvdyBncmVzdG9yZSBncmVzdG9yZWFsbCBnc2F2ZSBnc3RhdGUgZ3QgaGFuZGxlZXJyb3IgaWRlbnRtYXRyaXggaWRpdiBpZHRyYW5zZm9ybSBpZiBpZmVsc2UgaW1hZ2UgaW1hZ2VtYXNrIGluZGV4IGluZW9maWxsIGluZmlsbCBpbml0Y2xpcCBpbml0Z3JhcGhpY3MgaW5pdG1hdHJpeCBpbml0dmlld2NsaXAgaW5zdHJva2UgaW50ZXJuYWxkaWN0IGludGVycnVwdCBpbnVlb2ZpbGwgaW51ZmlsbCBpbnVzdHJva2UgaW52YWxpZGFjY2VzcyBpbnZhbGlkY29udGV4dCBpbnZhbGlkZXhpdCBpbnZhbGlkZmlsZWFjY2VzcyBpbnZhbGlkZm9udCBpbnZhbGlkaWQgaW52YWxpZHJlc3RvcmUgaW52ZXJ0bWF0cml4IGlvZXJyb3IgSVNPTGF0aW4xRW5jb2RpbmcgaXRyYW5zZm9ybSBqb2luIGtzaG93IGtub3duIGxhbmd1YWdlbGV2ZWwgbGUgbGVuZ3RoIGxpbWl0Y2hlY2sgbGluZXRvIGxuIGxvYWQgbG9jayBsb2cgbG9vcCBsdCBtYWtlZm9udCBtYWtlcGF0dGVybiBtYXJrIG1hdHJpeCBtYXhsZW5ndGggbW9kIG1vbml0b3IgbW92ZXRvIG11bCBuZSBuZWcgbmV3cGF0aCBub2FjY2VzcyBub2N1cnJlbnRwb2ludCBub3Qgbm90aWZ5IG51bGwgbnVsbGRldmljZSBvciBwYWNrZWRhcnJheSBwYXRoYmJveCBwYXRoZm9yYWxsIHBvcCBwcmludCBwcmludG9iamVjdCBwcm9kdWN0IHByb21wdCBwc3RhY2sgcHV0IHB1dGludGVydmFsIHF1aXQgcmFuZCByYW5nZWNoZWNrIHJjdXJ2ZXRvIHJlYWQgcmVhZGhleHN0cmluZyByZWFkbGluZSByZWFkb25seSByZWFkc3RyaW5nIHJlYWx0aW1lIHJlY3RjbGlwIHJlY3RmaWxsIHJlY3RzdHJva2UgcmVjdHZpZXdjbGlwIHJlbmFtZWZpbGUgcmVwZWF0IHJlc2V0ZmlsZSByZXNvdXJjZWZvcmFsbCByZXNvdXJjZXN0YXR1cyByZXN0b3JlIHJldmVyc2VwYXRoIHJldmlzaW9uIHJsaW5ldG8gcm1vdmV0byByb2xsIHJvb3Rmb250IHJvdGF0ZSByb3VuZCBycmFuZCBydW4gc2F2ZSBzY2FsZSBzY2FsZWZvbnQgc2NoZWNrIHNlYXJjaCBzZWxlY3Rmb250IHNlcmlhbG51bWJlciBzZXRiYm94IHNldGJsYWNrZ2VuZXJhdGlvbiBzZXRjYWNoZWRldmljZSBzZXRjYWNoZWRldmljZTIgc2V0Y2FjaGVsaW1pdCBzZXRjYWNoZXBhcmFtcyBzZXRjaGFyd2lkdGggc2V0Y215a2NvbG9yIHNldGNvbG9yIHNldGNvbG9ycmVuZGVyaW5nIHNldGNvbG9yc2NyZWVuIHNldGNvbG9yc3BhY2Ugc2V0Y29sb3J0cmFuc2ZlciBzZXRkYXNoIHNldGRldnBhcmFtcyBzZXRmaWxlcG9zaXRpb24gc2V0ZmxhdCBzZXRmb250IHNldGdsb2JhbCBzZXRncmF5IHNldGdzdGF0ZSBzZXRoYWxmdG9uZSBzZXRoYWxmdG9uZXBoYXNlIHNldGhzYmNvbG9yIHNldGxpbmVjYXAgc2V0bGluZWpvaW4gc2V0bGluZXdpZHRoIHNldG1hdHJpeCBzZXRtaXRlcmxpbWl0IHNldG9iamVjdGZvcm1hdCBzZXRvdmVycHJpbnQgc2V0cGFja2luZyBzZXRwYWdlZGV2aWNlIHNldHBhdHRlcm4gc2V0cmdiY29sb3Igc2V0c2NyZWVuIHNldHNoYXJlZCBzZXRzdHJva2VhZGp1c3Qgc2V0c3lzdGVtcGFyYW1zIHNldHRyYW5zZmVyIHNldHVjYWNoZXBhcmFtcyBzZXR1bmRlcmNvbG9ycmVtb3ZhbCBzZXR1c2VycGFyYW1zIHNldHZtdGhyZXNob2xkIHNoYXJlZGRpY3Qgc2hvdyBzaG93cGFnZSBzaW4gc3FydCBzcmFuZCBzdGFjayBzdGFja292ZXJmbG93IHN0YWNrdW5kZXJmbG93IFN0YW5kYXJkRW5jb2Rpbmcgc3RhcnQgc3RhcnRqb2Igc3RhdHVzIHN0YXR1c2RpY3Qgc3RvcCBzdG9wcGVkIHN0b3JlIHN0cmluZyBzdHJpbmd3aWR0aCBzdHJva2Ugc3Ryb2tlcGF0aCBzdWIgc3ludGF4ZXJyb3Igc3lzdGVtZGljdCB0aW1lb3V0IHRyYW5zZm9ybSB0cmFuc2xhdGUgdHJ1ZSB0cnVuY2F0ZSB0eXBlIHR5cGVjaGVjayB0b2tlbiB1YXBwZW5kIHVjYWNoZSB1Y2FjaGVzdGF0dXMgdWVvZmlsbCB1ZmlsbCB1bmRlZiB1bmRlZmluZWQgdW5kZWZpbmVkZmlsZW5hbWUgdW5kZWZpbmVyZXNvdXJjZSB1bmRlZmluZWRyZXN1bHQgdW5kZWZpbmVmb250IHVuZGVmaW5lcmVzb3VyY2UgdW5kZWZpbmVkcmVzb3VyY2UgdW5kZWZpbmV1c2Vyb2JqZWN0IHVubWF0Y2hlZG1hcmsgdW5yZWdpc3RlcmVkIHVwYXRoIHVzZXJkaWN0IFVzZXJPYmplY3RzIHVzZXJ0aW1lIHVzdHJva2UgdXN0cm9rZXBhdGggdmVyc2lvbiB2aWV3Y2xpcCB2aWV3Y2xpcHBhdGggVk1lcnJvciB2bXJlY2xhaW0gdm1zdGF0dXMgd2FpdCB3Y2hlY2sgd2hlcmUgd2lkdGhzaG93IHdyaXRlIHdyaXRlaGV4c3RyaW5nIHdyaXRlb2JqZWN0IHdyaXRlc3RyaW5nIHd0cmFuc2xhdGlvbiB4Y2hlY2sgeG9yIHhzaG93IHh5c2hvdyB5aWVsZCB5c2hvdyc7XG4vLyBjb25zdCBxdW90ZXMgPSBgKOKApikgPOKApj4gPH7igKZ+PmA7XG5jb25zdCBlbmNsb3N1cmVzID0gYHvigKZ9IFvigKZdIDw84oCmPj4gKOKApikgPH7igKZ+PiA84oCmPmA7XG5jb25zdCBjb21tZW50cyA9IGAl4oCmXFxuYDtcblxuLy8vIFBBVFRFUk5TXG5jb25zdCBDT01NRU5UUyA9IC8lLztcbmNvbnN0IE9QRVJBVE9SUyA9IC9cXC9cXC98XFwvfD17MSwyfS87XG5jb25zdCBFTkNMT1NVUkVTID0gLzw8fD4+fHt8fXxcXFt8XFxdLztcbmNvbnN0IFFVT1RFUyA9IC88fnx+Pnw8fD58XFwofFxcKS87XG5jb25zdCBXSElURVNQQUNFID0gL1tcXHNcXG5dKy87IC8vIC9bXFwwXFx4MDlcXHgwQVxceDBDXFx4MERcXHgyMF0vO1xuXG4vLyBOVU1CRVJTXG5jb25zdCBERUNJTUFMID0gL1srXFwtXT9cXGQrXFwuP3xbK1xcLV0/XFxkKlxcLlxcZCsvO1xuY29uc3QgRVhQT05FTlRJQUwgPSAvXFxkK1tlRV1cXC0/XFxkK3xcXGQrXFwuXFxkK1tlRV1cXC0/XFxkKy87XG5jb25zdCBSQURJWCA9IC9bMi05XSNcXGQrfDFcXGQjW1xcZGEtakEtSl0rfDJcXGQjW1xcZGEtdEEtVF0rfDNbMC02XVtcXGRhLXpBLVpdKy87XG5cbi8vIE5BTUVTXG5jb25zdCBOQU1FID0gL1tcXGRhLXpBLVokQC5cXC1dKy87XG5cbi8vIFNUUklOR1NcbmNvbnN0IEFTQ0lJMTYgPSAvKD86W1xcZGEtZkEtRl17Mn0pKltcXGRhLWZBLUZdezEsMn0vO1xuY29uc3QgQVNDSUk4NSA9IC8oPzpbIS11el17NH0pKlshLXV6XXsxLDR9Lztcbi8vIGNvbnN0IFNUUklORyA9IC9cXCgoPzpbXlxcXFxdfFxcXFwufFxcKCg/OlteXFxcXF18XFxcXC58LikqP1xcKVteKCldK1xcKSlcXCkvXG4vLyBjb25zdCBTVFJJTkcgPSAvXFwoKD86W15cXFxcXXxcXFxcLnxcXCgoPzpbXlxcXFxdfFxcXFwufC4pKlxcKVteKCldK1xcKSlcXCkvXG4vLyBjb25zdCBTVFJJTkcgPSAvXFwoKD86W15cXFxcXXxcXFxcLnxcXCgoPzpbXlxcXFxdKj98XFxcXC4pKj9cXClbXigpXFxcXF0qXFwpKSs/XFwpL1xuLy8gY29uc3QgU1RSSU5HID0gL1xcKCg/OlteKCldKnxcXCguKj9cXClbXigpXSpcXCkpKlxcKS9cblxuZXhwb3J0IGNvbnN0IHBvc3RzY3JpcHQgPSBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhcbiAgKHtzeW1ib2xzLCBjbG9zdXJlcywgc2VxdWVuY2V9LCB7YWxpYXNlcywgc3ludGF4fSA9IGRlZmF1bHRzKSA9PiAoe1xuICAgIHN5bnRheCxcbiAgICBrZXl3b3JkczogU3ltYm9scy5mcm9tKGtleXdvcmRzKSxcbiAgICBxdW90ZXM6IGNsb3N1cmVzKHF1b3RlcyksXG4gICAgY2xvc3VyZXM6IGNsb3N1cmVzKGVuY2xvc3VyZXMpLFxuICAgIHBhdHRlcm5zOiB7XG4gICAgICBtYXliZUlkZW50aWZpZXI6IG5ldyBSZWdFeHAoYF4ke05BTUUuc291cmNlfSRgKSxcbiAgICB9LFxuICAgIG1hdGNoZXI6IHNlcXVlbmNlYCgke1dISVRFU1BBQ0V9KXwoJHthbGwoQ09NTUVOVFMsIE9QRVJBVE9SUywgRU5DTE9TVVJFUywgUVVPVEVTKX0pfCgke2FsbChcbiAgICAgIERFQ0lNQUwsXG4gICAgICBFWFBPTkVOVElBTCxcbiAgICAgIFJBRElYLFxuICAgICAgTkFNRSxcbiAgICApfSlgLFxuICAgIG1hdGNoZXJzOiB7XG4gICAgICAvLyAnKCc6IC8oXFxcXD9cXG4pfChcXFxcLnwoPzpbXigpXSt8XFwoLipcXCl8KSkvXG4gICAgfSxcbiAgfSksXG4gIHtcbiAgICBkZWZhdWx0czoge2dldDogKCkgPT4gKHsuLi5kZWZhdWx0c30pfSxcbiAgfSxcbik7XG5cbi8vIC4uLihtb2Rlc1tzeW50YXhdID0ge3N5bnRheH0pLFxuXG4vLyAuLi4obW9kZXMuaHRtbCA9IHtzeW50YXg6ICdodG1sJ30pLFxuLy8ga2V5d29yZHM6IHN5bWJvbHMoJ0RPQ1RZUEUgZG9jdHlwZScpLFxuLy8gY29tbWVudHM6IGNsb3N1cmVzKCc8IS0t4oCmLS0+JyksXG4vLyBxdW90ZXM6IFtdLFxuLy8gY2xvc3VyZXM6IGNsb3N1cmVzKCc8JeKApiU+IDwh4oCmPiA84oCmLz4gPC/igKY+IDzigKY+JyksXG4vLyBwYXR0ZXJuczoge1xuLy8gICAuLi5wYXR0ZXJucyxcbi8vICAgY2xvc2VUYWc6IC88XFwvXFx3W148Pnt9XSo/Pi9nLFxuLy8gICBtYXliZUlkZW50aWZpZXI6IC9eKD86KD86W2Etel1bXFwtYS16XSopP1thLXpdK1xcOik/KD86W2Etel1bXFwtYS16XSopP1thLXpdKyQvLFxuLy8gfSxcbi8vIG1hdGNoZXI6IG1hdGNoZXJzLnhtbCxcbi8vIG1hdGNoZXJzOiB7XG4vLyAgIHF1b3RlOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKXxcInwnKS9nLFxuLy8gICBjb21tZW50OiAvKFxcbil8KC0tPikvZyxcbi8vIH0sXG4vLyBpZiAoYWxpYXNlcykgZm9yIChjb25zdCBtb2RlIG9mIHBvc3RzY3JpcHQuYWxpYXNlcykgbW9kZXNbaWRdID0gbW9kZXNbc3ludGF4XTtcbiIsImltcG9ydCB7bWF0Y2hlcnMsIG1vZGVzfSBmcm9tICcuL21hcmt1cC1wYXJzZXIuanMnO1xuaW1wb3J0IHtwYXR0ZXJucywgZW50aXRpZXN9IGZyb20gJy4vbWFya3VwLXBhdHRlcm5zLmpzJztcbmltcG9ydCAqIGFzIGhlbHBlcnMgZnJvbSAnLi9oZWxwZXJzLmpzJztcbmltcG9ydCAqIGFzIGV4dGVuc2lvbnMgZnJvbSAnLi9leHRlbnNpb25zL21vZGVzLmpzJztcblxuLy8vIElOVEVSRkFDRVxuY29uc3QgZGVmaW5pdGlvbnMgPSB7fTtcblxuZXhwb3J0IGNvbnN0IGluc3RhbGwgPSAoZGVmYXVsdHMsIG5ld1N5bnRheGVzID0gZGVmYXVsdHMuc3ludGF4ZXMgfHwge30pID0+IHtcbiAgT2JqZWN0LmFzc2lnbihuZXdTeW50YXhlcywgc3ludGF4ZXMpO1xuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhuZXdTeW50YXhlcywgZGVmaW5pdGlvbnMpO1xuICBkZWZhdWx0cy5zeW50YXhlcyA9PT0gbmV3U3ludGF4ZXMgfHwgKGRlZmF1bHRzLnN5bnRheGVzID0gbmV3U3ludGF4ZXMpO1xufTtcblxuZXhwb3J0IGNvbnN0IHN5bnRheGVzID0ge307XG5cbi8vLyBERUZJTklUSU9OU1xuU3ludGF4ZXM6IHtcbiAgY29uc3Qge0Nsb3N1cmVzLCBTeW1ib2xzLCBzZXF1ZW5jZSwgYWxsLCByYXd9ID0gaGVscGVycztcblxuICBDU1M6IHtcbiAgICBjb25zdCBjc3MgPSAoc3ludGF4ZXMuY3NzID0ge1xuICAgICAgLi4uKG1vZGVzLmNzcyA9IHtzeW50YXg6ICdjc3MnfSksXG4gICAgICBjb21tZW50czogQ2xvc3VyZXMuZnJvbSgnLyrigKYqLycpLFxuICAgICAgY2xvc3VyZXM6IENsb3N1cmVzLmZyb20oJ3vigKZ9ICjigKYpIFvigKZdJyksXG4gICAgICBxdW90ZXM6IFN5bWJvbHMuZnJvbShgJyBcImApLFxuICAgICAgYXNzaWduZXJzOiBTeW1ib2xzLmZyb20oYDpgKSxcbiAgICAgIGNvbWJpbmF0b3JzOiBTeW1ib2xzLmZyb20oJz4gOjogKyA6JyksXG4gICAgICBub25icmVha2VyczogU3ltYm9scy5mcm9tKGAtYCksXG4gICAgICBicmVha2VyczogU3ltYm9scy5mcm9tKCcsIDsnKSxcbiAgICAgIHBhdHRlcm5zOiB7Li4ucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogLyhbXFxzXFxuXSspfChcXFxcKD86KD86XFxcXFxcXFwpKlxcXFx8W15cXFxcXFxzXSk/fFxcL1xcKnxcXCpcXC98XFwofFxcKXxcXFt8XFxdfFwifCd8XFx7fFxcfXwsfDt8XFwufFxcYjpcXC9cXC9cXGJ8OjpcXGJ8Oig/IWFjdGl2ZXxhZnRlcnxhbnl8YW55LWxpbmt8YmFja2Ryb3B8YmVmb3JlfGNoZWNrZWR8ZGVmYXVsdHxkZWZpbmVkfGRpcnxkaXNhYmxlZHxlbXB0eXxlbmFibGVkfGZpcnN0fGZpcnN0LWNoaWxkfGZpcnN0LWxldHRlcnxmaXJzdC1saW5lfGZpcnN0LW9mLXR5cGV8Zm9jdXN8Zm9jdXMtdmlzaWJsZXxmb2N1cy13aXRoaW58ZnVsbHNjcmVlbnxob3N0fGhvdmVyfGluLXJhbmdlfGluZGV0ZXJtaW5hdGV8aW52YWxpZHxsYW5nfGxhc3QtY2hpbGR8bGFzdC1vZi10eXBlfGxlZnR8bGlua3xtYXRjaGVzfG5vdHxudGgtY2hpbGR8bnRoLWxhc3QtY2hpbGR8bnRoLWxhc3Qtb2YtdHlwZXxudGgtb2YtdHlwZXxvbmx5LWNoaWxkfG9ubHktb2YtdHlwZXxvcHRpb25hbHxvdXQtb2YtcmFuZ2V8cmVhZC1vbmx5fHJlcXVpcmVkfHJpZ2h0fHJvb3R8c2NvcGV8dGFyZ2V0fHZhbGlkfHZpc2l0ZWQpKS9nLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IG1hdGNoZXJzLmVzY2FwZXMsXG4gICAgICAgIGNvbW1lbnQ6IG1hdGNoZXJzLmNvbW1lbnRzLFxuICAgICAgfSxcbiAgICB9KTtcbiAgfVxuXG4gIEhUTUw6IHtcbiAgICBjb25zdCBodG1sID0gKHN5bnRheGVzLmh0bWwgPSB7XG4gICAgICAuLi4obW9kZXMuaHRtbCA9IHtzeW50YXg6ICdodG1sJ30pLFxuICAgICAga2V5d29yZHM6IFN5bWJvbHMuZnJvbSgnRE9DVFlQRSBkb2N0eXBlJyksXG4gICAgICBjb21tZW50czogQ2xvc3VyZXMuZnJvbSgnPCEtLeKApi0tPicpLFxuICAgICAgY2xvc3VyZXM6IENsb3N1cmVzLmZyb20oJzwl4oCmJT4gPCHigKY+IDzigKYvPiA8L+KApj4gPOKApj4nKSxcbiAgICAgIHF1b3RlczogW10sXG4gICAgICBwYXR0ZXJuczoge1xuICAgICAgICAuLi5wYXR0ZXJucyxcbiAgICAgICAgY2xvc2VUYWc6IC88XFwvXFx3W148Pnt9XSo/Pi9nLFxuICAgICAgICBtYXliZUlkZW50aWZpZXI6IC9eKD86KD86W2Etel1bXFwtYS16XSopP1thLXpdK1xcOik/KD86W2Etel1bXFwtYS16XSopP1thLXpdKyQvLFxuICAgICAgfSxcbiAgICAgIG1hdGNoZXI6IG1hdGNoZXJzLnhtbCxcbiAgICAgIG1hdGNoZXJzOiB7XG4gICAgICAgIHF1b3RlOiAvKFxcbil8KFxcXFwoPzooPzpcXFxcXFxcXCkqXFxcXHxbXlxcXFxcXHNdKXxcInwnKS9nLFxuICAgICAgICBjb21tZW50OiAvKFxcbil8KC0tPikvZyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICB7XG4gICAgICBjb25zdCBET0NUQUdTID0gU3ltYm9scy5mcm9tKCdTQ1JJUFQgU1RZTEUnKTtcbiAgICAgIGNvbnN0IFRBRyA9IC9eW2Etel0rJC9pO1xuICAgICAgLy8gVE9ETzogQ2hlY2sgaWYgY3VzdG9tL25hbWVzcGFjZSB0YWdzIGV2ZXIgbmVlZCBzcGVjaWFsIGNsb3NlIGxvZ2ljXG4gICAgICAvLyBjb25zdCBUQUdMSUtFID0gL14oPzooPzpbYS16XVtcXC1hLXpdKik/W2Etel0rXFw6KT8oPzpbYS16XVtcXC1hLXpdKik/W2Etel0rJC9pO1xuXG4gICAgICBjb25zdCBIVE1MVGFnQ2xvc3VyZSA9IGh0bWwuY2xvc3VyZXMuZ2V0KCc8Jyk7XG5cbiAgICAgIEhUTUxUYWdDbG9zdXJlLmNsb3NlID0gKG5leHQsIHN0YXRlLCBjb250ZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IHBhcmVudCA9IG5leHQgJiYgbmV4dC5wYXJlbnQ7XG4gICAgICAgIGNvbnN0IGZpcnN0ID0gcGFyZW50ICYmIHBhcmVudC5uZXh0O1xuICAgICAgICBjb25zdCB0YWcgPSBmaXJzdCAmJiBmaXJzdC50ZXh0ICYmIFRBRy50ZXN0KGZpcnN0LnRleHQpICYmIGZpcnN0LnRleHQudG9VcHBlckNhc2UoKTtcblxuICAgICAgICBpZiAodGFnICYmIERPQ1RBR1MuaW5jbHVkZXModGFnKSkge1xuICAgICAgICAgIC8vIFRPRE86IFVuY29tbWVudCBvbmNlIHRva2VuIGJ1ZmZlcmluZyBpcyBpbXBsZW1lbnRlZFxuICAgICAgICAgIC8vIHRhZyAmJiAoZmlyc3QudHlwZSA9ICdrZXl3b3JkJyk7XG5cbiAgICAgICAgICBsZXQge3NvdXJjZSwgaW5kZXh9ID0gc3RhdGU7XG4gICAgICAgICAgY29uc3QgJCRtYXRjaGVyID0gc3ludGF4ZXMuaHRtbC5wYXR0ZXJucy5jbG9zZVRhZztcblxuICAgICAgICAgIGxldCBtYXRjaDsgLy8gID0gJCRtYXRjaGVyLmV4ZWMoc291cmNlKTtcbiAgICAgICAgICAkJG1hdGNoZXIubGFzdEluZGV4ID0gaW5kZXg7XG5cbiAgICAgICAgICAvLyBUT0RPOiBDaGVjayBpZiBgPHNjcmlwdD5g4oCmYDwvU0NSSVBUPmAgaXMgc3RpbGwgdmFsaWQhXG4gICAgICAgICAgY29uc3QgJCRjbG9zZXIgPSBuZXcgUmVnRXhwKHJhd2BePFxcLyg/OiR7Zmlyc3QudGV4dC50b0xvd2VyQ2FzZSgpfXwke3RhZ30pXFxiYCk7XG5cbiAgICAgICAgICBsZXQgc3ludGF4ID0gKHRhZyA9PT0gJ1NUWUxFJyAmJiAnY3NzJykgfHwgJyc7XG5cbiAgICAgICAgICBpZiAoIXN5bnRheCkge1xuICAgICAgICAgICAgY29uc3Qgb3BlblRhZyA9IHNvdXJjZS5zbGljZShwYXJlbnQub2Zmc2V0LCBpbmRleCk7XG4gICAgICAgICAgICBjb25zdCBtYXRjaCA9IC9cXHN0eXBlPS4qP1xcYiguKz8pXFxiLy5leGVjKG9wZW5UYWcpO1xuICAgICAgICAgICAgc3ludGF4ID1cbiAgICAgICAgICAgICAgdGFnID09PSAnU0NSSVBUJyAmJiAoIW1hdGNoIHx8ICFtYXRjaFsxXSB8fCAvXm1vZHVsZSR8amF2YXNjcmlwdC9pLnRlc3QobWF0Y2hbMV0pKVxuICAgICAgICAgICAgICAgID8gJ2VzJ1xuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7c3ludGF4LCB0YWcsIG1hdGNoLCBvcGVuVGFnfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgd2hpbGUgKChtYXRjaCA9ICQkbWF0Y2hlci5leGVjKHNvdXJjZSkpKSB7XG4gICAgICAgICAgICBpZiAoJCRjbG9zZXIudGVzdChtYXRjaFswXSkpIHtcbiAgICAgICAgICAgICAgaWYgKHN5bnRheCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB7b2Zmc2V0OiBpbmRleCwgaW5kZXg6IG1hdGNoLmluZGV4LCBzeW50YXh9O1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IG9mZnNldCA9IGluZGV4O1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSBzb3VyY2Uuc2xpY2Uob2Zmc2V0LCBtYXRjaC5pbmRleCAtIDEpO1xuICAgICAgICAgICAgICAgIHN0YXRlLmluZGV4ID0gbWF0Y2guaW5kZXg7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFt7dGV4dCwgb2Zmc2V0LCBwcmV2aW91czogbmV4dCwgcGFyZW50fV07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBIVE1MVGFnQ2xvc3VyZS5xdW90ZXMgPSBTeW1ib2xzLmZyb20oYCcgXCJgKTtcbiAgICAgIEhUTUxUYWdDbG9zdXJlLmNsb3NlciA9IC9cXC8/Pi87XG5cbiAgICAgIC8vIFRPRE86IEFsbG93IGdyb3VwaW5nLWxldmVsIHBhdHRlcm5zIGZvciBIVE1MIGF0dHJpYnV0ZXMgdnMgdGV4dFxuICAgICAgLy8gaHRtbC5jbG9zdXJlc1snPCddLnBhdHRlcm5zID0geyBtYXliZUlkZW50aWZpZXI6IFRBR0xJS0UgfTtcbiAgICB9XG4gIH1cblxuICBNYXJrZG93bjoge1xuICAgIGNvbnN0IEJMT0NLID0gJ2BgYOKApmBgYCB+fn7igKZ+fn4nO1xuICAgIGNvbnN0IElOTElORSA9ICdb4oCmXSAo4oCmKSAq4oCmKiAqKuKApioqIF/igKZfIF9f4oCmX18gfuKApn4gfn7igKZ+fic7XG4gICAgLyoqXG4gICAgICogVE9ETzogQWRkcmVzcyB1bmV4cGVjdGVkIGNsb3N1cmVzIGluIHBhcnNpbmcgZnJhZ21lbnRlclxuICAgICAqXG4gICAgICogQXMgZmFyIGFzIHRva2VuaXphdGlvbiBnb2VzLCB1bmV4cGVjdGVkIGNsb3N1cmVzIGFyZSBzdGlsbFxuICAgICAqIGNsb3N1cmVzIG5vbmV0aGVsZXNzLiBUaGV5IGFyZSBub3Qgc3BhbnMuXG4gICAgICovXG4gICAgY29uc3QgU1BBTlMgPSAnJzsgLy8gSU5MSU5FXG4gICAgY29uc3QgQ0xPU1VSRVMgPSBTUEFOUyA/IEJMT0NLIDogYCR7QkxPQ0t9ICR7SU5MSU5FfWA7XG5cbiAgICBjb25zdCBodG1sID0gc3ludGF4ZXMuaHRtbDtcbiAgICBjb25zdCBtZCA9IChzeW50YXhlcy5tZCA9IHtcbiAgICAgIC4uLihtb2Rlcy5tYXJrZG93biA9IG1vZGVzLm1kID0ge3N5bnRheDogJ21kJ30pLFxuICAgICAgY29tbWVudHM6IENsb3N1cmVzLmZyb20oJzwhLS3igKYtLT4nKSxcbiAgICAgIHF1b3RlczogW10sXG4gICAgICBjbG9zdXJlczogQ2xvc3VyZXMuZnJvbShodG1sLmNsb3N1cmVzLCBDTE9TVVJFUyksXG4gICAgICBwYXR0ZXJuczogey4uLmh0bWwucGF0dGVybnN9LFxuICAgICAgbWF0Y2hlcjogLyheXFxzK3xcXG4pfCgmI3g/W2EtZjAtOV0rO3wmW2Etel0rO3woPzpgYGArfFxcflxcflxcfit8LS0rfD09K3woPzpcXCN7MSw2fXxcXC18XFxiXFxkK1xcLnxcXGJbYS16XVxcLnxcXGJbaXZ4XStcXC4pKD89XFxzK1xcUyspKXxcInwnfD18XFwvPnw8JXwlPnw8IS0tfC0tPnw8W1xcL1xcIV0/KD89W2Etel0rXFw6P1thLXpcXC1dKlthLXpdfFthLXpdKyl8PHw+fFxcKHxcXCl8XFxbfFxcXXxfXz98KFsqfmBdKVxcMz9cXGJ8XFxiKFsqfmBdKVxcND8pfFxcYlteXFxuXFxzXFxbXFxdXFwoXFwpXFw8XFw+Jl0qW15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mX11cXGJ8W15cXG5cXHNcXFtcXF1cXChcXClcXDxcXD4mXSsoPz1fXz9cXGIpL2dpbSxcbiAgICAgIHNwYW5zOiB1bmRlZmluZWQsXG4gICAgICBtYXRjaGVyczoge2NvbW1lbnQ6IC8oXFxuKXwoLS0+KS9nfSxcbiAgICB9KTtcblxuICAgIGlmIChtZC5jbG9zdXJlcykge1xuICAgICAgY29uc3QgU1lOVEFYID0gL15cXHcrJC87XG5cbiAgICAgIGNvbnN0IHByZXZpb3VzVGV4dEZyb20gPSAodG9rZW4sIG1hdGNoZXIpID0+IHtcbiAgICAgICAgY29uc3QgdGV4dCA9IFtdO1xuICAgICAgICBpZiAobWF0Y2hlciAhPSBudWxsKSB7XG4gICAgICAgICAgaWYgKG1hdGNoZXIudGVzdClcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIudGVzdCh0b2tlbi50ZXh0KSk7XG4gICAgICAgICAgZWxzZSBpZiAobWF0Y2hlci5pbmNsdWRlcylcbiAgICAgICAgICAgIGRvIHRva2VuLnRleHQgJiYgdGV4dC5wdXNoKHRva2VuLnRleHQpLCAodG9rZW4gPSB0b2tlbi5wcmV2aW91cyk7XG4gICAgICAgICAgICB3aGlsZSAoIXRva2VuLnRleHQgfHwgIW1hdGNoZXIuaW5jbHVkZXModG9rZW4udGV4dCkpO1xuICAgICAgICAgIHRleHQubGVuZ3RoICYmIHRleHQucmV2ZXJzZSgpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0ZXh0LmpvaW4oJycpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgaW5kZW50ZXIgPSAoaW5kZW50aW5nLCB0YWJzID0gMikgPT4ge1xuICAgICAgICBsZXQgc291cmNlID0gaW5kZW50aW5nO1xuICAgICAgICBjb25zdCBpbmRlbnQgPSBuZXcgUmVnRXhwKHJhd2AoPzpcXHR8JHsnICcucmVwZWF0KHRhYnMpfSlgLCAnZycpO1xuICAgICAgICBzb3VyY2UgPSBzb3VyY2UucmVwbGFjZSgvXFxcXD8oPz1bXFwoXFwpXFw6XFw/XFxbXFxdXSkvZywgJ1xcXFwnKTtcbiAgICAgICAgc291cmNlID0gc291cmNlLnJlcGxhY2UoaW5kZW50LCBpbmRlbnQuc291cmNlKTtcbiAgICAgICAgcmV0dXJuIG5ldyBSZWdFeHAoYF4ke3NvdXJjZX1gLCAnbScpO1xuICAgICAgfTtcblxuICAgICAgY29uc3QgRU1CRURERUQgPSB0cnVlO1xuICAgICAge1xuICAgICAgICBjb25zdCBvcGVuID0gKHBhcmVudCwgc3RhdGUsIGdyb3VwZXIpID0+IHtcbiAgICAgICAgICBjb25zdCB7c291cmNlLCBpbmRleDogc3RhcnR9ID0gc3RhdGU7XG4gICAgICAgICAgY29uc3QgZmVuY2UgPSBwYXJlbnQudGV4dDtcbiAgICAgICAgICBjb25zdCBmZW5jaW5nID0gcHJldmlvdXNUZXh0RnJvbShwYXJlbnQsICdcXG4nKTtcbiAgICAgICAgICBjb25zdCBpbmRlbnRpbmcgPSBmZW5jaW5nLnNsaWNlKGZlbmNpbmcuaW5kZXhPZignXFxuJykgKyAxLCAtZmVuY2UubGVuZ3RoKSB8fCAnJztcbiAgICAgICAgICBsZXQgZW5kID0gc291cmNlLmluZGV4T2YoYFxcbiR7ZmVuY2luZ31gLCBzdGFydCk7XG4gICAgICAgICAgY29uc3QgSU5ERU5UID0gaW5kZW50ZXIoaW5kZW50aW5nKTtcbiAgICAgICAgICBjb25zdCBDTE9TRVIgPSBuZXcgUmVnRXhwKHJhd2BcXG4ke0lOREVOVC5zb3VyY2Uuc2xpY2UoMSl9JHtmZW5jZX1gLCAnZycpO1xuXG4gICAgICAgICAgQ0xPU0VSLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICAgIGxldCBjbG9zZXJNYXRjaCA9IENMT1NFUi5leGVjKHNvdXJjZSk7XG4gICAgICAgICAgaWYgKGNsb3Nlck1hdGNoICYmIGNsb3Nlck1hdGNoLmluZGV4ID49IHN0YXJ0KSB7XG4gICAgICAgICAgICBlbmQgPSBjbG9zZXJNYXRjaC5pbmRleCArIDE7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnN0IEZFTkNFID0gbmV3IFJlZ0V4cChyYXdgXFxuP1tcXD5cXHxcXHNdKiR7ZmVuY2V9YCwgJ2cnKTtcbiAgICAgICAgICAgIEZFTkNFLmxhc3RJbmRleCA9IHN0YXJ0O1xuICAgICAgICAgICAgY29uc3QgZmVuY2VNYXRjaCA9IEZFTkNFLmV4ZWMoc291cmNlKTtcbiAgICAgICAgICAgIGlmIChmZW5jZU1hdGNoICYmIGZlbmNlTWF0Y2guaW5kZXggPj0gc3RhcnQpIHtcbiAgICAgICAgICAgICAgZW5kID0gZmVuY2VNYXRjaC5pbmRleCArIDE7XG4gICAgICAgICAgICB9IGVsc2UgcmV0dXJuO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIGlmIChlbmQgPiBzdGFydCkge1xuICAgICAgICAgICAgbGV0IG9mZnNldCA9IHN0YXJ0O1xuICAgICAgICAgICAgbGV0IHRleHQ7XG5cbiAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBzb3VyY2Uuc2xpY2Uoc3RhcnQsIGVuZCkgfHwgJyc7XG4gICAgICAgICAgICBjb25zdCB0b2tlbnMgPSBbXTtcbiAgICAgICAgICAgIHRva2Vucy5lbmQgPSBlbmQ7XG4gICAgICAgICAgICBpZiAoIUVNQkVEREVEKSB7XG4gICAgICAgICAgICAgIHRleHQgPSBib2R5O1xuICAgICAgICAgICAgICB0b2tlbnMucHVzaCh7dGV4dCwgdHlwZTogJ2NvZGUnLCBvZmZzZXQsIHBhcmVudH0pO1xuICAgICAgICAgICAgICBvZmZzZXQgKz0gYm9keS5sZW5ndGg7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBjb25zdCBbaGVhZCwgLi4ubGluZXNdID0gYm9keS5zcGxpdCgvKFxcbikvZyk7XG4gICAgICAgICAgICAgIGlmIChoZWFkKSB7XG4gICAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQ6IGhlYWQsIHR5cGU6ICdjb21tZW50Jywgb2Zmc2V0LCBwYXJlbnR9KSwgKG9mZnNldCArPSBoZWFkLmxlbmd0aCk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgW2luZGVudF0gPSBJTkRFTlQuZXhlYyhsaW5lKSB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBpbnNldCA9IChpbmRlbnQgJiYgaW5kZW50Lmxlbmd0aCkgfHwgMDtcbiAgICAgICAgICAgICAgICBpZiAoaW5zZXQpIHtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgdGV4dCBvZiBpbmRlbnQuc3BsaXQoLyhcXHMrKS9nKSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0eXBlID0gKHRleHQudHJpbSgpICYmICdzZXF1ZW5jZScpIHx8ICd3aGl0ZXNwYWNlJztcbiAgICAgICAgICAgICAgICAgICAgdG9rZW5zLnB1c2goe3RleHQsIHR5cGUsIG9mZnNldCwgcGFyZW50fSk7XG4gICAgICAgICAgICAgICAgICAgIG9mZnNldCArPSB0ZXh0Lmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHRleHQgPSBsaW5lLnNsaWNlKGluc2V0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgdGV4dCA9IGxpbmU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHRva2Vucy5wdXNoKHt0ZXh0LCB0eXBlOiAnY29kZScsIG9mZnNldCwgcGFyZW50fSksIChvZmZzZXQgKz0gdGV4dC5sZW5ndGgpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh7ZmVuY2luZywgYm9keSwgc3RhcnQsIGVuZCwgb2Zmc2V0LCBsaW5lcywgdG9rZW5zfSk7XG4gICAgICAgICAgICBpZiAodG9rZW5zLmxlbmd0aCkgcmV0dXJuIHRva2VucztcbiAgICAgICAgICB9XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgcXVvdGVzID0gaHRtbC5jbG9zdXJlcy5nZXQoJzwnKTtcbiAgICAgICAgZm9yIChjb25zdCBvcGVuZXIgb2YgWydgYGAnLCAnfn5+J10pIHtcbiAgICAgICAgICBjb25zdCBGZW5jZUNsb3N1cmUgPSBtZC5jbG9zdXJlcy5nZXQob3BlbmVyKTtcbiAgICAgICAgICBpZiAoRmVuY2VDbG9zdXJlKSB7XG4gICAgICAgICAgICBGZW5jZUNsb3N1cmUubWF0Y2hlciA9IG5ldyBSZWdFeHAoXG4gICAgICAgICAgICAgIHJhd2AvKFxccypcXG4pfCgke29wZW5lcn0oPz0ke29wZW5lcn1cXHN8JHtvcGVuZXJ9JCl8Xig/OltcXHM+fF0qXFxzKT9cXHMqKXwuKiRgLFxuICAgICAgICAgICAgICAnZ20nLFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIEZlbmNlQ2xvc3VyZS5xdW90ZXMgPSBxdW90ZXM7XG4gICAgICAgICAgICBGZW5jZUNsb3N1cmUub3BlbiA9IG9wZW47XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgRUNNQVNjcmlwdDoge1xuICAgIGNvbnN0IFJFR0VYUFMgPSAvXFwvKD89W15cXCpcXC9cXG5dW15cXG5dKlxcLykoPzpbXlxcXFxcXC9cXG5cXHRcXFtdK3xcXFxcXFxTfFxcWyg/OlxcXFxcXFN8W15cXFxcXFxuXFx0XFxdXSspKz9cXF0pKz9cXC9bYS16XSovZztcbiAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC98XFwvXFwqfFxcKlxcL3xcXC98XlxcI1xcIS4qXFxuL2c7XG4gICAgY29uc3QgUVVPVEVTID0gL2B8XCJ8Jy9nO1xuICAgIGNvbnN0IENMT1NVUkVTID0gL1xce3xcXH18XFwofFxcKXxcXFt8XFxdL2c7XG5cbiAgICBjb25zdCBlcyA9IChzeW50YXhlcy5lcyA9IHtcbiAgICAgIC4uLihtb2Rlcy5qYXZhc2NyaXB0ID0gbW9kZXMuZXMgPSBtb2Rlcy5qcyA9IG1vZGVzLmVjbWFzY3JpcHQgPSB7c3ludGF4OiAnZXMnfSksXG4gICAgICBjb21tZW50czogQ2xvc3VyZXMuZnJvbSgnLy/igKZcXG4gLyrigKYqLycpLFxuICAgICAgcXVvdGVzOiBTeW1ib2xzLmZyb20oYCcgXCIgXFxgYCksXG4gICAgICBjbG9zdXJlczogQ2xvc3VyZXMuZnJvbSgne+KApn0gKOKApikgW+KApl0nKSxcbiAgICAgIHNwYW5zOiB7J2AnOiBDbG9zdXJlcy5mcm9tKCcke+KApn0nKX0sXG4gICAgICBrZXl3b3JkczogU3ltYm9scy5mcm9tKFxuICAgICAgICAvLyBhYnN0cmFjdCBlbnVtIGludGVyZmFjZSBwYWNrYWdlICBuYW1lc3BhY2UgZGVjbGFyZSB0eXBlIG1vZHVsZVxuICAgICAgICAnYXJndW1lbnRzIGFzIGFzeW5jIGF3YWl0IGJyZWFrIGNhc2UgY2F0Y2ggY2xhc3MgY29uc3QgY29udGludWUgZGVidWdnZXIgZGVmYXVsdCBkZWxldGUgZG8gZWxzZSBleHBvcnQgZXh0ZW5kcyBmaW5hbGx5IGZvciBmcm9tIGZ1bmN0aW9uIGdldCBpZiBpbXBvcnQgaW4gaW5zdGFuY2VvZiBsZXQgbmV3IG9mIHJldHVybiBzZXQgc3VwZXIgc3dpdGNoIHRoaXMgdGhyb3cgdHJ5IHR5cGVvZiB2YXIgdm9pZCB3aGlsZSB3aXRoIHlpZWxkJyxcbiAgICAgICksXG4gICAgICBhc3NpZ25lcnM6IFN5bWJvbHMuZnJvbSgnPSArPSAtPSAqPSAvPSAqKj0gJT0gfD0gXj0gJj0gPDw9ID4+PSA+Pj49JyksXG4gICAgICBjb21iaW5hdG9yczogU3ltYm9scy5mcm9tKFxuICAgICAgICAnPj0gPD0gPT0gPT09ICE9ICE9PSB8fCAmJiAhICYgfCA+IDwgPT4gJSArIC0gKiogKiAvID4+IDw8ID4+PiA/IDonLFxuICAgICAgKSxcbiAgICAgIG5vbmJyZWFrZXJzOiBTeW1ib2xzLmZyb20oJy4nKSxcbiAgICAgIG9wZXJhdG9yczogU3ltYm9scy5mcm9tKCcrKyAtLSAhISBeIH4gISAuLi4nKSxcbiAgICAgIGJyZWFrZXJzOiBTeW1ib2xzLmZyb20oJywgOycpLFxuICAgICAgcGF0dGVybnM6IHsuLi5wYXR0ZXJuc30sXG4gICAgICBtYXRjaGVyOiBzZXF1ZW5jZWAoW1xcc1xcbl0rKXwoJHthbGwoXG4gICAgICAgIFJFR0VYUFMsXG4gICAgICAgIHJhd2BcXC89YCxcbiAgICAgICAgQ09NTUVOVFMsXG4gICAgICAgIFFVT1RFUyxcbiAgICAgICAgQ0xPU1VSRVMsXG4gICAgICAgIC8sfDt8XFwuXFwuXFwufFxcLnxcXDp8XFw/fD0+LyxcbiAgICAgICAgLyE9PXw9PT18PT18PS8sXG4gICAgICAgIC4uLnJhd2BcXCsgXFwtIFxcKiAmIFxcfGAuc3BsaXQoJyAnKS5tYXAocyA9PiBgJHtzfSR7c318JHtzfT18JHtzfWApLFxuICAgICAgICAuLi5yYXdgISBcXCpcXCogJSA8PCA+PiA+Pj4gPCA+IFxcXiB+YC5zcGxpdCgnICcpLm1hcChzID0+IGAke3N9PXwke3N9YCksXG4gICAgICApfSlgLFxuICAgICAgbWF0Y2hlcnM6IHtcbiAgICAgICAgcXVvdGU6IC8oXFxuKXwoXFxcXCg/Oig/OlxcXFxcXFxcKSpcXFxcfFteXFxcXFxcc10pP3xgfFwifCd8XFwkXFx7KS9nLFxuICAgICAgICAvLyBxdW90ZTogLyhcXG4pfChgfFwifCd8XFwkXFx7KXwoXFxcXC4pL2csXG4gICAgICAgIC8vIHF1b3RlOiAvKFxcbil8KGB8XCJ8J3xcXCRcXHspfChcXFxcLikvZyxcbiAgICAgICAgLy8gXCInXCI6IC8oXFxuKXwoJyl8KFxcXFwuKS9nLFxuICAgICAgICAvLyAnXCInOiAvKFxcbil8KFwiKXwoXFxcXC4pL2csXG4gICAgICAgIC8vICdgJzogLyhcXG4pfChgfFxcJFxceyl8KFxcXFwuKS9nLFxuICAgICAgICBjb21tZW50OiBtYXRjaGVycy5jb21tZW50cyxcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICBFQ01BU2NyaXB0RXh0ZW5zaW9uczoge1xuICAgICAgLy8gY29uc3QgSEFTSEJBTkcgPSAvXlxcI1xcIS4qXFxuL2c7IC8vIFteXSA9PT0gKD86LipcXG4pXG4gICAgICAvLyBUT0RPOiBVbmRvICQgbWF0Y2hpbmcgb25jZSBmaXhlZFxuICAgICAgY29uc3QgUVVPVEVTID0gL2B8XCIoPzpbXlxcXFxcIl0rfFxcXFwuKSooPzpcInwkKXwnKD86W15cXFxcJ10rfFxcXFwuKSooPzonfCQpL2c7XG4gICAgICBjb25zdCBDT01NRU5UUyA9IC9cXC9cXC8uKig/OlxcbnwkKXxcXC9cXCpbXl0qPyg/OlxcKlxcL3wkKXxeXFwjXFwhLipcXG4vZzsgLy8gW15dID09PSAoPzouKlxcbilcbiAgICAgIGNvbnN0IFNUQVRFTUVOVFMgPSBhbGwoUVVPVEVTLCBDTE9TVVJFUywgUkVHRVhQUywgQ09NTUVOVFMpO1xuICAgICAgY29uc3QgQkxPQ0tMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBUT1BMRVZFTCA9IHNlcXVlbmNlYChbXFxzXFxuXSspfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBDTE9TVVJFID0gc2VxdWVuY2VgKFxcbispfCgke1NUQVRFTUVOVFN9KWA7XG4gICAgICBjb25zdCBFU00gPSBzZXF1ZW5jZWAke1RPUExFVkVMfXxcXGJleHBvcnRcXGJ8XFxiaW1wb3J0XFxiYDtcbiAgICAgIGNvbnN0IENKUyA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJtb2R1bGUuZXhwb3J0c1xcYnxcXGJyZXF1aXJlXFxiYDtcbiAgICAgIGNvbnN0IEVTWCA9IHNlcXVlbmNlYCR7QkxPQ0tMRVZFTH18XFxiZXhwb3J0c1xcYnxcXGJpbXBvcnRcXGJ8XFxibW9kdWxlLmV4cG9ydHNcXGJ8XFxicmVxdWlyZVxcYmA7XG5cbiAgICAgIGNvbnN0IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc30gPSBlcztcbiAgICAgIGNvbnN0IHN5bnRheCA9IHtxdW90ZXMsIGNsb3N1cmVzLCBzcGFuc307XG4gICAgICBjb25zdCBtYXRjaGVycyA9IHt9O1xuICAgICAgKHtxdW90ZTogbWF0Y2hlcnMucXVvdGV9ID0gZXMubWF0Y2hlcnMpO1xuXG4gICAgICBjb25zdCBlc20gPSAoc3ludGF4ZXMuZXNtID0ge1xuICAgICAgICAuLi4obW9kZXMuZXNtID0ge3N5bnRheDogJ2VzbSd9KSxcbiAgICAgICAga2V5d29yZHM6IFN5bWJvbHMuZnJvbSgnaW1wb3J0IGV4cG9ydCBkZWZhdWx0JyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogRVNNLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBDTE9TVVJFfSxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgY2pzID0gKHN5bnRheGVzLmNqcyA9IHtcbiAgICAgICAgLi4uKG1vZGVzLmNqcyA9IHtzeW50YXg6ICdjanMnfSksXG4gICAgICAgIGtleXdvcmRzOiBTeW1ib2xzLmZyb20oJ2ltcG9ydCBtb2R1bGUgZXhwb3J0cyByZXF1aXJlJyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogQ0pTLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBDSlN9LFxuICAgICAgfSk7XG4gICAgICBjb25zdCBlc3ggPSAoc3ludGF4ZXMuZXN4ID0ge1xuICAgICAgICAuLi4obW9kZXMuZXN4ID0ge3N5bnRheDogJ2VzeCd9KSxcbiAgICAgICAga2V5d29yZHM6IFN5bWJvbHMuZnJvbShlc20ua2V5d29yZHMsIGNqcy5rZXl3b3JkcyksXG4gICAgICAgIC4uLnN5bnRheCxcbiAgICAgICAgbWF0Y2hlcjogRVNYLFxuICAgICAgICBtYXRjaGVyczogey4uLm1hdGNoZXJzLCBjbG9zdXJlOiBFU1h9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG59XG5cbi8vLyBFeHRlbnNpb25zXG57XG4gIGZvciAoY29uc3QgbW9kZSBpbiBleHRlbnNpb25zKSB7XG4gICAgLyoqXG4gICAgICogQHR5cGVkZWYge1BhcnRpYWw8dHlwZW9mIHN5bnRheGVzW2tleW9mIHN5bnRheGVzXT59IG1vZGVcbiAgICAgKiBAdHlwZWRlZiB7dHlwZW9mIGhlbHBlcnN9IGhlbHBlcnNcbiAgICAgKiBAdHlwZWRlZiB7e2FsaWFzZXM/OiBzdHJpbmdbXSwgc3ludGF4OiBzdHJpbmd9fSBkZWZhdWx0c1xuICAgICAqIEB0eXBlIHsoaGVscGVyczogaGVscGVycywgZGVmYXVsdHM6IGRlZmF1bHRzKSA9PiBtb2RlfVxuICAgICAqL1xuICAgIGNvbnN0IGZhY3RvcnkgPSBleHRlbnNpb25zW21vZGVdO1xuICAgIGNvbnN0IGRlZmF1bHRzID0ge3N5bnRheDogbW9kZSwgLi4uZmFjdG9yeS5kZWZhdWx0c307XG4gICAgY29uc3Qge3N5bnRheCwgYWxpYXNlc30gPSBkZWZhdWx0cztcblxuICAgIGRlZmluaXRpb25zW3N5bnRheF0gPSB7XG4gICAgICBnZXQoKSB7XG4gICAgICAgIHJldHVybiAodGhpc1tzeW50YXhdID0gZmFjdG9yeShoZWxwZXJzLCBkZWZhdWx0cykpO1xuICAgICAgfSxcbiAgICAgIHNldCh2YWx1ZSkge1xuICAgICAgICBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIHN5bnRheCwge3ZhbHVlfSk7XG4gICAgICB9LFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlLFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICB9O1xuXG4gICAgbW9kZXNbc3ludGF4XSA9IHtzeW50YXh9O1xuXG4gICAgaWYgKGFsaWFzZXMgJiYgYWxpYXNlcy5sZW5ndGgpIHtcbiAgICAgIGZvciAoY29uc3QgYWxpYXMgb2YgYWxpYXNlcykge1xuICAgICAgICBtb2Rlc1thbGlhc10gPSBtb2Rlc1tzeW50YXhdO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuLy8vIEJvb3RzdHJhcFxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGFzeW5jICgpID0+IHtcbiAgYXdhaXQgZW50aXRpZXMucmVhZHk7XG4gIHN5bnRheGVzLmVzLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllciA9IGhlbHBlcnMuaWRlbnRpZmllcihcbiAgICBlbnRpdGllcy5lcy5JZGVudGlmaWVyU3RhcnQsXG4gICAgZW50aXRpZXMuZXMuSWRlbnRpZmllclBhcnQsXG4gICk7XG4gIC8vIHNldFRpbWVvdXQoKCkgPT4gY29uc29sZS5sb2coJ1N5bnRheGVzOiAlTycsIHN5bnRheGVzKSwgMTAwMCk7XG4gIC8vIGNvbnNvbGUubG9nKHttYXliZUlkZW50aWZpZXI6IGAke3N5bnRheGVzLmVzLnBhdHRlcm5zLm1heWJlSWRlbnRpZmllcn1gfSk7XG59KSgpO1xuIiwiY29uc3Qge2Fzc2lnbiwgZGVmaW5lUHJvcGVydHl9ID0gT2JqZWN0O1xuXG5leHBvcnQgY29uc3QgZG9jdW1lbnQgPSB2b2lkIG51bGw7XG5cbmV4cG9ydCBjbGFzcyBOb2RlIHtcbiAgZ2V0IGNoaWxkcmVuKCkge1xuICAgIHJldHVybiBkZWZpbmVQcm9wZXJ0eSh0aGlzLCAnY2hpbGRyZW4nLCB7dmFsdWU6IG5ldyBTZXQoKX0pLmNoaWxkcmVuO1xuICB9XG4gIGdldCBjaGlsZEVsZW1lbnRDb3VudCgpIHtcbiAgICByZXR1cm4gKHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplKSB8fCAwO1xuICB9XG4gIGdldCB0ZXh0Q29udGVudCgpIHtcbiAgICByZXR1cm4gKFxuICAgICAgKHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplICYmIFsuLi50aGlzLmNoaWxkcmVuXS5qb2luKCcnKSkgfHwgJydcbiAgICApO1xuICB9XG4gIHNldCB0ZXh0Q29udGVudCh0ZXh0KSB7XG4gICAgdGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJiB0aGlzLmNoaWxkcmVuLnNpemUgJiYgdGhpcy5jaGlsZHJlbi5jbGVhcigpO1xuICAgIHRleHQgJiYgdGhpcy5jaGlsZHJlbi5hZGQobmV3IFN0cmluZyh0ZXh0KSk7XG4gIH1cbiAgYXBwZW5kQ2hpbGQoZWxlbWVudCkge1xuICAgIHJldHVybiBlbGVtZW50ICYmIHRoaXMuY2hpbGRyZW4uYWRkKGVsZW1lbnQpLCBlbGVtZW50O1xuICB9XG4gIGFwcGVuZCguLi5lbGVtZW50cykge1xuICAgIGlmIChlbGVtZW50cy5sZW5ndGgpIGZvciAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZWxlbWVudCAmJiB0aGlzLmNoaWxkcmVuLmFkZChlbGVtZW50KTtcbiAgfVxuICByZW1vdmVDaGlsZChlbGVtZW50KSB7XG4gICAgZWxlbWVudCAmJlxuICAgICAgdGhpcy5oYXNPd25Qcm9wZXJ0eSgnY2hpbGRyZW4nKSAmJlxuICAgICAgdGhpcy5jaGlsZHJlbi5zaXplICYmXG4gICAgICB0aGlzLmNoaWxkcmVuLmRlbGV0ZShlbGVtZW50KTtcbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfVxuICByZW1vdmUoLi4uZWxlbWVudHMpIHtcbiAgICBpZiAoZWxlbWVudHMubGVuZ3RoICYmIHRoaXMuaGFzT3duUHJvcGVydHkoJ2NoaWxkcmVuJykgJiYgdGhpcy5jaGlsZHJlbi5zaXplKVxuICAgICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSBlbGVtZW50ICYmIHRoaXMuY2hpbGRyZW4uZGVsZXRlKGVsZW1lbnQpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBFbGVtZW50IGV4dGVuZHMgTm9kZSB7XG4gIGdldCBpbm5lckhUTUwoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dENvbnRlbnQ7XG4gIH1cbiAgc2V0IGlubmVySFRNTCh0ZXh0KSB7XG4gICAgdGhpcy50ZXh0Q29udGVudCA9IHRleHQ7XG4gIH1cbiAgZ2V0IG91dGVySFRNTCgpIHtcbiAgICBjb25zdCB7Y2xhc3NOYW1lLCB0YWcsIGlubmVySFRNTH0gPSB0aGlzO1xuICAgIHJldHVybiBgPCR7dGFnfSR7KGNsYXNzTmFtZSAmJiBgIGNsYXNzPVwiJHtjbGFzc05hbWV9XCJgKSB8fCAnJ30+JHtpbm5lckhUTUwgfHwgJyd9PC8ke3RhZ30+YDtcbiAgfVxuICB0b1N0cmluZygpIHtcbiAgICByZXR1cm4gdGhpcy5vdXRlckhUTUw7XG4gIH1cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiB0aGlzLnRvU3RyaW5nKCk7XG4gIH1cbn1cblxuZXhwb3J0IGNsYXNzIERvY3VtZW50RnJhZ21lbnQgZXh0ZW5kcyBOb2RlIHtcbiAgdG9TdHJpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMudGV4dENvbnRlbnQ7XG4gIH1cbiAgdG9KU09OKCkge1xuICAgIHJldHVybiAodGhpcy5jaGlsZEVsZW1lbnRDb3VudCAmJiBbLi4udGhpcy5jaGlsZHJlbl0pIHx8IFtdO1xuICB9XG4gIFtTeW1ib2wuaXRlcmF0b3JdKCkge1xuICAgIHJldHVybiAoKHRoaXMuY2hpbGRFbGVtZW50Q291bnQgJiYgdGhpcy5jaGlsZHJlbikgfHwgJycpW1N5bWJvbC5pdGVyYXRvcl0oKTtcbiAgfVxufVxuXG5leHBvcnQgY2xhc3MgVGV4dCBleHRlbmRzIFN0cmluZyB7XG4gIHRvU3RyaW5nKCkge1xuICAgIHJldHVybiBlbmNvZGVFbnRpdGllcyhzdXBlci50b1N0cmluZygpKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlRWxlbWVudCA9ICh0YWcsIHByb3BlcnRpZXMsIC4uLmNoaWxkcmVuKSA9PiB7XG4gIGNvbnN0IGVsZW1lbnQgPSBhc3NpZ24obmV3IEVsZW1lbnQoKSwge1xuICAgIHRhZyxcbiAgICBjbGFzc05hbWU6IChwcm9wZXJ0aWVzICYmIHByb3BlcnRpZXMuY2xhc3NOYW1lKSB8fCAnJyxcbiAgICBwcm9wZXJ0aWVzLFxuICB9KTtcbiAgY2hpbGRyZW4ubGVuZ3RoICYmIGRlZmluZVByb3BlcnR5KGVsZW1lbnQsICdjaGlsZHJlbicsIHt2YWx1ZTogbmV3IFNldChjaGlsZHJlbil9KTtcbiAgcmV0dXJuIGVsZW1lbnQ7XG59O1xuXG5leHBvcnQgY29uc3QgY3JlYXRlVGV4dCA9IChjb250ZW50ID0gJycpID0+IG5ldyBUZXh0KGNvbnRlbnQpO1xuZXhwb3J0IGNvbnN0IGVuY29kZUVudGl0eSA9IGVudGl0eSA9PiBgJiMke2VudGl0eS5jaGFyQ29kZUF0KDApfTtgO1xuZXhwb3J0IGNvbnN0IGVuY29kZUVudGl0aWVzID0gc3RyaW5nID0+IHN0cmluZy5yZXBsYWNlKC9bXFx1MDBBMC1cXHU5OTk5PD5cXCZdL2dpbSwgZW5jb2RlRW50aXR5KTtcbmV4cG9ydCBjb25zdCBjcmVhdGVGcmFnbWVudCA9ICgpID0+IG5ldyBEb2N1bWVudEZyYWdtZW50KCk7XG4iLCJleHBvcnQgY29uc3Qge2RvY3VtZW50LCBFbGVtZW50LCBOb2RlLCBUZXh0LCBEb2N1bWVudEZyYWdtZW50fSA9XG4gICdvYmplY3QnID09PSB0eXBlb2Ygc2VsZiAmJiAoc2VsZiB8fCAwKS53aW5kb3cgPT09IHNlbGYgJiYgc2VsZjtcblxuZXhwb3J0IGNvbnN0IHtjcmVhdGVFbGVtZW50LCBjcmVhdGVUZXh0LCBjcmVhdGVGcmFnbWVudH0gPSB7XG4gIGNyZWF0ZUVsZW1lbnQ6ICh0YWcsIHByb3BlcnRpZXMsIC4uLmNoaWxkcmVuKSA9PiB7XG4gICAgY29uc3QgZWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGFnKTtcbiAgICBwcm9wZXJ0aWVzICYmIE9iamVjdC5hc3NpZ24oZWxlbWVudCwgcHJvcGVydGllcyk7XG4gICAgaWYgKCFjaGlsZHJlbi5sZW5ndGgpIHJldHVybiBlbGVtZW50O1xuICAgIGlmIChlbGVtZW50LmFwcGVuZCkge1xuICAgICAgd2hpbGUgKGNoaWxkcmVuLmxlbmd0aCA+IDUwMCkgZWxlbWVudC5hcHBlbmQoLi4uY2hpbGRyZW4uc3BsaWNlKDAsIDUwMCkpO1xuICAgICAgY2hpbGRyZW4ubGVuZ3RoICYmIGVsZW1lbnQuYXBwZW5kKC4uLmNoaWxkcmVuKTtcbiAgICB9IGVsc2UgaWYgKGVsZW1lbnQuYXBwZW5kQ2hpbGQpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2YgY2hpbGRyZW4pIGVsZW1lbnQuYXBwZW5kQ2hpbGQoY2hpbGQpO1xuICAgIH1cbiAgICByZXR1cm4gZWxlbWVudDtcbiAgfSxcblxuICBjcmVhdGVUZXh0OiAoY29udGVudCA9ICcnKSA9PiBkb2N1bWVudC5jcmVhdGVUZXh0Tm9kZShjb250ZW50KSxcblxuICBjcmVhdGVGcmFnbWVudDogKCkgPT4gZG9jdW1lbnQuY3JlYXRlRG9jdW1lbnRGcmFnbWVudCgpLFxufTtcbiIsImltcG9ydCAqIGFzIHBzZXVkbyBmcm9tICcuL2xpYi9wc2V1ZG8uanMnO1xuaW1wb3J0ICogYXMgZG9tIGZyb20gJy4vbGliL25hdGl2ZS5qcyc7XG5cbi8vIFRFU1Q6IFRyYWNlIGZvciBFU00gdGVzdGluZ1xudHlwZW9mIHByb2Nlc3MgPT09ICdvYmplY3QnICYmIGNvbnNvbGUuaW5mbygnW0VTTV06ICVvJywgaW1wb3J0Lm1ldGEudXJsKTtcblxuZXhwb3J0IGNvbnN0IG5hdGl2ZSA9IGRvbS5kb2N1bWVudCAmJiBkb207XG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IG5hdGl2ZSB8fCBwc2V1ZG87XG5leHBvcnQge3BzZXVkb307XG4iLCJpbXBvcnQgKiBhcyBkb20gZnJvbSAnLi4vcGFja2FnZXMvcHNldWRvbS9wc2V1ZG9tLmpzJztcblxuLy8vIE9QVElPTlNcbi8qKiBUaGUgdGFnIG5hbWUgb2YgdGhlIGVsZW1lbnQgdG8gdXNlIGZvciByZW5kZXJpbmcgYSB0b2tlbi4gKi9cbmNvbnN0IFNQQU4gPSAnc3Bhbic7XG5cbi8qKiBUaGUgY2xhc3MgbmFtZSBvZiB0aGUgZWxlbWVudCB0byB1c2UgZm9yIHJlbmRlcmluZyBhIHRva2VuLiAqL1xuY29uc3QgQ0xBU1MgPSAnbWFya3VwJztcblxuLyoqXG4gKiBJbnRlbmRlZCB0byBwcmV2ZW50IHVucHJlZGljdGFibGUgRE9NIHJlbGF0ZWQgb3ZlcmhlYWQgYnkgcmVuZGVyaW5nIGVsZW1lbnRzXG4gKiB1c2luZyBsaWdodHdlaWdodCBwcm94eSBvYmplY3RzIHRoYXQgY2FuIGJlIHNlcmlhbGl6ZWQgaW50byBIVE1MIHRleHQuXG4gKi9cbmNvbnN0IEhUTUxfTU9ERSA9IHRydWU7XG4vLy8gSU5URVJGQUNFXG5cbmV4cG9ydCBjb25zdCByZW5kZXJlcnMgPSB7fTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uKiByZW5kZXJlcih0b2tlbnMsIHRva2VuUmVuZGVyZXJzID0gcmVuZGVyZXJzKSB7XG4gIGZvciBhd2FpdCAoY29uc3QgdG9rZW4gb2YgdG9rZW5zKSB7XG4gICAgY29uc3Qge3R5cGUgPSAndGV4dCcsIHRleHQsIHB1bmN0dWF0b3IsIGJyZWFrc30gPSB0b2tlbjtcbiAgICBjb25zdCB0b2tlblJlbmRlcmVyID1cbiAgICAgIChwdW5jdHVhdG9yICYmICh0b2tlblJlbmRlcmVyc1twdW5jdHVhdG9yXSB8fCB0b2tlblJlbmRlcmVycy5vcGVyYXRvcikpIHx8XG4gICAgICAodHlwZSAmJiB0b2tlblJlbmRlcmVyc1t0eXBlXSkgfHxcbiAgICAgICh0ZXh0ICYmIHRva2VuUmVuZGVyZXJzLnRleHQpO1xuICAgIGNvbnN0IGVsZW1lbnQgPSB0b2tlblJlbmRlcmVyICYmIHRva2VuUmVuZGVyZXIodGV4dCwgdG9rZW4pO1xuICAgIGVsZW1lbnQgJiYgKHlpZWxkIGVsZW1lbnQpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBpbnN0YWxsID0gKGRlZmF1bHRzLCBuZXdSZW5kZXJlcnMgPSBkZWZhdWx0cy5yZW5kZXJlcnMgfHwge30pID0+IHtcbiAgT2JqZWN0LmFzc2lnbihuZXdSZW5kZXJlcnMsIHJlbmRlcmVycyk7XG4gIGRlZmF1bHRzLnJlbmRlcmVycyA9PT0gbmV3UmVuZGVyZXJzIHx8IChkZWZhdWx0cy5yZW5kZXJlcnMgPSBuZXdSZW5kZXJlcnMpO1xuICBkZWZhdWx0cy5yZW5kZXJlciA9IHJlbmRlcmVyO1xufTtcblxuZXhwb3J0IGNvbnN0IHN1cHBvcnRlZCA9ICEhZG9tLm5hdGl2ZTtcbmV4cG9ydCBjb25zdCBuYXRpdmUgPSAhSFRNTF9NT0RFICYmIHN1cHBvcnRlZDtcbmNvbnN0IGltcGxlbWVudGF0aW9uID0gbmF0aXZlID8gZG9tLm5hdGl2ZSA6IGRvbS5wc2V1ZG87XG5leHBvcnQgY29uc3Qge2NyZWF0ZUVsZW1lbnQsIGNyZWF0ZVRleHQsIGNyZWF0ZUZyYWdtZW50fSA9IGltcGxlbWVudGF0aW9uO1xuXG4vLy8gSU1QTEVNRU5UQVRJT05cbmNvbnN0IGZhY3RvcnkgPSAodGFnLCBwcm9wZXJ0aWVzKSA9PiAoY29udGVudCwgdG9rZW4pID0+IHtcbiAgaWYgKCFjb250ZW50KSByZXR1cm47XG4gIHR5cGVvZiBjb250ZW50ICE9PSAnc3RyaW5nJyB8fCAoY29udGVudCA9IGNyZWF0ZVRleHQoY29udGVudCkpO1xuICBjb25zdCBlbGVtZW50ID0gY3JlYXRlRWxlbWVudCh0YWcsIHByb3BlcnRpZXMsIGNvbnRlbnQpO1xuXG4gIGVsZW1lbnQgJiYgdG9rZW4gJiYgKHRva2VuLmhpbnQgJiYgKGVsZW1lbnQuY2xhc3NOYW1lICs9IGAgJHt0b2tlbi5oaW50fWApKTtcbiAgLy8gdG9rZW4uYnJlYWtzICYmIChlbGVtZW50LmJyZWFrcyA9IHRva2VuLmJyZWFrcyksXG4gIC8vIHRva2VuICYmXG4gIC8vICh0b2tlbi5mb3JtICYmIChlbGVtZW50LmNsYXNzTmFtZSArPSBgIG1heWJlLSR7dG9rZW4uZm9ybX1gKSxcbiAgLy8gdG9rZW4uaGludCAmJiAoZWxlbWVudC5jbGFzc05hbWUgKz0gYCAke3Rva2VuLmhpbnR9YCksXG4gIC8vIGVsZW1lbnQgJiYgKGVsZW1lbnQudG9rZW4gPSB0b2tlbikpO1xuXG4gIHJldHVybiBlbGVtZW50O1xufTtcblxuT2JqZWN0LmFzc2lnbihyZW5kZXJlcnMsIHtcbiAgLy8gd2hpdGVzcGFjZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gd2hpdGVzcGFjZWB9KSxcbiAgd2hpdGVzcGFjZTogY3JlYXRlVGV4dCxcbiAgdGV4dDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBDTEFTU30pLFxuXG4gIHZhcmlhYmxlOiBmYWN0b3J5KCd2YXInLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gdmFyaWFibGVgfSksXG4gIGtleXdvcmQ6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGtleXdvcmRgfSksXG4gIGlkZW50aWZpZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGlkZW50aWZpZXJgfSksXG4gIG9wZXJhdG9yOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZXJhdG9yYH0pLFxuICBhc3NpZ25lcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBhc3NpZ25lcmB9KSxcbiAgY29tYmluYXRvcjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBvcGVyYXRvciBjb21iaW5hdG9yYH0pLFxuICBwdW5jdHVhdGlvbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBwdW5jdHVhdGlvbmB9KSxcbiAgcXVvdGU6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgcXVvdGVgfSksXG4gIGJyZWFrZXI6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IHB1bmN0dWF0b3IgYnJlYWtlcmB9KSxcbiAgb3BlbmVyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIG9wZW5lcmB9KSxcbiAgY2xvc2VyOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBwdW5jdHVhdG9yIGNsb3NlcmB9KSxcbiAgc3BhbjogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gcHVuY3R1YXRvciBzcGFuYH0pLFxuICBzZXF1ZW5jZTogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2VgfSksXG4gIGxpdGVyYWw6IGZhY3RvcnkoU1BBTiwge2NsYXNzTmFtZTogYCR7Q0xBU1N9IGxpdGVyYWxgfSksXG4gIGluZGVudDogZmFjdG9yeShTUEFOLCB7Y2xhc3NOYW1lOiBgJHtDTEFTU30gc2VxdWVuY2UgaW5kZW50YH0pLFxuICBjb21tZW50OiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfSBjb21tZW50YH0pLFxuICBjb2RlOiBmYWN0b3J5KFNQQU4sIHtjbGFzc05hbWU6IGAke0NMQVNTfWB9KSxcbn0pO1xuIiwiaW1wb3J0ICogYXMgbW9kZXMgZnJvbSAnLi9tYXJrdXAtbW9kZXMuanMnO1xuaW1wb3J0ICogYXMgZG9tIGZyb20gJy4vbWFya3VwLWRvbS5qcyc7XG5pbXBvcnQgKiBhcyBwYXJzZXIgZnJvbSAnLi9tYXJrdXAtcGFyc2VyLmpzJztcblxuZXhwb3J0IGxldCBpbml0aWFsaXplZDtcblxuZXhwb3J0IGNvbnN0IHJlYWR5ID0gKGFzeW5jICgpID0+IHZvaWQgKGF3YWl0IG1vZGVzLnJlYWR5KSkoKTtcblxuZXhwb3J0IGNvbnN0IHZlcnNpb25zID0gW3BhcnNlcl07XG5cbi8vIGNvbnN0IHZlcnNpb25zID0gW3BhcnNlciwgcGFyc2VyMl07XG5cbmNvbnN0IGluaXRpYWxpemUgPSAoKSA9PlxuICBpbml0aWFsaXplZCB8fFxuICAoaW5pdGlhbGl6ZWQgPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3Qge2NyZWF0ZUZyYWdtZW50LCBzdXBwb3J0ZWR9ID0gZG9tO1xuXG4gICAgLyoqXG4gICAgICogVGVtcG9yYXJ5IHRlbXBsYXRlIGVsZW1lbnQgZm9yIHJlbmRlcmluZ1xuICAgICAqIEB0eXBlIHtIVE1MVGVtcGxhdGVFbGVtZW50P31cbiAgICAgKi9cbiAgICBjb25zdCB0ZW1wbGF0ZSA9XG4gICAgICBzdXBwb3J0ZWQgJiZcbiAgICAgICh0ZW1wbGF0ZSA9PlxuICAgICAgICAnSFRNTFRlbXBsYXRlRWxlbWVudCcgPT09ICh0ZW1wbGF0ZSAmJiB0ZW1wbGF0ZS5jb25zdHJ1Y3RvciAmJiB0ZW1wbGF0ZS5jb25zdHJ1Y3Rvci5uYW1lKSAmJiB0ZW1wbGF0ZSkoXG4gICAgICAgIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyksXG4gICAgICApO1xuXG4gICAgLy8vIEFQSVxuICAgIGNvbnN0IHN5bnRheGVzID0ge307XG4gICAgY29uc3QgcmVuZGVyZXJzID0ge307XG4gICAgY29uc3QgZGVmYXVsdHMgPSB7Li4ucGFyc2VyLmRlZmF1bHRzfTtcblxuICAgIGF3YWl0IHJlYWR5O1xuICAgIC8vLyBEZWZhdWx0c1xuICAgIG1vZGVzLmluc3RhbGwoZGVmYXVsdHMsIHN5bnRheGVzKTtcbiAgICBkb20uaW5zdGFsbChkZWZhdWx0cywgcmVuZGVyZXJzKTtcblxuICAgIGxldCBsYXN0VmVyc2lvbjtcbiAgICB0b2tlbml6ZSA9IChzb3VyY2UsIG9wdGlvbnMgPSB7fSkgPT4ge1xuICAgICAgY29uc3QgdmVyc2lvbiA9IG9wdGlvbnMudmVyc2lvbiA+IDEgPyB2ZXJzaW9uc1tvcHRpb25zLnZlcnNpb24gLSAxXSA6IHZlcnNpb25zWzBdO1xuICAgICAgb3B0aW9ucy50b2tlbml6ZSA9ICh2ZXJzaW9uIHx8IHBhcnNlcikudG9rZW5pemU7XG4gICAgICB0cnkge1xuICAgICAgICByZXR1cm4gdmVyc2lvbi50b2tlbml6ZShzb3VyY2UsIHtvcHRpb25zfSwgZGVmYXVsdHMpO1xuICAgICAgfSBmaW5hbGx5IHtcbiAgICAgICAgIXZlcnNpb24gfHwgbGFzdFZlcnNpb24gPT09IChsYXN0VmVyc2lvbiA9IHZlcnNpb24pIHx8IGNvbnNvbGUubG9nKHt2ZXJzaW9ufSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHJlbmRlciA9IGFzeW5jIChzb3VyY2UsIG9wdGlvbnMpID0+IHtcbiAgICAgIGNvbnN0IGZyYWdtZW50ID0gb3B0aW9ucy5mcmFnbWVudCB8fCBjcmVhdGVGcmFnbWVudCgpO1xuXG4gICAgICBjb25zdCBlbGVtZW50cyA9IHBhcnNlci5yZW5kZXIoc291cmNlLCBvcHRpb25zLCBkZWZhdWx0cyk7XG4gICAgICBsZXQgZmlyc3QgPSBhd2FpdCBlbGVtZW50cy5uZXh0KCk7XG5cbiAgICAgIGxldCBsb2dzID0gKGZyYWdtZW50LmxvZ3MgPSBbXSk7XG5cbiAgICAgIGlmIChmaXJzdCAmJiAndmFsdWUnIGluIGZpcnN0KSB7XG4gICAgICAgIGlmICghZG9tLm5hdGl2ZSAmJiB0ZW1wbGF0ZSAmJiAndGV4dENvbnRlbnQnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIHRlbXBsYXRlYCk7XG4gICAgICAgICAgY29uc3QgYm9keSA9IFtmaXJzdC52YWx1ZV07XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICB0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LmpvaW4oJycpO1xuICAgICAgICAgIGZyYWdtZW50LmFwcGVuZENoaWxkKHRlbXBsYXRlLmNvbnRlbnQpO1xuXG4gICAgICAgICAgLy8gaWYgKCFmaXJzdC5kb25lKSB7XG4gICAgICAgICAgLy8gICBpZiAodHlwZW9mIHJlcXVlc3RBbmltYXRpb25GcmFtZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIC8vICAgICAvLyAgJiYgZmlyc3QudmFsdWUudG9rZW5cbiAgICAgICAgICAvLyAgICAgbGV0IGxpbmVzID0gMDtcbiAgICAgICAgICAvLyAgICAgZm9yIGF3YWl0IChjb25zdCBlbGVtZW50IG9mIGVsZW1lbnRzKSB7XG4gICAgICAgICAgLy8gICAgICAgLy8gZWxlbWVudC50b2tlbiAmJlxuICAgICAgICAgIC8vICAgICAgIC8vICAgZWxlbWVudC50b2tlbi5icmVha3MgPiAwICYmXG4gICAgICAgICAgLy8gICAgICAgLy8gICAobGluZXMgKz0gZWxlbWVudC50b2tlbi5icmVha3MpICUgMiA9PT0gMCAmJlxuICAgICAgICAgIC8vICAgICAgIGxpbmVzKysgJSAxMCA9PT0gMCAmJlxuICAgICAgICAgIC8vICAgICAgICAgKCh0ZW1wbGF0ZS5pbm5lckhUTUwgPSBib2R5LnNwbGljZSgwLCBib2R5Lmxlbmd0aCkuam9pbignJykpLFxuICAgICAgICAgIC8vICAgICAgICAgZnJhZ21lbnQuYXBwZW5kQ2hpbGQodGVtcGxhdGUuY29udGVudCkpO1xuICAgICAgICAgIC8vICAgICAgIC8vIGF3YWl0IG5ldyBQcm9taXNlKHIgPT4gc2V0VGltZW91dChyLCAxMDAwKSlcbiAgICAgICAgICAvLyAgICAgICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4gICAgICAgICAgLy8gICAgICAgYm9keS5wdXNoKGVsZW1lbnQpO1xuICAgICAgICAgIC8vICAgICB9XG4gICAgICAgICAgLy8gICB9IGVsc2Uge1xuICAgICAgICAgIC8vICAgICBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGJvZHkucHVzaChlbGVtZW50KTtcbiAgICAgICAgICAvLyAgICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gYm9keS5qb2luKCcnKTsgLy8gdGV4dFxuICAgICAgICAgIC8vICAgICBmcmFnbWVudC5hcHBlbmRDaGlsZCh0ZW1wbGF0ZS5jb250ZW50KTtcbiAgICAgICAgICAvLyAgIH1cbiAgICAgICAgICAvLyB9XG4gICAgICAgIH0gZWxzZSBpZiAoJ3B1c2gnIGluIGZyYWdtZW50KSB7XG4gICAgICAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3B1c2gnIGluIGZyYWdtZW50YCk7XG4gICAgICAgICAgZnJhZ21lbnQucHVzaChmaXJzdC52YWx1ZSk7XG4gICAgICAgICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIGZyYWdtZW50LnB1c2goZWxlbWVudCk7XG4gICAgICAgIH0gZWxzZSBpZiAoJ2FwcGVuZCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgICAvLyAgJiYgZmlyc3QudmFsdWUubm9kZVR5cGUgPj0gMVxuICAgICAgICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICdhcHBlbmQnIGluIGZyYWdtZW50YCk7XG4gICAgICAgICAgZnJhZ21lbnQuYXBwZW5kKGZpcnN0LnZhbHVlKTtcbiAgICAgICAgICBpZiAoIWZpcnN0LmRvbmUpIGZvciBhd2FpdCAoY29uc3QgZWxlbWVudCBvZiBlbGVtZW50cykgZnJhZ21lbnQuYXBwZW5kKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICAgIC8vIGVsc2UgaWYgKCd0ZXh0Q29udGVudCcgaW4gZnJhZ21lbnQpIHtcbiAgICAgICAgLy8gICBsZXQgdGV4dCA9IGAke2ZpcnN0LnZhbHVlfWA7XG4gICAgICAgIC8vICAgaWYgKCFmaXJzdC5kb25lKSBmb3IgYXdhaXQgKGNvbnN0IGVsZW1lbnQgb2YgZWxlbWVudHMpIHRleHQgKz0gYCR7ZWxlbWVudH1gO1xuICAgICAgICAvLyAgIGlmICh0ZW1wbGF0ZSkge1xuICAgICAgICAvLyAgICAgbG9ncy5wdXNoKGByZW5kZXIgbWV0aG9kID0gJ3RleHQnIGluIHRlbXBsYXRlYCk7XG4gICAgICAgIC8vICAgfSBlbHNlIHtcbiAgICAgICAgLy8gICAgIGxvZ3MucHVzaChgcmVuZGVyIG1ldGhvZCA9ICd0ZXh0JyBpbiBmcmFnbWVudGApO1xuICAgICAgICAvLyAgICAgLy8gVE9ETzogRmluZCBhIHdvcmthcm91bmQgZm9yIERvY3VtZW50RnJhZ21lbnQuaW5uZXJIVE1MXG4gICAgICAgIC8vICAgICBmcmFnbWVudC5pbm5lckhUTUwgPSB0ZXh0O1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZnJhZ21lbnQ7XG4gICAgfTtcblxuICAgIGluaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIHJldHVybiBtYXJrdXA7XG4gIH0pKCk7XG5cbmV4cG9ydCBsZXQgcmVuZGVyID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBhd2FpdCBpbml0aWFsaXplKCk7XG4gIHJldHVybiBhd2FpdCByZW5kZXIoc291cmNlLCBvcHRpb25zKTtcbn07XG5cbmV4cG9ydCBsZXQgdG9rZW5pemUgPSAoc291cmNlLCBvcHRpb25zKSA9PiB7XG4gIGlmICghaW5pdGlhbGl6ZWQpIHRocm93IEVycm9yKGBNYXJrdXA6IHRva2VuaXplKOKApikgY2FsbGVkIGJlZm9yZSBpbml0aWFsaXphdGlvbi4gJHtNZXNzYWdlcy5Jbml0aWFsaXplRmlyc3R9YCk7XG4gIGVsc2UgaWYgKGluaXRpYWxpemVkLnRoZW4pIEVycm9yKGBNYXJrdXA6IHRva2VuaXplKOKApikgY2FsbGVkIGR1cmluZyBpbml0aWFsaXphdGlvbi4gJHtNZXNzYWdlcy5Jbml0aWFsaXplRmlyc3R9YCk7XG4gIHJldHVybiBtYXJrdXAudG9rZW5pemUoc291cmNlLCBvcHRpb25zKTtcbn07XG5cbmNvbnN0IGtleUZyb20gPSBvcHRpb25zID0+IChvcHRpb25zICYmIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMpKSB8fCAnJztcbmNvbnN0IHNraW0gPSBpdGVyYWJsZSA9PiB7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpdGVyYWJsZSk7XG59O1xuXG5leHBvcnQgY29uc3Qgd2FybXVwID0gYXN5bmMgKHNvdXJjZSwgb3B0aW9ucykgPT4ge1xuICBjb25zdCBrZXkgPSAob3B0aW9ucyAmJiBrZXlGcm9tKG9wdGlvbnMpKSB8fCAnJztcbiAgbGV0IGNhY2hlID0gKHdhcm11cC5jYWNoZSB8fCAod2FybXVwLmNhY2hlID0gbmV3IE1hcCgpKSkuZ2V0KGtleSk7XG4gIGNhY2hlIHx8IHdhcm11cC5jYWNoZS5zZXQoa2V5LCAoY2FjaGUgPSBuZXcgU2V0KCkpKTtcbiAgYXdhaXQgKGluaXRpYWxpemVkIHx8IGluaXRpYWxpemUoKSk7XG4gIC8vIGxldCB0b2tlbnM7XG4gIGNhY2hlLmhhcyhzb3VyY2UpIHx8IChza2ltKHRva2VuaXplKHNvdXJjZSwgb3B0aW9ucykpLCBjYWNoZS5hZGQoc291cmNlKSk7XG4gIC8vIGNhY2hlLmhhcyhzb3VyY2UpIHx8ICgodG9rZW5zID0+IHsgd2hpbGUgKCF0b2tlbnMubmV4dCgpLmRvbmUpOyB9KSh0b2tlbml6ZShzb3VyY2UsIG9wdGlvbnMpKSwgY2FjaGUuYWRkKHNvdXJjZSkpO1xuICByZXR1cm4gdHJ1ZTtcbn07XG5cbmV4cG9ydCBjb25zdCBtYXJrdXAgPSBPYmplY3QuY3JlYXRlKHBhcnNlciwge1xuICBpbml0aWFsaXplOiB7Z2V0OiAoKSA9PiBpbml0aWFsaXplfSxcbiAgcmVuZGVyOiB7Z2V0OiAoKSA9PiByZW5kZXJ9LFxuICB0b2tlbml6ZToge2dldDogKCkgPT4gdG9rZW5pemV9LFxuICB3YXJtdXA6IHtnZXQ6ICgpID0+IHdhcm11cH0sXG4gIGRvbToge2dldDogKCkgPT4gZG9tfSxcbiAgbW9kZXM6IHtnZXQ6ICgpID0+IHBhcnNlci5tb2Rlc30sXG59KTtcblxuLy8vIENPTlNUQU5UU1xuXG5jb25zdCBNZXNzYWdlcyA9IHtcbiAgSW5pdGlhbGl6ZUZpcnN0OiBgVHJ5IGNhbGxpbmcgTWFya3VwLmluaXRpYWxpemUoKS50aGVuKOKApikgZmlyc3QuYCxcbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1hcmt1cDtcbiJdLCJuYW1lcyI6WyJhbGwiLCJTeW1ib2xzIiwiZGVmYXVsdHMiLCJzeW50YXhlcyIsIkNsb3N1cmVzIiwic2VxdWVuY2UiLCJyYXciLCJtYXRjaGVycyIsInJlYWR5IiwiaGVscGVycy5pZGVudGlmaWVyIiwiZG9jdW1lbnQiLCJFbGVtZW50IiwiTm9kZSIsIlRleHQiLCJEb2N1bWVudEZyYWdtZW50IiwiY3JlYXRlRWxlbWVudCIsImNyZWF0ZVRleHQiLCJjcmVhdGVGcmFnbWVudCIsImRvbS5kb2N1bWVudCIsInJlbmRlcmVyIiwiaW5zdGFsbCIsImRvbS5uYXRpdmUiLCJuYXRpdmUiLCJkb20ucHNldWRvIiwibW9kZXMucmVhZHkiLCJpbml0aWFsaXplZCIsInN1cHBvcnRlZCIsImRvbSIsInJlbmRlcmVycyIsInBhcnNlci5kZWZhdWx0cyIsIm1vZGVzLmluc3RhbGwiLCJkb20uaW5zdGFsbCIsInRva2VuaXplIiwicmVuZGVyIiwicGFyc2VyLnJlbmRlciIsIm1hcmt1cCIsInBhcnNlci5tb2RlcyJdLCJtYXBwaW5ncyI6Ijs7O0VBQUE7QUFDQSxFQUFPLFNBQVMsTUFBTSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUU7RUFDcEUsRUFBRSxPQUFPLENBQUMsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFD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RUFDVixJQUFJLE1BQU0sR0FBRyxHQUFHO0VBQ2hCLElBQUksSUFBSSxDQUFDOztFQUVULEVBQUUsSUFBSSxXQUFXLENBQUM7O0VBRWxCLEVBQUUsTUFBTTtFQUNSLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUM7RUFDaEYsR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUM7O0VBRXhCLEVBQUUsTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztFQUNsRCxFQUFFLElBQUksUUFBUSxHQUFHLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7O0VBRTFDO0VBQ0EsRUFBRSxDQUFDLE1BQU07RUFDVCxLQUFLLFFBQVEsQ0FBQyxJQUFJLEtBQUssUUFBUSxDQUFDLElBQUksR0FBRyxNQUFNLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxJQUFJLFFBQVEsQ0FBQyxVQUFVLEtBQUssTUFBTSxDQUFDO0VBQ2hHLEtBQUssUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUM7RUFDM0QsS0FBSyxRQUFRLENBQUMsSUFBSSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztFQUNsRCxLQUFLLFFBQVEsQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDOztFQUUxRixFQUFFLE9BQU8sSUFBSSxFQUFFO0VBQ2YsSUFBSSxNQUFNO0VBQ1YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUs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QUFPLEtBQUs7RUFDdkQsUUFBUSxNQUFNLE1BQU0sR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQztFQUMzQyxRQUFRLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDO0VBQzVDLFFBQVEsTUFBTSxHQUFHLEdBQUcsS0FBSyxJQUFJLEtBQUssQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQzs7RUFFNUYsUUFBUSxJQUFJLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxFQUFFO0VBQzFDO0VBQ0E7O0VBRUEsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxHQUFHLEtBQUssQ0FBQztFQUN0QyxVQUFVLE1BQU0sU0FBUyxHQUFHRCxVQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7O0VBRTVELFVBQVUsSUFBSSxLQUFLLENBQUM7RUFDcEIsVUFBVSxTQUFTLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQzs7RUFFdEM7RUFDQSxVQUFVLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDRyxNQUFHLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDOztFQUV6RixVQUFVLElBQUksTUFBTSxHQUFHLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxLQUFLLEtBQUssRUFBRSxDQUFDOztFQUV4RCxVQUFVLElBQUksQ0FBQyxNQUFNLEVBQUU7RUFDdkIsWUFBWSxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7RUFDL0QsWUFBWSxNQUFNLEtBQUssR0FBRyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FB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
