import {sequence, all} from '../helpers.mjs';

// export const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*?/g;
// export const REGEXPS = /(?<![\w\)\]\}][ \t]*)\/(?=[^\*\/\n][^\n]*\/)(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*?/g;
// export const REGEXPS = /\/(?=[^\?\+\*\/\n][^\n]*\/(?:[a-z]*[ \t]+[^\n\s\(\[\{\w]|[a-z]*[\.\[;,]|[a-z]*[ \t]*[\)\]\}\;\,]))(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
// export const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/(?:[a-z]*[ \t]+[^\n\s\(\[\{\w]|[a-z]*[\.\[;,]|[a-z]*[ \t]*[\)\]\}\;\,]))(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;
export const REGEXPS = /\/(?=[^\*\/\n][^\n]*\/(?:[a-z]+\b)?(?:[ \t]+[^\n\s\(\[\{\w]|[\.\[;,]|[ \t]*[\)\]\}\;\,\n]|\n|$))(?:[^\\\/\n\t\[]+|\\\S|\[(?:\\\S|[^\\\n\t\]]+)+?\])+?\/[a-z]*/g;


export const COMMENTS = /\/\/|\/\*|\*\/|\/|^\#\!.*\n/g;
COMMENTS['(closures)'] = '//…\n /*…*/';

export const QUOTES = /`|"|'/g;
QUOTES['(symbols)'] = `' " \``;

export const CLOSURES = /\{|\}|\(|\)|\[|\]/g;
CLOSURES['(closures)'] = '{…} (…) […]';

// export const SPANS = {'`': {['(closures)']: '${…}'}};
export const SPANS = {'`': {['(closures)']: '${…}'}};

// '(spans)': {['(closures)']: '?…:'},

export const KEYWORDS = {
  ['(symbols)']:
    // abstract enum interface package namespace declare type module
    'arguments as async await break case catch class export const continue debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
};

export const ASSIGNERS = {['(symbols)']: '= += -= *= /= **= %= |= ^= &= <<= >>= >>>='};

export const COMBINATORS = {['(symbols)']: '>= <= == === != !== || && ! & | > < => % + - ** * / >> << >>> ? :'};
export const NONBREAKERS = {['(symbols)']: '.'};
export const OPERATORS = {['(symbols)']: '++ -- !! ^ ~ ! ...'};
export const BREAKERS = {['(symbols)']: ', ;'};

export const segmenter = sequence`([\s\n]+)|((?:${all(
  /"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/, // QUOTES,
  // CLOSURES,
  REGEXPS,
  /\/\*[^]*?(?:\*\/|$)/,
  /[^\n;\/]+?|\/[^\/*]/,
)})+;*|;+)|${/\/\/.*(?:\n|$)|^\#\!.*\n/}`;
