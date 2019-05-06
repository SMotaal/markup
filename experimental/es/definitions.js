import * as entities from './entities.js';

const symbols = {};

const symbol = (description, key) => (symbols[key || description] = Symbol(description));

const identities = {
  UnicodeIDStart: 'ECMAScript.UnicodeIDStart',
  UnicodeIDContinue: 'ECMAScript.UnicodeIDContinue',
  HexDigits: 'ECMAScript.HexDigits',
  CodePoint: 'ECMAScript.CodePoint',
  ControlEscape: 'ECMAScript.ControlEscape',
  RestrictedWord: 'ECMAScript.RestrictedWord',
  FutureReservedWord: 'ECMAScript.FutureReservedWord',
  Keyword: 'ECMAScript.Keyword',
};

const goals = {
  [symbol('ECMAScriptGoal')]: {openers: ['{', '(', '[', entities.GraveAccent]},
  [symbol('TemplateLiteralGoal')]: {
    openers: ['${'],
    closer: entities.GraveAccent,
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
  [entities.GraveAccent]: {
    opener: entities.GraveAccent,
    closer: entities.GraveAccent,
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

export {entities, identities, goals, groups, symbols};

// UnicodeIDStart: Symbol(identities.UnicodeIDStart),
// UnicodeIDContinue: Symbol(identities.UnicodeIDContinue),
// HexDigits: Symbol(identities.HexDigits),
// CodePoint: Symbol(identities.CodePoint),
// ControlEscape: Symbol(identities.ControlEscape),
// RestrictedWord: Symbol(identities.RestrictedWord),
// FutureReservedWord: Symbol(identities.FutureReservedWord),
// Keyword: Symbol(identities.Keyword),
