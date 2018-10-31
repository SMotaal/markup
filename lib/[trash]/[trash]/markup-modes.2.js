import {matchers, modes} from './markup-parser.js';
import {patterns, expressions, identifier, sequence, all} from './markup-patterns.js';

/// INTERFACE

export const install = (defaults, newSyntaxes = defaults.syntaxes || {}) => {
  Object.assign(newSyntaxes, syntaxes);
  defaults.syntaxes === newSyntaxes || (defaults.syntaxes = newSyntaxes);
};

/// IMPLEMENTATION

const raw = String.raw;

const lines = string => string.split(/\n+/);

const symbols = (...args) => {
  const symbols = new Set();
  for (const arg of args) {
    if (!arg || !Symbol.iterator in arg || arg.length === 0) continue;
    for (const symbol of arg.split ? arg.split(/ +/) : arg) symbols.add(symbol);
  }
  return [...symbols];
};

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
  const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\//g;
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
    const QUOTES = /`|"(?:[^\\"]+|\\.)*"|'(?:[^\\']+|\\.)*'/g;
    const COMMENTS = /\/\/.*\n|\/\*[^]*?\*\//g; // [^] === (?:.*\n)
    const STATEMENTS = all(QUOTES, CLOSURES, REGEXPS, COMMENTS);
    const TOPLEVEL = sequence`([\s\n]+)|(${STATEMENTS})`;
    const BLOCK = sequence`([\s\n]+)|(${STATEMENTS})`;
    const CLOSURE = sequence`(\n+)|(${STATEMENTS})`;
    const BODY = sequence`([\s\n]+)|(${STATEMENTS}|\b.\b|(?:\b|\B)=(?=[\w\s]))`;
    const CJS = sequence`([\s\n]+)|(${STATEMENTS})|\bexports\b|\bmodule.exports\b|\brequire(?=\()`;

    const {comments, quotes, closures, spans, keywords} = syntaxes.es;
    const {comment, quote} = syntaxes.es.matchers;

    keywords.esm = symbols('import export from as default');
    keywords.cjs = symbols('import module exports require');
    keywords.import = ['import'];

    syntaxes.esm = {
      syntax: 'esm',
      keywords: ['import', ...Keywords.ESM],
      keywords: symbols('import export from as default'),
      // comments,
      quotes,
      closures,
      spans,
      matcher: TOPLEVEL,
      // matcher: sequence`([\s\n]+)|(${STATEMENTS}|\b(?=${Keywords.ESM.join('|')}))`,
      matchers: {comment, quote, closure: CLOSURE},
    };

    modes.esm = {syntax: 'esm'};

    syntaxes.esx = {
      syntax: 'esx',
      // keywords: symbols('import export from as default module exports require'),
      keywords: [...Keywords.ES, ...Keywords.ESM, ...Keywords.CJS],
      // comments,
      quotes,
      closures,
      spans,
      // matcher: TOPLEVEL,
      // matchers: {comment, quote, closure: BLOCK},
      // matcher: BODY,
      // matchers: {comment, quote, closure: BODY},
      matcher: CJS,
      matchers: {comment, quote, closure: CJS},
    };

    modes.esx = {syntax: 'esx'};

    syntaxes.cjs = {
      syntax: 'cjs',
      keywords: symbols('import module exports require'),
      // keywords: [...Keywords.ES, ...Keywords.CJS],
      // comments,
      quotes,
      closures,
      spans,
      // matcher: TOPLEVEL,
      // matchers: {comment, quote, closure: BLOCK},
      // matcher: BODY,
      // matchers: {comment, quote, closure: BODY},
      matcher: CJS,
      matchers: {comment, quote, closure: CJS},
    };

    modes.cjs = {syntax: 'cjs'};
  }
}

/// Bootstrap
export const ready = (async () => {
  await expressions.ready;
  const maybeIdentifier = (syntaxes.es.patterns.maybeIdentifier = identifier(
    expressions.es.IdentifierStart,
    expressions.es.IdentifierPart,
  ));
  console.log({maybeIdentifier: `${maybeIdentifier}`});
})();
