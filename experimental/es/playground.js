﻿import bootstrap from '../matcher/matcher.js';
import {createTokenFromMatch} from '../matcher/helpers.js';
import {Matcher} from '/modules/matcher/matcher.js';
import * as entities from './entities.js';

const symbols = {
  UnicodeIDStart: Symbol('UnicodeIDStart'),
  UnicodeIDContinue: Symbol('UnicodeIDContinue'),
  HexDigits: Symbol('HexDigits'),
  CodePoint: Symbol('CodePoint'),
  ControlEscape: Symbol('ControlEscape'),
  ReservedWord: Symbol('ReservedWord'),
  Keyword: Symbol('Keyword'),
  ECMAScriptGoal: Symbol('ECMAScriptGoal'),
  TemplateLiteralGoal: Symbol('TemplateLiteralGoal'),
  FaultGoal: Symbol('FaultGoal'),
};

const groups = {
  '{': {opener: '{', closer: '}'},
  '${': {opener: '${', closer: '}', type: 'span'},
  '(': {opener: '(', closer: ')'},
  '[': {opener: '[', closer: ']'},
  '`': {opener: '`', closer: '`', goal: symbols.TemplateLiteralGoal},
};

const goals = {
  [symbols.ECMAScriptGoal]: {openers: ['{', '(', '[', '`']},
  [symbols.TemplateLiteralGoal]: {openers: ['${'], closer: '`', type: 'quote', matcher: /\\.|(\x60|$\{)/g},
  [symbols.FaultGoal]: {openers: [], closer: '', type: 'fault'},
};

const {[symbols.ECMAScriptGoal]: ECMAScriptGoal, [symbols.FaultGoal]: FaultGoal} = goals;

const open = (text, state) => {
  if (!(state.goal || ECMAScriptGoal).openers.includes(text)) return;
  const group = groups[text];
  if (!group || !group.opener || !group.closer) return;
  state.groups || (state.groups = []);
  state.groups.closers || (state.groups.closers = []);
  state.groups.closers.splice(state.groups.push(group) - 1, state.groups.closers.length, group.closer);
  state.goal = (group.goal && goals[group.goal]) || undefined;
  return 'opener';
};

const close = (text, state) => {
  if (state.goal && state.goal.closer !== text) return state.goal.type;
  const index = state.groups && state.groups.closers ? state.groups.closers.lastIndexOf(text) : -1;
  if (index === -1 || index !== state.groups.length - 1) return (state.goal = FaultGoal).type;
  state.groups.splice(index, state.groups.length);
  state.groups.closers.splice(index, state.groups.closers.length);
  const group = index && state.groups[state.groups.length - 1];
  state.goal = (group && group.goal && goals[group.goal]) || undefined;
  return 'closer';
};

const toggle = (text, state) =>
  state.groups && state.groups.length && state.groups.closers[state.groups.length - 1] === text
    ? close(text, state)
    : open(text, state);

const matcher = Matcher.define(
  entity => Matcher.sequence`
    (?=\s+)(?:
      ^(?:
        (${entity('whitespace')}\s+)?$(${entity('break')}\n)?|
        (${entity('inset')}(${entity('whitespace')}\s+))
      )|
      (${entity((text, entity, match) => {
        // TODO: Consider dropping /m flag
        match.idenity = 'break';
        const state = match.matcher.state;
        state.goal !== FaultGoal || (state.goal = undefined);
      })}\n)|
      (${entity('whitespace')}\s+)
    )|
    \\(${entity('sequence')}
      x(${entity(symbols.HexDigits)}[${entities.HexDigit}]{2})|
      u(${entity(symbols.HexDigits)}[${entities.HexDigit}]{4})|
      u\{(${entity(symbols.CodePoint)}[${entities.HexDigit}]{1,4})\}|
      (${entity(symbols.ControlEscape)}f|n|r|t|v)|
      c(${entity(symbols.ControlLetter)}[${entities.ControlLetter}])|
      (${entity(symbols.CharacterEscape)}.)
    )|
    (?:
      (${entity('comment')}\/\/.*|\/\*[^]*?\*\/)|
      (${entity('quote')}
        "(?:[^\\"\n]+|\\.)*(?:"|$)|
        '(?:[^\\'\n]+|\\.)*(?:'|$)|
        (${entity((text, entity, match) => {
          (match.identity = toggle(text, match.matcher.state))
            ? (match.punctuator = text)
            : (match.identity = 'sequence');
        })}${'`'})
      )|
      (
        \$\{|\{|\(|\[
        ${entity((text, entity, match) => {
          (match.identity = open(text, match.matcher.state))
            ? (match.punctuator = text)
            : (match.identity = 'sequence');
        })}
      )|
      (
        \}|\)|\]
        ${entity((text, entity, match) => {
          (match.identity = close(text, match.matcher.state))
            ? (match.punctuator = text)
            : (match.identity = 'sequence');
        })}
      )|
      (${entity('operator')}
        ,|;|\.\.\.|\.|:|\?|=>|
        \+\+|--|
        \+=|-=|\*\*=|\*=|\/=|
        &&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~|
        <<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>|
        !==|!=|!|===|==|=|
        \+|-|\*\*|\*|(${entity((text, entity, match) => {
          // TODO: Solidus and such
          //   - regexp likely matches /[^+*?/\n][^\n]*)\/
          match.idenity = 'operator';
          match.punctuator = text;
          const state = match.matcher.state;
          state.goal !== FaultGoal || (state.goal = undefined);
          // console.log({text, entity, ...match.matcher.state}, match.input.slice(matcher.index, matcher.index + 10));
        })}\/)
      )
    )(${
      // TODO: Come up with a less hacky way to do this
      entity((text, entity, match) => {
        match.punctuator || match.identity !== 'operator' || (match.punctuator = match[0]);
        // console.log(text, entity, match);
      })
    })|
    \b(${entity('keyword')}
      (${entity(symbols.ReservedWord)}
      abstract enum interface package namespace declare type module public protected)|
      (${entity(symbols.Keyword)}
      arguments|as|async|await|break|case|catch|class|
      export|const|continue|private|debugger|default|
      delete|do|else|export|extends|finally|for|from|
      function|get|if|import|in|instanceof|let|new|of|
      return|set|static|super|switch|this|throw|try|
      typeof|var|void|while|with|yield)
    )\b|
    (${entity('identifier')}
      (${entity(symbols.UnicodeIDStart)}[_$${entities.ID_Start}])
      (${entity(symbols.UnicodeIDContinue)}[_$\u200c\u200d${entities.ID_Continue}\u034f]+)?
    )|
    (${entity('sequence')}.)
  `,
  'mgu',
);

export default bootstrap(matcher, {
  syntax: 'es',
  createToken: (match, state) => {
    const token = createTokenFromMatch(match);
    const {type} = token;
    const goal = state.goal;
    (goal &&
      goal.type &&
      (type === 'closer' || type === 'opener' || (token.hint = `in-${(token.type = goal.type)}`))) ||
      (match.punctuator && (token.punctuator = token.type));
    return token;
  },
  sourceURL: './playground.js',
});
