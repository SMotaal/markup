import {TokenMatcher} from '../../lib/token-matcher.js';
import {JSONRanges} from './json-ranges.js';
import {JSONGoal, JSONStringGoal} from './json-definitions.js';

export const matcher = (JSONGrammar =>
  TokenMatcher.define(
    // Matcher generator for this matcher instance
    entity =>
      TokenMatcher.join(
        entity(JSONGrammar.Break()),
        entity(JSONGrammar.Whitespace()),
        entity(JSONGrammar.String()),
        entity(JSONGrammar.Opener()),
        entity(JSONGrammar.Closer()),
        entity(JSONGrammar.Operator()),
        entity(JSONGrammar.Keyword()),
        entity(JSONGrammar.Number()),
        entity(JSONGrammar.Fallthrough()),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {goal: {value: JSONGoal, enumerable: true, writable: false}},
  ))({
  Fallthrough: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        .
        ${entity((text, entity, match, state) => {
          TokenMatcher.capture(state.context.goal.type || 'fault', match, text);
        })}
      )`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ${TokenMatcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity(TokenMatcher.Break)}
      )`,
    ),
  Whitespace: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \s+
        ${entity(TokenMatcher.Whitespace)}
      )`,
    ),
  String: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \\u.{0,4}|\\.|"
        ${entity(TokenMatcher.Quote)}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \{|\[
        ${entity(TokenMatcher.Opener)}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \}|\]
        ${entity(TokenMatcher.Closer)}
      )`,
    ),
  Operator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        :|,
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal === JSONGoal
                ? 'operator'
                : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
                ? (match.punctuator = 'punctuation')
                : 'fault'),
            match,
            text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `\b(
        ${TokenMatcher.join(...JSONGoal.keywords)}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal.keywords && !!state.context.goal.keywords[text] && 'keyword') ||
              'sequence',
            match,
            text,
          );
        })}
      )\b`,
    ),
  Number: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \b[${JSONRanges.DecimalDigit}]+\.[${JSONRanges.DecimalDigit}]+[eE][-+]?[${JSONRanges.DecimalDigit}]+
        |(?:-|\b)[${JSONRanges.DecimalDigit}]+\.[${JSONRanges.DecimalDigit}]+
        |(?:-|\b)(?:0|0*[${JSONRanges.DecimalDigit}]+)
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          TokenMatcher.capture(state.context.goal.type || 'number', match, text);
        })}
      )\b`,
    ),
});
