import {matchers, modes} from './markup-parser.js';
import {patterns, entities, identifier, sequence, all} from './markup-patterns.js';

/// INTERFACE

export const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes);
  defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
};

/// IMPLEMENTATION

const raw = String.raw;

const lines = string => string.split(/\n+/);

const symbols = source =>
  (source &&
    ((typeof source === 'string' && source.split(/ +/)) ||
      (Symbol.iterator in source && [...source]))) ||
  [];

symbols.from = (...args) => [...new Set([].concat(...args.map(symbols)))];

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

// const openTag = /<\w[^<>{}]*?>/g;
const closeTag = /<\/\w[^<>{}]*?>/g;

/// SYNTAXES
export const syntaxes = {
  md: {
    syntax: 'md', // ...(modes.markdown = modes.md = {syntax: 'md'}),
    comments: closures('<!--…-->'),
    quotes: [],
    // closures: closures('**…** *…* ~~…~~ _…_ `…` ```…``` ~~~…~~~ #…\n ##…\n ###…\n ####…\n #####…\n <%…%> <!…> <…/> </…> <…>'),
    closures: closures('<%…%> <…/> </…> <…> ```…\n```'),
    patterns: {...patterns, closeTag},
    matcher: /(^\s+|\n)|(&[a-z0-9]+;|(?:```+|\~\~\~+|---+|(?:\#{1,5}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|>|\(|\)|\[|\]|([*~_`])\3?\b|\b([*~_`])\4?)|\b[^\n\s\[\]\(\)\<\>&]+\b/gim,
    // \B([*~_`])\3?\b|\b([*~_`])\4?\B //|(?:\*\*?|~\~?|__?|\`{1,2})
    spans: {md: closures('[…] (…)')},
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
    matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|::\b|:(?!active|after|any|any-link|backdrop|before|checked|default|defined|dir|disabled|empty|enabled|first|first-child|first-letter|first-line|first-of-type|focus|focus-visible|focus-within|fullscreen|host|hover|in-range|indeterminate|invalid|lang|last-child|last-of-type|left|link|matches|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|optional|out-of-range|read-only|required|right|root|scope|target|valid|visited))/g,
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
      // abstract enum interface package  namespace declare type module
      'arguments as async await break case catch class const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set super switch this throw try typeof var void while with yield',
    ),
    assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
    combinators: symbols('>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'),
    nonbreakers: symbols('.'),
    operators: symbols('++ -- !! ^ ~ ! ...'),
    breakers: symbols(', ;'),
    patterns: {...patterns},
    matcher: undefined,
    matchers: {
      quote: matchers.quotes,
      comment: matchers.comments,
    },
  },
};

/// HTML
{
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
}

/// MD
{
  syntaxes.md.closures['<'].quotes = syntaxes.html.closures['<'].quotes;
  syntaxes.md.closures['<'].closer = syntaxes.html.closures['<'].closer;
  syntaxes.md.closures['<'].close = syntaxes.html.closures['<'].close;
  syntaxes.md.patterns = {...syntaxes.html.patterns};
}

/// ES
{
  const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
  const COMMENTS = /\/\/|\/\*|\*\/|\//g;
  const QUOTES = /`|"|'/g;
  const CLOSURES = /\{|\}|\(|\)|\[|\]/g;

  syntaxes.es.matcher = sequence`([\s\n]+)|(${all(
    REGEXPS,
    raw`\/=`,
    COMMENTS,
    QUOTES,
    CLOSURES,
    /,|;|\.\.\.|\.|\:|\?|=>/,
    /!==|===|==|=/,
    ...symbols(raw`\+ \- \* & \|`).map(s => `${s}${s}|${s}=|${s}`),
    ...symbols(raw`! \*\* % << >> >>> < > \^ ~`).map(s => `${s}=|${s}`),
  )})`;

  {
    // TODO: Undo $ matching once fixed
    const QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
    const COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)/g; // [^] === (?:.*\n)
    const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
    const BLOCKLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
    const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
    const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
    const ESM = sequence`${TOPLEVEL}|\bexport\b|\bimport\b`;
    const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b`;

    const {quotes, closures, spans} = syntaxes.es;
    const syntax = {quotes, closures, spans};
    const matchers = {};
    ({quote: matchers.quote} = syntaxes.es.matchers);

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
      matcher: CJS,
      matchers: {...matchers, closure: CJS},
    });
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

// const ESM = sequence`${BLOCKLEVEL}`;
// const ESM = sequence`(\n+)|(${STATEMENTS})|\bexport +(?=default |async function|function |class |const |var |let |\{)|\bimport(?=\(| +.*? from )`;
// const CJS = sequence`${BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire(?=\(|\.resolve\()`;
// const ESM = sequence`(\n+)|(${STATEMENTS})|\bexport\b|\bimport\b`;

// matcher: /(^\s+|\n)|((?:```+|\~\~\~+|---+|(?:\#{1,5}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|(\*\*?|~\~?|__?|\`+)\b(?=[^\n]+?\b\3)|\*\*?|\~\~?|__?|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|>|\(|\)|\[|\])/gim,
// matcher: /(^\s+|\n)|((?:```+|\~\~\~+|---+|(?:\#{1,5}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|>|\(|\)|\[|\]|\b(\*\*?|~\~?|__?|\`{1,3})(?=$|\s|[^\w\3])|(?:\B|^)(\*\*?|~\~?|__?|\`{1,2})\b(?=.+?\b\4(?:$|\s|[^\w\4])))/gim, //
