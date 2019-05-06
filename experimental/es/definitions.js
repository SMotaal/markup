// import * as entities from './entities.js';
import {ranges, GraveAccent} from './ranges.js';

const symbols = {};

const symbol = (description, key) => (symbols[key || description] = Symbol(description));

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
  [symbol('ECMAScriptGoal')]: {openers: ['{', '(', '[', GraveAccent]},
  [symbol('TemplateLiteralGoal')]: {
    openers: ['${'],
    closer: GraveAccent,
    type: 'quote',
    matcher: /\\.|(\x60|$\{)/g,
  },
  [symbol('FaultGoal')]: {openers: [], closer: '', type: 'fault'},
};

const groups = {
  '{': {opener: '{', closer: '}'},
  '${': {opener: '${', closer: '}', type: 'span'},
  '(': {opener: '(', closer: ')'},
  '[': {opener: '[', closer: ']'},
  [GraveAccent]: {
    opener: GraveAccent,
    closer: GraveAccent,
    goal: symbols.TemplateLiteralGoal,
  },
};

{
  const {freeze, getOwnPropertySymbols} = Object;

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

  for (const symbol of getOwnPropertySymbols(goals)) {
    goals[symbol].name = (goals[symbol].symbol = symbol).description.replace(/Goal$/, '');
    freeze(goals[symbol]);
  }

  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);
}

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @type {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} */
const keywords = {};

{
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

  //   Keyword: () =>
  //   Matcher.define(
  //     entity => Matcher.sequence`\b(

  //       ${entity((text, entity, match) => {
  //         match.capture[identities.Keyword] = text;
  //         capture('keyword', match);
  //       })}
  //     )\b`,
  //   ),
  // RestrictedWord: () =>
  //   Matcher.define(
  //     entity => Matcher.sequence`\b(
  //       interface|implements|package|private|protected|public
  //       ${entity((text, entity, match) => {
  //         match.capture[identities.RestrictedWord] = text;
  //         capture('keyword', match);
  //       })}
  //     )\b`,
  //   ),
  // FutureReservedWord: () =>
  //   Matcher.define(
  //     entity => Matcher.sequence`\b(
  //       enum
  //       ${entity((text, entity, match) => {
  //         match.capture[identities.FutureReservedWord] = text;
  //         capture('identifier', match);
  //       })}
  //     )\b`,
  //   ),
}

// {
//   const {
//     Null = '\0',
//     ZeroWidthNonJoiner = '\u200c',
//     ZeroWidthJoiner = '\u200d',
//     ZeroWidthNoBreakSpace = '\ufeff',
//     Whitespace,
//     ECMAScript,
//   } = ranges;

//   const {
//     Terminator = (partials.Enders = String.raw`%&|)*,./:;<=>?^|}\]`),
//     CommentStart = (partials.CommentStart = String.raw`//|/\*`),
//     ExpressionStart = (partials.ExpressionStart = String.raw`[^${Null}${Whitespace}${Terminator}]|${CommentStart}`),
//   } = partials;
// }

export {ranges, identities, goals, groups, symbols, keywords};

// UnicodeIDStart: Symbol(identities.UnicodeIDStart),
// UnicodeIDContinue: Symbol(identities.UnicodeIDContinue),
// HexDigits: Symbol(identities.HexDigits),
// CodePoint: Symbol(identities.CodePoint),
// ControlEscape: Symbol(identities.ControlEscape),
// RestrictedWord: Symbol(identities.RestrictedWord),
// FutureReservedWord: Symbol(identities.FutureReservedWord),
// Keyword: Symbol(identities.Keyword),
