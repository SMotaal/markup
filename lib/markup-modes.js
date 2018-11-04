import {matchers, modes} from './markup-parser.js';
import {patterns, entities, identifier, sequence, all} from './markup-patterns.js';

/// INTERFACE

export const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes);
  defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
};

export const syntaxes = {};

/// DEFINITIONS
Syntaxes: {
  /// Helpers
  const raw = String.raw;
  const lines = string => string.split(/\n+/);
  const closures = string => {
    const pairs = symbols(string);
    const array = new Array(pairs.length);
    array.pairs = pairs;
    let i = 0;
    for (const pair of pairs) {
      const [opener, closer] = pair.split('…');
      array[(array[i++] = opener)] = {opener, closer};
    }
    array.toString = () => string;
    return array;
  };
  const symbols = source =>
    (source &&
      ((typeof source === 'string' && source.split(/ +/)) ||
        (Symbol.iterator in source && [...source]))) ||
    [];
  symbols.from = (...args) => [...new Set([].concat(...args.map(symbols)))];

  // const LINES = /(\n)/g;
  const LINE = /$/g;

  CSS: {
    const css = (syntaxes.css = {
      ...(modes.css = {syntax: 'css'}),
      comments: closures('/*…*/'),
      closures: closures('{…} (…) […]'),
      quotes: symbols(`' "`),
      assigners: symbols(`:`),
      combinators: symbols('> :: + :'),
      nonbreakers: symbols(`-`),
      breakers: symbols(', ;'),
      patterns: {...patterns},
      matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|any|any-link|backdrop|before|checked|default|defined|dir|disabled|empty|enabled|first|first-child|first-letter|first-line|first-of-type|focus|focus-visible|focus-within|fullscreen|host|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|required|right|root|scope|target|valid|visited))/g,
      matchers: {
        quote: matchers.escapes,
        comment: matchers.comments,
      },
    });
  }

  HTML: {
    const html = (syntaxes.html = {
      ...(modes.html = {syntax: 'html'}),
      keywords: symbols('DOCTYPE doctype'),
      comments: closures('<!--…-->'),
      quotes: [],
      closures: closures('<%…%> <!…> <…/> </…> <…>'),
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
      const TAG = /^[a-z]+$/i;
      const SUBS = symbols('SCRIPT STYLE');
      html.closures['<'].close = (next, state, context) => {
        let token;
        const parent = next && next.parent;
        const first = parent && (token = parent.next);
        const tag = first && first.text && TAG.test(first.text) && first.text.toUpperCase();

        if (tag && SUBS.includes(tag)) {
          let {source, index} = state;
          const $$matcher = syntaxes.html.patterns.closeTag;

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
            // break;
          }

          // TODO: Uncomment once token buffering is implemented
          // tag && (first.type = 'keyword');
        }
        // else if (!tag) {
        //   console.log({parent, first, tag});
        // }
      };
      html.closures['<'].quotes = symbols(`' "`);
      html.closures['<'].closer = /\/?>/;
      // html.closures['<'].patterns = {
      //   maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
      // }
    }
  }

  Markdown: {
    const BLOCK = '```…``` ~~~…~~~';
    const INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
    /**
     * TODO: Address unexpected closures in parsing fragmenter
     *
     * As far as tokenization goes, unexpected closures are still
     * closures nonetheless. They are not spans.
     */
    const SPANS = ''; // INLINE
    const CLOSURES = SPANS ? BLOCK : `${BLOCK} ${INLINE}`;

    const html = syntaxes.html;
    const md = (syntaxes.md = {
      ...(modes.markdown = modes.md = {syntax: 'md'}),
      comments: closures('<!--…-->'),
      quotes: [],
      closures: closures(`${html.closures} ${CLOSURES}`),
      patterns: {...html.patterns},
      matcher: /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|--+|==+|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|\b([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)/gim,
      spans: undefined,
      matchers: {comment: /(\n)|(-->)/g},
    });

    // md.patterns.maybeIdentifier = undefined;

    if (SPANS) {
      md.spans = {md: closures(SPANS)};
      const spans = SPANS.split(' ');
      for (const [opener] of md.spans.md) {
        const subspans = spans.filter(span => !span.startsWith(opener));
        md.spans[opener] = closures(subspans.join(' '));
      }
    }

    if (md.closures) {
      md.closures['<'] = {...html.closures['<']};

      const SYNTAX = /^\w+$/;

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

      const EMBEDDED = true;
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
          if (!EMBEDDED) {
            text = body;
            tokens.push({text, type: 'code', offset, parent});
            offset += body.length;
          } else {
            const [head, ...lines] = body.split(/(\n)/g);
            if (head) {
              // const [, syntax, attributes] = /^(\w.*\b)?\s*(.*)\s*$/.exec(head);
              tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
              // console.log({head, lines, indenting, INDENT});
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

      md.closures['```'].open = md.closures['~~~'].open = open;

      if (md.closures['```'] && !md.closures['```'].open) {
        md.closures['```'].quotes = html.closures['<'].quotes;
        md.closures['```'].matcher = /(\s*\n)|(```(?=```\s|```$)|^(?:[\s>|]*\s)?\s*)|.*$/gm;
      }

      if (md.closures['~~~'] && !md.closures['~~~'].open) {
        md.closures['~~~'].quotes = html.closures['<'].quotes;
        md.closures['~~~'].matcher = /(\s*\n)|(~~~(?=~~~\s|~~~$)|^(?:[\s>|]*\s)?\s*)|.*$/gm;
      }
    }

    // console.log(md);
  }

  ECMAScript: {
    const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
    const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
    const QUOTES = /`|"|'/g;
    const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

    const es = (syntaxes.es = {
      ...(modes.javascript = modes.es = modes.js = {syntax: 'es'}),
      comments: closures('//…\n /*…*/'),
      quotes: symbols(`' " \``),
      closures: closures('{…} (…) […]'),
      spans: {'`': closures('${…}')},
      keywords: symbols(
        // abstract enum interface package  namespace declare type module
        'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
      ),
      assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
      combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
      nonbreakers: symbols('.'),
      operators: symbols('++ -- !! ^ ~ ! ...'),
      breakers: symbols(', ;'),
      patterns: {...patterns},
      matcher: sequence`([\s\n]+)|(${all(
        REGEXPS,
        raw`\/=`,
        COMMENTS,
        QUOTES,
        CLOSURES,
        /,|;|\.\.\.|\.|\:|\?|=>/,
        /!==|===|==|=/,
        ...symbols(raw`\+ \- \* & \|`).map(s => `${s}${s}|${s}=|${s}`),
        ...symbols(raw`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=|${s}`),
      )})`,
      matchers: {
        quote: matchers.quotes,
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

      const esm = (syntaxes.esm = {
        ...(modes.esm = {syntax: 'esm'}),
        keywords: symbols('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers, closure: CLOSURE},
      });
      const cjs = (syntaxes.cjs = {
        ...(modes.cjs = {syntax: 'cjs'}),
        keywords: symbols('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers, closure: CJS},
      });
      const esx = (syntaxes.esx = {
        ...(modes.esx = {syntax: 'esx'}),
        keywords: symbols.from(esm.keywords, cjs.keywords),
        ...syntax,
        matcher: ESX,
        matchers: {...matchers, closure: ESX},
      });
    }
  }
}

/// Bootstrap
export const ready = (async () => {
  await entities.ready;
  syntaxes.es.patterns.maybeIdentifier = identifier(
    entities.es.IdentifierStart,
    entities.es.IdentifierPart,
  );
  // console.log({maybeIdentifier: `${syntaxes.es.patterns.maybeIdentifier}`});
})();

// const QUOTES = /`|"\""|""|"(?:[^\"]+|\\.)*(?:"|$)|'\''|''|(?:[^\']+|\\.)*(?:'|$)/g;
// const QUOTES = /`|""|"(?:.*\\.|.*?)*?(?:"|$)|''|'(?:[^\\]*|\\.)*(?:'|$)/g;
// const QUOTES = /`|"(?:\\"|[^\\"]*)*(?:"|$)|'(?:\\.?|[^\\']+)*(?:'|$)|"|'/g;
// const QUOTES = /`|"(?:\\.?|[^\\]*?)*?(?:"|$)|'(?:\\.?|[^\\']*?)*?(?:'|$)/g;
