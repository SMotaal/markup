import {ranges, GraveAccent} from './ranges.js';

const symbols = {};

const symbol = (description, key = description) =>
  (!key && Symbol('')) || symbols[key] || (symbols[key] = Symbol(description));

const identities = {
  UnicodeIDStart: 'ECMAScript.UnicodeIDStart',
  UnicodeIDContinue: 'ECMAScript.UnicodeIDContinue',
  HexDigits: 'ECMAScript.HexDigits',
  CodePoint: 'ECMAScript.CodePoint',
  ControlEscape: 'ECMAScript.ControlEscape',
  ContextualWord: 'ECMAScript.ContextualWord',
  RestrictedWord: 'ECMAScript.RestrictedWord',
  FutureReservedWord: 'ECMAScript.FutureReservedWord',
  Keyword: 'ECMAScript.Keyword',
};

const goals = {
  [symbol('ECMAScriptGoal')]: {openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'], closers: ['}', ')', ']']},
  [symbol('CommentGoal')]: {type: 'comment'},
  [symbol('RegExpGoal')]: {openers: ['['], closers: [']'], type: 'pattern'},
  [symbol('StringGoal')]: {type: 'quote'},
  [symbol('TemplateLiteralGoal')]: {
    openers: ['${'],
    type: 'quote',
    matcher: /\\.|(\x60|$\{)/g,
  },
  [symbol('FaultGoal')]: {type: 'fault', groups: {}},
};

const {[symbols.FaultGoal]: FaultGoal} = goals;

const groups = {
  '{': {opener: '{', closer: '}'},
  '(': {opener: '(', closer: ')'},
  '[': {opener: '[', closer: ']'},
  '//': {opener: '//', closer: '\n', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  '/*': {opener: '/*', closer: '*/', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  '/': {opener: '/', closer: '/', goal: symbols.RegExpGoal, parentGoal: symbols.ECMAScriptGoal},
  "'": {opener: "'", closer: "'", goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  '"': {opener: '"', closer: '"', goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  ['`']: {
    opener: '`',
    closer: '`',
    goal: symbols.TemplateLiteralGoal,
    parentGoal: symbols.ECMAScriptGoal,
  },
  '${': {
    opener: '${',
    closer: '}',
    goal: symbols.ECMAScriptGoal,
    parentGoal: symbols.TemplateLiteralGoal,
  },
};

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @type {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} */
const keywords = {};

{
  const {freeze, getOwnPropertySymbols, getOwnPropertyNames} = Object;

  for (const opener of getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    freeze(groups[group]);
  }

  for (const symbol of getOwnPropertySymbols(goals)) {
    const {[symbol]: goal} = goals;
    goal.name = (goal.symbol = symbol).description.replace(/Goal$/, '');
    goal.groups = [];
    if ('openers' in goal) {
      for (const opener of goal.openers) goal.groups[opener] = groups[opener];
      freeze(goal.openers);
    }
    freeze(goal.groups);
    goal.closers && freeze(goal.closers);
    freeze(goal);
  }

  for (const identity of [
    'UnicodeIDStart',
    'UnicodeIDContinue',
    'HexDigits',
    'CodePoint',
    'ControlEscape',
    'RestrictedWord',
    'FutureReservedWord',
    'Keyword',
  ]) {
    symbol((identities[identity] = `ECMAScript.${identity}`), identity);
  }

  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);

  for (const keyword of [
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'export',
    'extends',
    'finally',
    'for',
    'function',
    'if',
    'import',
    'in',
    'instanceof',
    'let',
    'new',
    'return',
    'super',
    'switch',
    'this',
    'throw',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ])
    keywords[keyword] = identities.Keyword;
  for (const keyword of ['interface', 'implements', 'package', 'private', 'protected', 'public'])
    keywords[keyword] = identities.RestrictedWord;
  for (const keyword of ['enum']) keywords[keyword] = identities.FutureReservedWord;
  for (const keyword of ['arguments', 'async', 'as', 'from', 'of', 'static'])
    keywords[keyword] = identities.ContextualWord;

  freeze(keywords);
}

export {identities, goals, groups, symbols, keywords, FaultGoal};
