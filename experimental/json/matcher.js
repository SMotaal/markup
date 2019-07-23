import {DecimalDigit} from '../es/ranges.js';
import {ECMAScriptGoal, StringGoal} from '../es/definitions.js';
import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

/// SEE: https://cswr.github.io/JsonSchema/spec/grammar/

export const matcher = (JSON =>
  TokenMatcher.define(
    // Matcher generator for this matcher instance
    entity =>
      TokenMatcher.join(
        entity(JSON.Break()),
        entity(JSON.Whitespace()),
        entity(JSON.StringLiteral()),
        entity(JSON.Opener()),
        entity(JSON.Closer()),
        entity(JSON.Operator()),
        entity(JSON.Keyword()),
        entity(JSON.Number()),
        entity(JSON.Fallthrough()),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {
      goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
    },
  ))({
  Fallthrough: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        .
        ${entity((text, entity, match, state) => {
          TokenMatcher.capture(state.context.goal.type || 'sequence', match, text);
        })}
      )`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        ${TokenMatcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          const group = state.context.group;
          match.format = 'whitespace';
          TokenMatcher.capture(
            group && group.closer === '\n' ? TokenMatcher.close(text, state) || 'closer' : 'break',
            match,
            text,
          );
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
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
  StringLiteral: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        \\"|"|\\'|'
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          TokenMatcher.capture(
            text[0] === '\\'
              ? (context.goal !== StringGoal && TokenMatcher.fault(text, state)) || (context.goal.type || 'sequence')
              : context.goal === StringGoal
              ? TokenMatcher.close(text, state) || ((match.punctuator = StringGoal.type), 'closer')
              : TokenMatcher.open(text, state) || ((match.punctuator = StringGoal.type), 'opener'),
            match,
            text,
          );
        })}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        \{|\[
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          TokenMatcher.capture(
            context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : context.goal.openers && context.goal.openers[text] === true
              ? TokenMatcher.open(text, state) || 'opener'
              : context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        \}|\]
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          TokenMatcher.capture(
            context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : context.goal.closers && context.goal.closers[text] === true
              ? TokenMatcher.close(text, state) || 'closer'
              : context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Operator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`(
        ,|;
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          TokenMatcher.capture(
            context.goal === ECMAScriptGoal
              ? 'operator'
              : context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    // TODO: Handle contextual cases:
    //  - { get() set() } as Identifiers
    TokenMatcher.define(
      entity => TokenMatcher.sequence`\b(
        true|false|null
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'identifier';
          TokenMatcher.capture(
            (match.flatten = context.goal !== ECMAScriptGoal) ? context.goal.type || 'sequence' : 'keyword',
            match,
            text,
          );
        })}
      )\b`,
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => TokenMatcher.sequence`[${Digit}][${Digit}${TokenMatcher.escape(NumericSeparator)}]*`
      : Digit => TokenMatcher.sequence`[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence`\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |${DecimalDigits}\.${DecimalDigits}
        |\.${DecimalDigits}
        |${DecimalDigits}
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          TokenMatcher.capture(state.context.goal.type || 'number', match, text);
        })}
      )\b`,
    ),
});
