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
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          TokenMatcher.capture(
            state.context.goal === JSONGoal ? 'break' : 'fault',
            match,
            text,
          );
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \s+
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          TokenMatcher.capture(
            state.context.goal.type || (match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset',
            match,
          );
        })}
      )`,
    ),
  String: ({
    // Safely fast forward until the end of string or capture offending token
    //   at lookahead position for next capture.
    //
    //   SEE: https://tc39.es/ecma262/#table-json-single-character-escapes
    //
    DoubleQuoteLookAhead = new RegExp(
      TokenMatcher.sequence/* regexp */ `
        (?:
          [^${JSONRanges.ControlCharacter}"\\]+?
          |\\["/\\bntr]
          |\\u[${JSONRanges.HexDigit}]{4}
        )*(?:"|$|(?=(
          \\u[${JSONRanges.HexDigit}]{0,3}[^${JSONRanges.HexDigit}]
          |\\[^"/\\bntru]
          |\\$
          |[${JSONRanges.ControlCharacter}"]
        )))`,
      'g',
    ),
    flattenQuotes = true,
  } = {}) =>
    // console.log({JSONRanges.ControlCharacter, JSONRanges.HexDigit, DoubleQuoteLookAhead}) ||
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \\u.{0,4}|\\.|"
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            text === '"'
              ? state.context.goal.openers[text]
                ? TokenMatcher.open(text, state) ||
                  (state.nextContext &&
                    state.nextContext.goal === JSONStringGoal &&
                    ((match.flatten = flattenQuotes), TokenMatcher.forward(DoubleQuoteLookAhead, match, state, -1)),
                  (match.punctuator = 'quote'),
                  'opener')
                : TokenMatcher.close(text, state) ||
                  (state.context.goal === JSONStringGoal && (match.flatten = flattenQuotes),
                  (match.punctuator = 'quote'),
                  'closer')
              : state.context.goal === JSONStringGoal
              ? state.nextFault === true
                ? 'fault'
                : (TokenMatcher.forward(DoubleQuoteLookAhead, match, state, -1), JSONStringGoal.type || 'quote')
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : state.context.goal.type || 'fault',
            match,
            text,
          );
        })}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \{|\[
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal.punctuators && state.context.goal.punctuators[text] === true
                ? (match.punctuator = 'combinator')
                : state.context.goal.openers && state.context.goal.openers[text] === true
                ? TokenMatcher.open(text, state) || 'opener'
                : 'fault'),
            match,
            text,
          );
        })}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \}|\]
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal.punctuators && state.context.goal.punctuators[text] === true
                ? (match.punctuator = 'combinator')
                : state.context.goal.closers && state.context.goal.closers[text] === true
                ? TokenMatcher.close(text, state) || 'closer'
                : 'fault'),
            match,
            text,
          );
        })}
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
