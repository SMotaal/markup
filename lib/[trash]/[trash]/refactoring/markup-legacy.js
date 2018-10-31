const markup = (() => {
  const api = (() => {
    /** Markup (render) @author Saleh Abdel Motaal */
    function markup(source, options, defaults = markup.defaults) {
      return [...render(source, options, defaults)];
    }

    /// REGULAR EXPRESSIONS

    /** Non-alphanumeric symbol matching expressions */
    const matchers = {
      escapes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
      comments: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      quotes: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|`|"|'|\$\{)/g,
      xml: /([\s\n]+)|("|'|=|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
      sequences: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
    };

    /** Special alpha-numeric symbol test expressions */
    const patterns = {
      /** Keyword like symbol (Basic latin only by default) */
      maybeKeyword: /^[a-z](\w*)$/i,
    };

    /// SYNTAXES

    const syntaxes = {
      '*': {patterns, matcher: matchers.sequences},
      html: {patterns},
      css: {patterns},
      es: {patterns},
      md: {patterns},
    };
    const modes = {
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

    const defaults = (markup.defaults = {
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

    function* renderer(tokens) {
      for (const token of tokens) {
        if (!token) continue;
        yield Object.setPrototypeOf(token, Token.prototype);
      }
    }

    function render(source, options, defaults = markup.defaults) {
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

    function* contextualizer($, defaults) {
      let done, grouper;

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
            // offset, // Index of next production
            // breaks, // Linebreaks in next production
            hint, // Hint of next production
            previous, // Previous production
            parent = (next.parent = (previous && previous.parent) || undefined), // Parent of next production
            last, // Last significant production
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
          } else {
            next.type = 'text';
          }

          // next.hint = hint && `${hint} ${syntax}-${type}` || `${syntax}-${type}`;

          token = next; // {type, text, offset, punctuator, breaks, hint, previous, parent};
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
          groupings: [],
          groupers: sourceMode.groupers || (sourceMode.groupers = {}),
        }),
      } = state;

      (state.source === (state.source = source) && index >= 0) ||
        (index = state.index = (index > 0 && index % source.length) || 0);

      let done, parent, last;

      let lastContext;

      const {
        [(state.syntax = state.mode.syntax)]: $ = defaults.syntaxes[defaults.syntax],
      } = defaults.syntaxes;

      const $contexting = contextualizer($, defaults);
      let $context = $contexting.next().value;

      // Initial contextual hint (syntax)
      !syntax ||
        (grouping.goal || (grouping.goal = syntax),
        grouping.hint && grouping.lastSyntax === syntax) ||
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
            })),
            previous && (previous.next = next),
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
              grouper &&
                (grouping.groupings.includes(grouper) || grouping.hints.delete(grouper.hinter),
                grouper.terminator && (grouping.terminator = undefined));
              (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
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
                grouping.groupings.push(grouper), grouping.hints.add(hinter);
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

    return {
      markup,
      matchers,
      patterns,
      syntaxes,
      modes,
      defaults,
      renderer,
      render,
      contextualizer,
      tokenizer,
      tokenize,
    };
  })();

  const modes = (({patterns, matchers}) => {
    /// INTERFACE
    const syntaxes = {};
    const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
      Object.assign(newSyntaxes, syntaxes);
      defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
    };

    /// IMPLEMENTATION

    const raw = String.raw;
    const lines = string => string.split(/\n+/);
    const symbols = string => string.split(/ +/);
    const closures = string => {
      const pairs = symbols(string);
      const array = new Array(pairs.length);
      array.pairs = pairs;
      let i = 0;
      for (const pair of pairs) {
        const [opener, closer] = pair.split('…');
        array[(array[i++] = opener)] = {opener, closer};
      }
      return array;
    };

    const Identifier = (first, rest, flags = 'ui', boundary = /yg/.test(flags) && raw`\b`) =>
      new RegExp(`${boundary || '^'}[${first}][${rest}]*${boundary || '$'}`, flags);

    const closeTag = /<\/\w[^<>{}]*?>/g;

    Object.assign(syntaxes, {
      md: {
        syntax: 'md',
        comments: closures('<!--…-->'),
        quotes: [],
        closures: closures(
          '**…** *…* ~~…~~ _…_ `…` ```…``` ~~~…~~~ #…\n ##…\n ###…\n <%…%> <!…> <…/> </…> <…>',
        ),
        patterns: {...patterns, closeTag},
        matcher: /(^\s+|\n)|((?:```+|\~\~\~+|---+|(?:\#{1,5}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|\*\*?|\~\~?|__?|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|>)/gim,
        matchers: {
          comment: /(\n)|(-->)/g,
        },
      },
      html: {
        syntax: 'html',
        keywords: symbols('DOCTYPE doctype'),
        comments: closures('<!--…-->'),
        quotes: [],
        closures: closures('<%…%> <!…> <…/> </…> <…>'),
        patterns: {
          ...patterns,
          closeTag,
          maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
        },
        matcher: matchers.xml,
        matchers: {
          quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
          comment: /(\n)|(-->)/g,
        },
      },
      css: {
        syntax: 'css',
        comments: closures('/*…*/'),
        closures: closures('{…} (…) […]'),
        quotes: symbols(`' "`),
        assigners: symbols(`:`),
        combinators: symbols('> :: + :'),
        nonbreakers: symbols(`-`),
        breakers: symbols(', ;'),
        patterns: {...patterns},
        matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|backdrop|before|checked|first-line|first-letter|default|dir|disabled|empty|enabled|first|first-child|first-of-type|focus|fullscreen|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|read-write|required|right|root|scope|target|valid|visited|active|any|any-link|checked|default|defined|disabled|empty|enabled|first|first-child|first-of-type|fullscreen|focus|focus-visible|focus-within|host|hover|indeterminate|in-range|invalid|last-child|last-of-type|left|link|only-child|only-of-type|optional|out-of-range|read-only|read-write|required|right|root|scope|target|valid|visited))/g,
        matchers: {
          quote: matchers.escapes,
          comment: matchers.comments,
        },
      },
      es: {
        syntax: 'es',
        comments: closures('//…\n /*…*/'),
        quotes: symbols(`' " \``),
        closures: closures('{…} (…) […]'),
        spans: {'`': closures('${…}')},
        keywords: symbols(
          // abstract enum interface type namespace declare package module
          'class function arguments const let var break continue debugger do export for import return switch while with yield async as case try catch throw finally default if else extends from in of await delete instanceof new typeof void this super get set',
        ),
        assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
        combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
        nonbreakers: symbols('.'),
        operators: symbols('++ -- !! ^ ~ ! ...'),
        breakers: symbols(', ;'),
        patterns: {...patterns},
        matcher: new RegExp(
          raw`([\s\n]+)|(${[
            /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/|\/=|\/\/|\/\*|\*\/|\//
              .source, // [igmsuy]*(?=[\)\]\}\,\.\;\n ])
            /`|"|'|\{|\}|\(|\)|\[|\]/.source,
            /,|;|\.\.\.|\.|\:|\?|=>/.source,
            /!==|===|==|=/.source,
            ...symbols(raw`\+ \- \* & \|`).map(s => `${s}${s}|${s}=?`),
            ...symbols(raw`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=?`),
          ].join('|')})`,
          'g',
        ),
        matchers: {
          quote: matchers.quotes,
          comment: matchers.comments,
        },
      },
    });

    /// HTML
    syntaxes.html.closures['<'].quotes = symbols(`' "`);
    syntaxes.html.closures['<'].closer = /\/?>/;
    syntaxes.html.closures['<'].close = (next, state, grouper) => {
      let token;
      const parent = next.parent;
      const first = (token = parent.next);
      if (/^script|style$/i.test(first.text)) {
        let {source, index} = state;
        const $$matcher = syntaxes.html.patterns.closeTag;
        const $$closer = new RegExp(raw`^<\/${first.text}\b`);
        let match = $$matcher.exec(source);
        $$matcher.lastIndex = index;
        while ((match = $$matcher.exec(source))) {
          if ($$closer.test(match[0])) {
            const offset = index;
            const text = source.slice(offset, match.index - 1);
            state.index = match.index;
            return [{text, offset, previous: next, parent: first.parent}];
          }
          break;
        }
      }
    };

    /// MD
    syntaxes.md.closures['<'].quotes = syntaxes.html.closures['<'].quotes;
    syntaxes.md.closures['<'].closer = syntaxes.html.closures['<'].closer;
    syntaxes.md.closures['<'].close = syntaxes.html.closures['<'].close;
    syntaxes.md.patterns = {...syntaxes.html.patterns};

    /// ES

    // syntaxes.es.closures['<'].open = (next, state, previous) => 'combinator';
    // syntaxes.es.patterns = {...syntaxes.es.patterns};

    /** @see https://github.com/acornjs/acorn/blob/2adf569de6f77e2f9971d944669ec70071acfb30/acorn/src/identifier.js#L30-L36 */
    {
      let nonASCIIidentifierStartChars =
        // '$a-zA-Z_' ||
        raw`a-zA-Z_$\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`;
      let nonASCIIidentifierChars =
        // '$\\w+' ||
        raw`a-zA-Z0-9_$\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`;

      syntaxes.es.patterns.maybeIdentifier = Identifier(
        nonASCIIidentifierStartChars,
        nonASCIIidentifierChars,
      );

      nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
    }

    return {syntaxes, install};
  })(api);

  const dom = (() => {
    /// OPTIONS
    const HTML_MODE = true;
    const NESTED_MODE = false;
    const SPAN = 'span';
    const SLOT = 'slot';
    const CLASS = 'markup';

    /// INTERFACE

    const renderers = {};

    function* renderer(tokens, tokenRenderers = renderers) {
      for (const token of tokens) {
        const {type = 'text', text, punctuator} = token;
        const tokenRenderer =
          (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
          (type && tokenRenderers[type]) ||
          (text && tokenRenderers.text);
        const element = tokenRenderer && tokenRenderer(text, token);
        element && (yield element);
      }
    }

    // TODO: See how to wire nester with renderer
    function* nester(elements) {
      let parent, root;
      root = parentElement = Element(SLOT, {className: CLASS});
      for (const element of elements) {
        const token = element.token;
        parent = token.parent || undefined;
        parentElement = (parent && parent.element) || root;
        parentElement.appendChild(element);
      }
      yield root;
    }

    const install = (defaults, newRenderers = defaults.renderers || {}) => {
      Object.assign(newRenderers, renderers);
      defaults.renderers === newRenderers || (defaults.renderers = newRenderers);
      defaults.renderer = renderer;
    };

    const supported =
      typeof document === 'object' &&
      document !== null &&
      typeof document.createElement === 'function';

    /// IMPLEMENTATION
    const none = Object.freeze(Object.create(null));

    const createElement = (tag, properties, ...children) => {
      const element = document.createElement(tag);

      properties && Object.assign(element, properties);

      if (children.length) {
        if (element.append) {
          while (children.length > 500) element.append(...children.splice(0, 500));
          children.length && element.append(...children);
        } else if (element.appendChild) {
          for (const child of children) element.appendChild(child);
        }
      }

      return element;
    };

    const createHTML = (tag, properties, ...children) => {
      const {className = ''} = properties || none;
      const element = {
        tag,
        className,
        properties,
        children,

        append(...elements) {
          // for (const element of elements) element.parentElement = element.parentNode = this;
          this.children.push(...elements);
        },

        appendChild(element) {
          this.children.push(element);
          return element;
        },

        toString() {
          const {tag, className, children = none, properties} = this;
          const classes = className ? `class="${className}"` : '';
          const attributes = `${classes}`.trim();

          return `<${tag}${attributes ? ` ${attributes}` : ''}>${
            children.length > 0 ? children.join('') : ''
          }</${tag}>`;
        },
      };

      if (children.length) element.children = children;

      return element;
    };

    // const Element = createHTML;
    const Element = !HTML_MODE && supported ? createElement : createHTML;
    const Text =
      Element === createElement
        ? (content = '') => document.createTextNode(content)
        : (content = '') =>
            String(content).replace(/[\u00A0-\u9999<>\&]/gim, v => `&#${v.charCodeAt(0)};`);

    const factory = (tag, properties) => (content, token) => {
      const textual = typeof content === 'string';
      const element =
        (content && Element(tag, properties, (textual && Text(content)) || content)) || undefined;

      token &&
        (token.form && (element.className += ` maybe-${token.form}`),
        token.hint && (element.className += ` ${token.hint}`),
        element && (element.token = token));

      return element;
    };

    Object.assign(renderers, {
      // whitespace: factory(TAG, {className: `${CLASS} whitespace`}),
      whitespace: Text,
      // text: Text,
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
      comment: factory(SPAN, {className: `${CLASS} comment`}),
    });

    return {renderers, renderer, nester, install, supported};
  })();

  const initialize = () => {
    /// SELF
    const self = (scope.self === scope && scope.self) || false;

    // if ('onmessage' in self && isFunction[typeof self.postMessage]) {
    //   if (self.window === self && isFunction[typeof self.Worker]) {
    //     const type = 'module';
    //     // const url = import.meta.url;
    //     const url = `${new URL('./worker.js', import.meta.url)}`;
    //     const worker = new Worker(url, {type});
    //     // self.addEventListener('message', ({data}) => {});
    //   }
    // }

    /// DOM

    const document = (isObject[typeof scope.document] && scope.document) || false;
    const supportsElements = document && isFunction(document.createElement);
    const createFragment =
      document && isFunction(document.createDocumentFragment)
        ? () => document.createDocumentFragment()
        : Array;

    /** May hold a temporary template element for rendering */
    const template =
      supportsElements &&
      (template =>
        'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
        template)(document.createElement('template'));

    console.log({self, document, template, createFragment});

    /// API
    const syntaxes = {};
    const renderers = {};
    const defaults = {...api.defaults};

    modes.install(defaults, syntaxes); // reset defaults.syntaxes
    dom.install(defaults, renderers); // reset defaults.renderers

    tokenize = (source, options) => api.tokenize(source, {options}, defaults);

    render = (source, options) => {
      const fragment = options.fragment || createFragment();

      const elements = api.render(source, options, defaults);
      let first = elements.next();

      if (first && 'value' in first) {
        if ('push' in fragment) {
          fragment.push(first.value);
          if (!first.done) for (const element of elements) fragment.push(element);
        } else if ('append' in fragment && first.value.nodeType >= 1) {
          fragment.append(first.value);
          if (!first.done) for (const element of elements) fragment.append(element);
        } else if ('textContent' in fragment) {
          let text = `${first.value}`;
          if (!first.done) for (const element of elements) text += `${element}`;
          if (template) {
            template.innerHTML = text;
            fragment.appendChild(template.content);
          } else {
            // TODO: Find a workaround for DocumentFragment.innerHTML
            fragment.innerHTML = text;
          }
        }
      }

      return fragment;
    };

    return markup;
  };

  let render = (source, options) => {
    initialize();
    return render(source, options);
  };
  let tokenize = (source, options) => {
    initialize();
    return tokenize(source, options);
  };

  const markup = Object.create(api, {
    initialize: {get: () => initialize},
    render: {get: () => render},
    tokenize: {get: () => tokenize},
    dom: {get: () => dom},
    modes: {get: () => api.modes},
  });

  // export default markup;

  /// HELPERS
  const TypeOf = type =>
    TypeOf[type] ||
    (TypeOf[type] = Object.defineProperties(
      Object.setPrototypeOf(unknown => type === typeof unknown, null),
      Object.getOwnPropertyDescriptors(
        Object.freeze({
          boolean: type === 'boolean',
          number: type === 'number',
          bigint: type === 'bigint',
          string: type === 'string',
          symbol: type === 'symbol',
          object: type === 'object',
          function: type === 'function',
          undefined: type === 'undefined',
        }),
      ),
    ));

  const isFunction = TypeOf('function');
  const isObject = TypeOf('object');

  /// SCOPE
  const scope =
    // Browser Scope
    (isObject[typeof self] && self && self === self.self && self) ||
    // Node.js Scope
    (isObject[typeof global] && global && global === global.global && global) ||
    // Unknown Scope
    Object.create(null, {[Symbol.toStringTag]: {value: 'UnknownScope'}});

  const supportsMessage = scope && 'onmessage' in scope && isFunction[typeof scope.postMessage];

  if (supportsMessage) {
    if (scope.window === scope) {
    } else if (scope.self === 'self') {
      initialize();
    }
    // self.addEventListener('message', ({data}) => {});
  }

  // if (import.meta.url.includes('#initialize')) initialize();

  return {render, tokenize, markup};
})();
