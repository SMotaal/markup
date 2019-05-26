import {Matcher} from '../../../modules/matcher/matcher.js';
import {DecimalDigit} from '../es/ranges.js';
import {ECMAScriptGoal, StringGoal} from '../es/definitions.js';
import {capture, forward, fault, open, close} from '../es/helpers.js';

export const matcher = (JSON =>
  Matcher.define(
    // Matcher generator for this matcher instance
    entity =>
      Matcher.join(
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
    Matcher.define(
      entity => Matcher.sequence`(
        .
        ${entity((text, entity, match, state) => {
          capture(state.context.goal.type || 'sequence', match, text);
        })}
      )`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          const group = state.context.group;
          match.format = 'whitespace';
          capture(group && group.closer === '\n' ? close(text, state) || 'closer' : 'break', match, text);
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \s+
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          capture((match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset', match, text);
        })}
      )`,
    ),
  StringLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \\"|"|\\'|'
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            text[0] === '\\'
              ? (context.goal !== StringGoal && fault(text, state)) || (context.goal.type || 'sequence')
              : context.goal === StringGoal
              ? close(text, state) || ((match.punctuator = StringGoal.type), 'closer')
              : open(text, state) || ((match.punctuator = StringGoal.type), 'opener'),
            match,
            text,
          );
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \{|\[
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : context.goal.openers && context.goal.openers[text] === true
              ? open(text, state) || 'opener'
              : context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Closer: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \}|\]
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : context.goal.closers && context.goal.closers[text] === true
              ? close(text, state) || 'closer'
              : context.goal.type || 'sequence',
            match,
            text,
          );
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ,|;
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
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
    Matcher.define(
      entity => Matcher.sequence`\b(
        true|false|null
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'identifier';
          capture(
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
      ? Digit => Matcher.sequence`[${Digit}][${Digit}${Matcher.escape(NumericSeparator)}]*`
      : Digit => Matcher.sequence`[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |${DecimalDigits}\.${DecimalDigits}
        |\.${DecimalDigits}
        |${DecimalDigits}
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          capture(state.context.goal.type || 'number', match, text);
        })}
      )\b`,
    ),
});
