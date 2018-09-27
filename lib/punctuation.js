/// CONSTANTS
export const LH = 0;
export const RH = 1;
/// SIGNS
export const [SPACE, TAB, NEWLINE] = [' ', '\t', '\n'];
export const [DOLLAR, AND, OR, ASTERISK] = ['$', '&', '|', '*'];
/// COMMENTS
export const LINECOMMENTS = ['//', '\n'];
export const BLOCKCOMMENTS = ['/*', '*/'];
/// CLOSURES
export const [BRACES, BRACKETS, PARENTHESES, TAGS, ARROWHEADS] = ['{}', '[]', '()', '<>', '«»'];
export const OPENERS = [BRACES[LH], BRACKETS[LH], PARENTHESES[LH], TAGS[LH]];
export const CLOSERS = [BRACES[RH], BRACKETS[RH], PARENTHESES[RH], TAGS[RH]];
export const CLOSURES = [...OPENERS, ...CLOSERS];
/// STRINGS
export const [QUOTE, BACKTIC, SINGLEQUOTE] = ['"', "'", '`'];
export const BACKTICS = `${BACKTIC}${BACKTIC}`;
export const QUOTES = `${QUOTE}${QUOTE}`;
export const SINGLEQUOTES = `${SINGLEQUOTE}${SINGLEQUOTE}`;
export const TEMPLATESPAN = [`${DOLLAR}${BRACES[LH]}`, BRACES[RH]];
/// CLASSIFIERS
export const CLASSIFIERS = {
  TERMINALS: {
    /// COMMENTS
    [LINECOMMENTS[LH]]: LINECOMMENTS[RH],
    [BLOCKCOMMENTS[LH]]: BLOCKCOMMENTS[RH],

    /// CLOSURES
    [BRACES[LH]]: BRACES[RH],
    [BRACKETS[LH]]: BRACKETS[RH],
    [PARENTHESES[LH]]: PARENTHESES[RH],
    [TAGS[LH]]: TAGS[RH],

    /// STRINGS
    [QUOTES[LH]]: QUOTES[RH],
    [SINGLEQUOTES[LH]]: SINGLEQUOTES[RH],
    [BACKTICS[LH]]: BACKTICS[RH],
    [TEMPLATESPAN[LH]]: TEMPLATESPAN[RH],
  },
  LITERALS: {
    /// STRINGS
    [QUOTE]: [BACKTIC, SINGLEQUOTE, TEMPLATESPAN[LH], ...CLOSURES],
    [SINGLEQUOTE]: [BACKTIC, QUOTE, TEMPLATESPAN[LH], ...CLOSURES],
    [BACKTIC]: [QUOTE, SINGLEQUOTE, ...CLOSURES],
  },
};
export const {TERMINALS, LITERALS} = CLASSIFIERS;
/// MARKERS
export const BOUNDARY = `\u{FEFF}`;
export const LINEBREAK = `\u{23CE}`;
export const OPEN = `${BOUNDARY}\u2772${BOUNDARY}`;
export const CLOSE = `${BOUNDARY}\u2773${BOUNDARY}`;
