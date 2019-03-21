(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.markup = {}));
}(this, function (exports) { 'use strict';

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

  const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
    Object.assign(newSyntaxes, syntaxes$1);
    Object.defineProperties(newSyntaxes, definitions);
    defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
  };

  const syntaxes$1 = {};

  /// DEFINITIONS
  Syntaxes: {
    const {Closures, Symbols, sequence, all, raw} = helpers;

    CSS: {
      const css = (syntaxes$1.css = {
        ...(modes.css = {syntax: 'css'}),
        comments: Closures.from('/*…*/'),
        closures: Closures.from('{…} (…) […]'),
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
        comments: Closures.from('<!--…-->'),
        closures: Closures.from('<%…%> <!…> <…/> </…> <…>'),
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
            const $$closer = new RegExp(raw`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

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
        comments: Closures.from('<!--…-->'),
        quotes: [],
        closures: Closures.from(html.closures, CLOSURES),
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
          const indent = new RegExp(raw`(?:\t|${' '.repeat(tabs)})`, 'g');
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
            const CLOSER = new RegExp(raw`\n${INDENT.source.slice(1)}${fence}`, 'g');

            CLOSER.lastIndex = start;
            let closerMatch = CLOSER.exec(source);
            if (closerMatch && closerMatch.index >= start) {
              end = closerMatch.index + 1;
            } else {
              const FENCE = new RegExp(raw`\n?[\>\|\s]*${fence}`, 'g');
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
                raw`/(\s*\n)|(${opener}(?=${opener}\s|${opener}$)|^(?:[\s>|]*\s)?\s*)|.*$`,
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
        comments: Closures.from('//…\n /*…*/'),
        quotes: Symbols.from(`' " \``),
        closures: Closures.from('{…} (…) […]'),
        spans: {'`': Closures.from('${…}')},
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
        matcher: sequence`([\s\n]+)|(${all(
        REGEXPS,
        raw`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...raw`\+ \- \* & \|`.split(' ').map(s => `${s}${s}|${s}=|${s}`),
        ...raw`! \*\* % << >> >>> < > \^ ~`.split(' ').map(s => `${s}=|${s}`),
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
        const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
        const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
        const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
        const ESM = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
        const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;
        const ESX = sequence`${BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

        const {quotes, closures, spans} = es;
        const syntax = {quotes, closures, spans};
        const matchers = {};
        ({quote: matchers.quote} = es.matchers);

        const esm = (syntaxes$1.esm = {
          ...(modes.esm = {syntax: 'esm'}),
          keywords: Symbols.from('import export default'),
          ...syntax,
          matcher: ESM,
          matchers: {...matchers, closure: CLOSURE},
        });
        const cjs = (syntaxes$1.cjs = {
          ...(modes.cjs = {syntax: 'cjs'}),
          keywords: Symbols.from('import module exports require'),
          ...syntax,
          matcher: CJS,
          matchers: {...matchers, closure: CJS},
        });
        const esx = (syntaxes$1.esx = {
          ...(modes.esx = {syntax: 'esx'}),
          keywords: Symbols.from(esm.keywords, cjs.keywords),
          ...syntax,
          matcher: ESX,
          matchers: {...matchers, closure: ESX},
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
      const defaults = {syntax: mode, ...factory.defaults};
      const {syntax, aliases} = defaults;

      definitions[syntax] = {
        get() {
          return (this[syntax] = factory(helpers, defaults));
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
  const ready = (async () => {
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
  const native$1 = !HTML_MODE;
  const implementation = pseudo;
  const {createElement: createElement$2, createText: createText$2, createFragment: createFragment$2} = implementation;

  /// IMPLEMENTATION
  const factory = (tag, properties) => (content, token) => {
    if (!content) return;
    typeof content !== 'string' || (content = createText$2(content));
    const element = createElement$2(tag, properties, content);

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
    whitespace: createText$2,
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
    createElement: createElement$2,
    createText: createText$2,
    createFragment: createFragment$2
  });

  const ready$1 = (async () => void (await ready))();

  const versions = [parser];

  // const versions = [parser, parser2];

  const initialize = () =>
    exports.initialized ||
    (exports.initialized = async () => {
      const {createFragment, supported} = dom$1;

      /**
       * Temporary template element for rendering
       * @type {HTMLTemplateElement?}
       */
      const template =
        supported &&
        (template =>
          'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) && template)(
          document.createElement('template'),
        );

      /// API
      const syntaxes = {};
      const renderers = {};
      const defaults$1 = {...defaults};

      await ready$1;
      /// Defaults
      install(defaults$1, syntaxes);
      install$1(defaults$1, renderers);

      let lastVersion;
      exports.tokenize = (source, options = {}) => {
        const version = options.version > 1 ? versions[options.version - 1] : versions[0];
        options.tokenize = (version || parser).tokenize;
        try {
          return version.tokenize(source, {options}, defaults$1);
        } finally {
          !version || lastVersion === (lastVersion = version) || console.log({version});
        }
      };

      exports.render = async (source, options) => {
        const fragment = options.fragment || createFragment();

        const elements = render(source, options, defaults$1);
        let first = await elements.next();

        let logs = (fragment.logs = []);

        if (first && 'value' in first) {
          if (template && 'textContent' in fragment) {
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

  exports.default = markup$1;
  exports.markup = markup$1;
  exports.ready = ready$1;
  exports.versions = versions;
  exports.warmup = warmup;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=markup.js.map
