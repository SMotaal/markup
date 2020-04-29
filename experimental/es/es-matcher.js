﻿import {ECMAScriptRanges} from './es-ranges.js';
import {
  // TODO: Always import expected goals even if not directly referenced
  ECMAScriptGoal,
  ECMAScriptCommentGoal,
  ECMAScriptRegExpGoal,
} from './es-definitions.js';
import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

/** @type {TokenMatcher} */
export const matcher = (ECMAScript =>
  TokenMatcher.define(
    // Matcher generator for this matcher instance
    entity =>
      TokenMatcher.join(
        entity(ECMAScript.Break()),
        entity(ECMAScript.Whitespace()),
        entity(ECMAScript.Escape()),
        entity(ECMAScript.Comment()),
        entity(ECMAScript.StringLiteral()),
        entity(ECMAScript.Opener()),
        entity(ECMAScript.Closer()),
        entity(ECMAScript.Solidus()),
        entity(ECMAScript.Operator()),
        entity(ECMAScript.Keyword()),
        entity(ECMAScript.Number()),
        entity(ECMAScript.Identifier()),

        // Defines how to address non-entity character(s):
        entity(
          ECMAScript.Fallthrough({
            type: 'fault',
            flatten: true,
          }),
        ),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {
      goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
    },
  ))({
  Fallthrough: ({fallthrough = '.', type, flatten} = {}) =>
    TokenMatcher.define(
      (typeof fallthrough === 'string' || (fallthrough = '.'), type && typeof type === 'string')
        ? entity => TokenMatcher.sequence/* regexp */ `(
            ${fallthrough}
            ${entity((text, entity, match, state) => {
              TokenMatcher.capture(
                type !== 'fault'
                  ? type || state.context.goal.type || 'sequence'
                  : state.context.goal !== ECMAScriptGoal
                  ? state.context.goal.type || 'sequence'
                  : 'fault',
                match,
              );
              typeof flatten === 'boolean' && (match.flatten = flatten);
            })}
          )`
        : entity => `${fallthrough}`,
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
  Escape: ({
    IdentifierStartCharacter = RegExp(TokenMatcher.sequence/* regexp */ `[${ECMAScriptRanges.IdentifierStart}]`, 'u'),
    IdentifierPartSequence = RegExp(TokenMatcher.sequence/* regexp */ `[${ECMAScriptRanges.IdentifierPart}]+`, 'u'),
    fromUnicodeEscape = (fromCodePoint => text => fromCodePoint(parseInt(text.slice(2), 16)))(String.fromCodePoint),
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \\u[${ECMAScriptRanges.HexDigit}][${ECMAScriptRanges.HexDigit}][${ECMAScriptRanges.HexDigit}][${
        ECMAScriptRanges.HexDigit
      }]
        ${entity((text, entity, match, state) => {
          match.format = 'escape';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal === ECMAScriptGoal &&
              state.lastToken != null &&
              (state.lastToken.type === 'identifier'
                ? IdentifierPartSequence.test(fromUnicodeEscape(text))
                : IdentifierStartCharacter.test(fromUnicodeEscape(text)))
                ? ((match.flatten = true), 'identifier')
                : 'escape'),
            match,
          );
        })}
      )|(
        \\f|\\n|\\r|\\t|\\v|\\c[${ECMAScriptRanges.ControlLetter}]
        |\\x[${ECMAScriptRanges.HexDigit}][${ECMAScriptRanges.HexDigit}]
        |\\u\{[${ECMAScriptRanges.HexDigit}]*\}
        |\\[^]
        ${entity((text, entity, match, state) => {
          TokenMatcher.capture(state.context.goal.type || 'escape', match);
          match.capture[ECMAScriptGoal.keywords[text]] = text;
        })}
      )`,
    ),
  Comment: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        //|/\*|\*/
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal.openers && state.context.goal.openers[text]
              ? TokenMatcher.open(text, state) ||
                  ((match[match.format] = state.nextContext.goal.type || 'comment'), (match.flatten = true), 'opener')
              : state.context.group && state.context.group.closer === text
              ? TokenMatcher.close(text, state) ||
                (state.context.goal === ECMAScriptCommentGoal && (match[match.format] = ECMAScriptCommentGoal.type),
                'closer')
              : (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                (((match.punctuator = state.context.goal.punctuation && state.context.goal.punctuation[text]) ||
                  (state.context.goal.punctuators && state.context.goal.punctuators[text] === true)) &&
                  'punctuator') ||
                  state.context.goal.type ||
                  'sequence'),
            match,
          );
        })}
      )`,
    ),
  StringLiteral: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        "|'|${'`'}
        ${entity(TokenMatcher.Quote)}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \$\{|\{|\(|\[
        ${entity(TokenMatcher.Opener)}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \}|\)|\]
        ${entity(TokenMatcher.Closer)}
      )`,
    ),
  Solidus: () =>
    // TODO: Refine the necessary criteria for RegExp vs Div
    // TEST: [eval('var g;class x {}/1/g'), eval('var g=class x {}/1/g')]
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \/=|\/
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptRegExpGoal
              ? (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                (match.punctuator = state.context.goal.type || 'sequence'),
                state.context.group.closer !== ']'
                  ? TokenMatcher.close(text, state) /* fault? */ || 'closer'
                  : match.punctuator)
              : state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : state.lastAtom === undefined ||
                state.lastAtom.type === 'delimiter' ||
                state.lastAtom.type === 'breaker' ||
                state.lastAtom.text === '=>' ||
                (state.lastAtom.type === 'operator'
                  ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                  : state.lastAtom.type === 'closer'
                  ? state.lastAtom.text === '}'
                  : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
              ? TokenMatcher.open(text, state) ||
                ((match.punctuator =
                  (state.nextContext.goal.punctuation && state.nextContext.goal.punctuation[text]) ||
                  state.nextContext.goal.type ||
                  'pattern'),
                'opener')
              : (match.punctuator = 'operator'),
            match,
          );
        })}
      )`,
    ),
  Operator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ,|;|\.\.\.|\.|:|\?${
          // We're including non-conflicting RegExp atoms here
          '[:=!]?'
        }
        |\+\+|--|=>
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? (text === '*' && state.lastAtom && state.lastAtom.text === 'function' && 'keyword') ||
                  ECMAScriptGoal.punctuation[text] ||
                  'operator'
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator =
                  (state.context.goal.punctuation && state.context.goal.punctuation[text]) || 'punctuation')
              : (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                state.context.goal.type || 'sequence'),
            match,
          );
        })}
      )`,
    ),
  Keyword: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `\b(
        ${TokenMatcher.join(...ECMAScriptGoal.keywords).replace(/\./g, '\\.')}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            (match.flatten = state.context.goal !== ECMAScriptGoal)
              ? state.context.goal.type || 'sequence'
              : state.lastAtom != null && state.lastAtom.text === '.'
              ? 'identifier'
              : state.context.captureKeyword === undefined
              ? 'keyword'
              : state.context.captureKeyword(text, state) || 'fault',
            match,
          );
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({
    RegExpFlags = new RegExp(
      /\w/g[Symbol.replace](
        /*regexp*/ `^(?:g|i|m|s|u|y)+$`,
        /*regexp*/ `$&(?=[^$&]*$)`, // interleaved
      ),
    ),
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        [${ECMAScriptRanges.IdentifierStart}][${ECMAScriptRanges.IdentifierPart}]*
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            state.context.goal !== ECMAScriptGoal
              ? (([text] = text.split(/\b/, 2)),
                (state.nextOffset = match.index + text.length),
                (match[0] = text),
                // identity
                state.context.goal.type || 'sequence')
              : state.lastToken != null && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
              ? ((match.flatten = true), (match.punctuator = ECMAScriptRegExpGoal.type), 'closer')
              : ((match.flatten = true), 'identifier'),
            match,
          );
        })}
      )`,
      `${ECMAScriptRanges.IdentifierStart}${ECMAScriptRanges.IdentifierPart}`.includes('\\p{') ? 'u' : '',
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => TokenMatcher.sequence/* regexp */ `[${Digit}][${Digit}${TokenMatcher.escape(NumericSeparator)}]*`
      : Digit => TokenMatcher.sequence/* regexp */ `[${Digit}]+`,
    DecimalDigits = Digits(ECMAScriptRanges.DecimalDigit),
    HexDigits = Digits(ECMAScriptRanges.HexDigit),
    BinaryDigits = Digits(ECMAScriptRanges.BinaryDigit),
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |0[xX]${HexDigits}
        |0[bB]${BinaryDigits}
        |${DecimalDigits}\.${DecimalDigits}
        |\.${DecimalDigits}
        |${DecimalDigits}
        ${entity((text, entity, match, state) => {
          match.format = 'number';
          TokenMatcher.capture(state.context.goal.type || 'number', match); // , text
        })}
      )\b`,
    ),
});
