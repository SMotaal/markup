import {ECMAScriptRanges} from './es-ranges.js';
import {
  // TODO: Always import expected goals even if not directly referenced
  ECMAScriptGoal,
  ECMAScriptCommentGoal,
  ECMAScriptRegExpGoal,
  ECMAScriptRegExpClassGoal,
  ECMAScriptStringGoal,
  ECMAScriptTemplateLiteralGoal,
} from './es-definitions.js';
import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

DUMMY: async () => {
  /* prettier-ignore */ // Make sure this block never lints
  {
    Identifiers: {
      $\u0032; \u0024\u0032; this.new.target;
    }

    Solidus: {
                        // [x] ExpressionStart never divide
      ( ([              /([(regexp)])/g / [] ] ) );
      ( [] /( [         /([(regexp)])/g / [] ] ) );
      ( ([]) /( [       /([(regexp)])/g / [] ] ) );
      ( [] /* */ /( [   /([(regexp)])/g / [] ] ) );
      ( []/( [/*/*//*/*//([(regexp)])/g / [] ] ) );

                        // [x] Literals always divide (never ASI)
      ( []              /([(divisor)])/g / [] );
      ( ([])            /([(divisor)])/g / [] );
      ( []/*/*//**//*/*//([(divisor)])/g / [] );

      a = b             // [x] Identifiers always divide (never ASI)
                        /(divisor)/g.exec(c).map(d);

                        // [x] Declaration (ASI) then ExpressionStart
      function ƒ () {}  /(regexp)/g.exec(c).map(d);


      async () => {}    // [x] Curly+LineBreak is ASI
                        /(regexp)/g.exec(c).map(d);
      async () => {}    /* [x] and with Multiline Comment */
                        /(regexp)/g.exec(c).map(d);

      async () => ({})  // [x] Parenthsized Expression (no ASI)
                        /(divisor)/g.exec(c).map(d);

      async ()          // [x] Function calls always in Expression
                        /(divisor)/g.exec(c).map(d);
      async ()          /(divisor)/g.exec(c).map(d);

      async () =>       // [x] Arrow Function Body is Expression
                        /(regexp)/g.exec(c).map(d);

                        // [ ] ObjectLiteral is "a literal"
      const x = {}      /(divisor)/g.exec(c).map(d);

                        // [ ] Function/ClassExpression is "an expression"
      const y = function ƒ () {}
                        /(divisor)/g.exec(c).map(d);

                        // Keyword always regexp (regardless of ASI)
      return await/*/\*//(regexp)/g.exec(c).map(d);

      (async function* () {

                        // Recursively operative Keywords
                        yield   yield
                        void    void
                        typeof  typeof
                        delete  delete
                        await   await
                        ('')

                        await   new     class {}
                        return  new     class {}
                        yield   async   function () {}
                        return
                        return
                        return  async   function () {}

                        // [ ] Non-Keywords
                        async
                        async   ('')
      });

      // Matt Austin's
      Function("arg=`", "/*body`){});({x: this/**/");
      (function(arg=`/*``*/){/*body`){});({x: this/**/})
    }

    Strings: {
      '@@'            // [x] Not a ‹fault›

      '\
      a\a'            // [x] ‹quote›•‹comment›

      "\
      \\n\\b"/**/     // [x] ‹quote›•‹comment›•‹comment›
    }

    Numerals: {
      0, -0, 1, -1, +1.1, 0.1, 0.1e3
      0b01, 0x0123456789abcdef
      NaN, Infinity, -Infinity
      // 1_1 // [ ] Proposal Numeric Separators
    }
  }
};

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
        entity(ECMAScript.TemplateLiteral()),
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
        ${entity((text, entity, match, state) => {
          match.format = 'whitespace';
          TokenMatcher.capture(
            (state.context.group !== undefined &&
              state.context.group.closer === '\n' &&
              TokenMatcher.close(text, state)) ||
              // NOTE: ‹break› takes precedence over ‹closer›
              'break',
            match,
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
          TokenMatcher.capture((match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset', match); // , text
        })}
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
                  (state.context.goal === ECMAScriptGoal &&
                    // Safely fast forward to end of expression
                    (TokenMatcher.forward(state.context.goal.groups[text].closer, match, state) ||
                      (match[match.format] = ECMAScriptCommentGoal.type)),
                  'opener')
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
  StringLiteral: ({
    SingleQuoteLookAhead = /(?:[^'\\\n]+?(?=\\.|')|\\.)*?(?:'|$)/g,
    DoubleQuoteLookAhead = /(?:[^"\\\n]+?(?=\\.|")|\\.)*?(?:"|$)/g,
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        "|'
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? TokenMatcher.open(text, state) ||
                  // Safely fast forward to end of string
                  (TokenMatcher.forward(text === '"' ? DoubleQuoteLookAhead : SingleQuoteLookAhead, match, state, -1),
                  // (match.flatten = true),
                  (match.punctuator = ECMAScriptStringGoal.type),
                  'opener')
              : state.context.goal !== ECMAScriptStringGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? ECMAScriptStringGoal.type
              : TokenMatcher.close(text, state) || ((match.punctuator = ECMAScriptStringGoal.type), 'closer'),
            match,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ${'`'}
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? TokenMatcher.open(text, state) ||
                  // TODO: Explore fast forward in template string parts
                  ((match.punctuator = ECMAScriptTemplateLiteralGoal.type), 'opener')
              : state.context.goal !== ECMAScriptTemplateLiteralGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? ECMAScriptTemplateLiteralGoal.type
              : TokenMatcher.close(text, state) || ((match.punctuator = ECMAScriptTemplateLiteralGoal.type), 'closer'),
            match,
          );
        })}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal.punctuators !== undefined && state.context.goal.punctuators[text] === true
              ? (match.punctuator =
                  (state.context.goal.punctuation && state.context.goal.punctuation[text]) || 'combinator')
              : state.context.goal.openers && state.context.goal.openers[text] === true
              ? TokenMatcher.open(text, state) ||
                ((match.punctuator =
                  (state.context.goal.punctuation && state.context.goal.punctuation[text]) || state.context.goal.type),
                'opener')
              : (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
                state.context.goal.type || 'sequence'),
            match,
          );
        })}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \}|\)|\]
        ${entity((text, entity, match, state) => {
          match.format = 'punctuator';
          TokenMatcher.capture(
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : // : state.context.goal.closers &&
              //   state.context.goal.closers[text] === true &&
              //   (state.context.goal !== ECMAScriptRegExpGoal ||
              //     (state.context.group.opener !== '[' || text === state.context.group.closer))
              state.context.goal.closers && state.context.goal.closers[text] === true
              ? TokenMatcher.close(text, state) ||
                ((match.punctuator =
                  (state.context.goal.punctuation && state.context.goal.punctuation[text]) || state.context.goal.type),
                'closer')
              : state.context.goal.type || 'sequence',
            match,
          );
        })}
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
                (state.lastAtom.type === 'operator' || state.lastAtom.type === 'delimiter'
                  ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                  : state.lastAtom.type === 'closer'
                  ? state.lastAtom.text === '}'
                  : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
              ? TokenMatcher.open(text, state) || ((match.punctuator = 'pattern'), 'opener')
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
                  (ECMAScriptGoal.punctuation[text] || 'operator')
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
              : state.lastAtom !== undefined && state.lastAtom.text === '.'
              ? 'identifier'
              : state.context.captureKeyword === undefined
              ? 'keyword'
              : state.context.captureKeyword(text, state) || 'fault',
            match,
          );
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({RegExpFlags = /^[gimsuy]+$/} = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        [${ECMAScriptRanges.IdentifierStart}][${ECMAScriptRanges.IdentifierPart}]*
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : state.lastToken !== undefined && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
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
