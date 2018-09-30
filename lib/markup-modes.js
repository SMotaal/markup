import {patterns, matchers} from './markup.js';

/// INTERFACE

export const syntaxes = {};

export const install = defaults =>
  Object.assign(defaults.syntaxes || (defaults.syntaxes = {}), syntaxes);

/// IMPLEMENTATION

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

Object.assign(syntaxes, {
  html: {
    syntax: 'html',
    assigners: symbols(`=`),
    nonbreakers: symbols(`- :`),
    // quotes: symbols(`"`),
    quotes: [],
    comments: closures('<!--…-->'),
    closures: closures('<%…%> <!…> <…/> </…> <…>'),
    patterns,
    matcher: matchers.xml,
    matchers: {
      // 'quote': matchers.escapes,
      quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
      comment: /(\n)|(-->)/g,
    },
  },
  css: {
    syntax: 'css',
    assigners: symbols(`:`),
    combinators: symbols('> :: + :'),
    nonbreakers: symbols(`-`),
    breakers: symbols(', ;'),
    quotes: symbols(`' "`),
    comments: closures('/*…*/'),
    closures: closures('{…} (…) […]'),
    patterns,
    matcher: matchers.sequences,
    matchers: {
      quote: matchers.escapes,
      comment: matchers.comments,
    },
  },
  es: {
    syntax: 'es',
    keywords: symbols(
      'enum interface module namespace type class function const let var break continue debugger do export for import return switch while with declare abstract async as case catch default if else extends finally from in of await delete instanceof new typeof void this',
    ),
    assigners: symbols('= += -= *= /= **= %= |= ^= &= <<= >>= >>>='),
    operators: symbols('++ -- !! + - ^ ~ ! ...'),
    combinators: symbols('>= <= == === != !== || && ! & | > < => % ** * / >> << >>> ? :'),
    breakers: symbols(', ;'),
    quotes: symbols(`' " \``),
    comments: closures('//…\n /*…*/'),
    spans: {
      '`': closures('${…}'),
    },
    closures: closures('{…} (…) […]'),
    patterns,
    matcher: matchers.sequencesAndRegexp,
    matchers: {
      quote: matchers.quotes,
      comment: matchers.comments,
      span: matchers.sequencesAndRegexp,
    },
  },
});

syntaxes.html.closures['<'].quotes = symbols(`' "`);
