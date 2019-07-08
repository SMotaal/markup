import {matchers, modes} from './markup-parser.js';
import {patterns, entities} from './markup-patterns.js';
import * as helpers from './helpers.js';
import * as extensions from './extensions/modes.js';

/// INTERFACE
const definitions = {};

export const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes);
  Object.defineProperties(newSyntaxes, definitions);
  defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
};

export const syntaxes = {};

/// DEFINITIONS
Syntaxes: {
  const {Closures, Symbols, sequence, all, raw} = helpers;

  CSS: {
    const css = (syntaxes.css = {
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
    const html = (syntaxes.html = {
      ...(modes.html = {syntax: 'html'}),
      keywords: Symbols.from('DOCTYPE doctype'),
      comments: Closures.from('<!--…-->'),
      closures: Closures.from('<?…?> <!…> <…/> </…> <…>'),
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
          const $$matcher = syntaxes.html.patterns.closeTag;

          let match; //  = $$matcher.exec(source);
          $$matcher.lastIndex = index;

          // TODO: Check if `<script>`…`</SCRIPT>` is still valid!
          const $$closer = new RegExp(raw`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

          let syntax = (tag === 'STYLE' && 'css') || '';

          if (!syntax) {
            const openTag = source.slice(parent.offset, index);
            const match = /\stype=.*?\b(.+?)\b/.exec(openTag);
            syntax = tag === 'SCRIPT' && (!match || !match[1] || /^module$|javascript/i.test(match[1])) ? 'es' : '';
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
      comments: Closures.from('<!--…-->'),
      quotes: [],
      closures: Closures.from(html.closures, CLOSURES),
      patterns: {...html.patterns},
      matcher: /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|--+|==+|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<\?|\?>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|\b([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)/gim,
      spans: undefined,
      matchers: {comment: /(\n)|(-->)/g},
    });

    if (md.closures) {
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
            if (!EMBEDDED) {
              text = body;
              tokens.push({text, type: 'code', offset, parent});
              offset += body.length;
            } else {
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

    const es = (syntaxes.es = {
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
      combinators: Symbols.from('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
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

      const esm = (syntaxes.esm = {
        ...(modes.esm = {syntax: 'esm'}),
        keywords: Symbols.from('import export default'),
        ...syntax,
        matcher: ESM,
        matchers: {...matchers, closure: CLOSURE},
      });
      const cjs = (syntaxes.cjs = {
        ...(modes.cjs = {syntax: 'cjs'}),
        keywords: Symbols.from('import module exports require'),
        ...syntax,
        matcher: CJS,
        matchers: {...matchers, closure: CJS},
      });
      const esx = (syntaxes.esx = {
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
export const ready = (async () => {
  await entities.ready;
  syntaxes.es.patterns.maybeIdentifier = helpers.identifier(entities.es.IdentifierStart, entities.es.IdentifierPart);
  // setTimeout(() => console.log('Syntaxes: %O', syntaxes), 1000);
  // console.log({maybeIdentifier: `${syntaxes.es.patterns.maybeIdentifier}`});
})();
