import {patterns, matchers} from './markup.js';

/// INTERFACE

export const syntaxes = {};

export const install = defaults =>
  Object.assign(defaults.syntaxes || (defaults.syntaxes = {}), syntaxes);

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

const Identifier = (first, rest, flags = 'i', boundary = /yg/.test(flags) && raw`\b`) =>
  new RegExp(raw`${boundary || '^'}[${first}][${rest}]*${boundary || '$'}`, flags);

Object.assign(syntaxes, {
  md: {
    syntax: 'md',
    quotes: [],
    comments: closures('<!--…-->'),
    closures: closures('**…** *…* ~~…~~ _…_ `…` ```…``` #…\n ##…\n ###…\n'),
    patterns,
    matcher: /(^\s+|\n)|(^\`\`\`|^\~\~\~|^\#{1,3}(?=\s+\S+)|\*\*?\b|\b\*\*?|\~\~?\b|\b\~\~?|\`+\b|\b\`+|\*\*?\b|\b\*\*?|"|'|=|\/?>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/mgi,
    matchers: {
      quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
      comment: /(\n)|(-->)/g,
    },
  },
});
