import {DecimalDigit} from './json-ranges.js';
import {JSONGoal, JSONStringGoal, keywords} from './json-definitions.js';
import {TokenMatcher} from '../../lib/token-matcher.js';

/// SEE: https://cswr.github.io/JsonSchema/spec/grammar/

export const matcher = (JSONGrammar =>
  TokenMatcher.define(
    // Matcher generator for this matcher instance
    entity =>
      TokenMatcher.join(
        entity(JSONGrammar.Break()),
        entity(JSONGrammar.Whitespace()),
        entity(JSONGrammar.StringLiteral()),
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
          TokenMatcher.capture(state.context.goal.type || TokenMatcher.fault(text, state), match, text);
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
            state.context.goal === JSONGoal ? 'break' : TokenMatcher.fault(text, state),
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
            (match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset',
            match,
            text,
          );
        })}
      )`,
    ),
  StringLiteral: ({
    // Used to safely fast forward until the end of a string
    DoubleQuoteLookAhead = /(?:[^"\\\n]+?(?=\\.|")|\\.)*?(?:"|$)/g,
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \\"|"
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            text[0] === '\\'
              ? (state.context.goal !== JSONStringGoal && TokenMatcher.fault(text, state)) ||
                  (state.context.goal.type || 'sequence')
              : state.context.goal === JSONStringGoal
              ? TokenMatcher.close(text, state) ||
                ((match.punctuator = JSONStringGoal.type), (match.flatten = true), 'closer')
              : TokenMatcher.open(text, state) ||
                // Safely fast forward to end of string
                (TokenMatcher.forward(DoubleQuoteLookAhead, match, state, -1),
                (match.flatten = true),
                (match.punctuator = JSONStringGoal.type),
                'opener'),
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
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.openers && state.context.goal.openers[text] === true
              ? TokenMatcher.open(text, state) || 'opener'
              : state.context.goal.type || 'sequence',
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
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.closers && state.context.goal.closers[text] === true
              ? TokenMatcher.close(text, state) || 'closer'
              : state.context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Operator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        :|,|;
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === JSONGoal
              ? 'operator'
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : state.context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `\b(
        ${TokenMatcher.join(...keywords)}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            (match.flatten = state.context.goal !== JSONGoal) ? state.context.goal.type || 'sequence' : 'keyword',
            match,
            text,
          );
        })}
      )\b`,
    ),
  Number: ({
    //
    DecimalDigits = TokenMatcher.sequence/* regexp */ `[${DecimalDigit}]+`,
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \b${DecimalDigits}\.${DecimalDigits}[eE][-+]?${DecimalDigits}
        |(?:-|\b)${DecimalDigits}\.${DecimalDigits}
        |(?:-|\b)(?:0|0*${DecimalDigits})
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          TokenMatcher.capture(
            (match.flatten = state.context.goal !== JSONGoal) ? state.context.goal.type || 'sequence' : 'number',
            match,
            text,
          );
        })}
      )\b`,
    ),
});
