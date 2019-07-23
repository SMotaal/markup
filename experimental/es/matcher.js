import {HexDigit, DecimalDigit, BinaryDigit, ControlLetter, IdentifierStart, IdentifierPart} from './ranges.js';
import {keywords, ECMAScriptGoal, CommentGoal, RegExpGoal, StringGoal, TemplateLiteralGoal} from './definitions.js';
import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

DUMMY: async () => {
  /* prettier-ignore */ // Make sure this block never lints
  {
    Identifiers: {
      $\u0032; \u0024\u0032; this.new.target;
    }

    Solidus: {
                        // ExpressionStart never divide
      ( ([              /([(regexp)])/g / [] ] ) );
      ( [] /( [         /([(regexp)])/g / [] ] ) );
      ( ([]) /( [       /([(regexp)])/g / [] ] ) );
      ( [] /* */ /( [   /([(regexp)])/g / [] ] ) );
      ( []/( [/*/*//*/*//([(regexp)])/g / [] ] ) );

                        // Literals always divide (never ASI)
      ( []              /([(div)])/g / [] );
      ( ([])            /([(div)])/g / [] );
      ( []/*/*//**//*/*//([(div)])/g / [] );

      a = b             // Identifiers always divide (never ASI)
                        /(div)/g.exec(c).map(d);

                        // Declaration (ASI) then ExpressionStart
      function ƒ () {}  /(regexp)/g.exec(c).map(d);


      async () => {}    // Curly+LineBreak is ASI
                        /(regexp)/g.exec(c).map(d);
      async () => {}
                        /(regexp)/g.exec(c).map(d);

      async () => ({})  //
                        /(div)/g.exec(c).map(d);

                        // Function calls always in Expression
      async ()          /(div)/g.exec(c).map(d);

                        // FIXME: ObjectLiteral is "a literal"
      const x = {}      /(div)/g.exec(c).map(d);

                        // FIXME: Function/ClassExpression is "an expression"
      const y = function ƒ () {}
                        /(div)/g.exec(c).map(d);

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

                        // FIXME: Non-Keywords
                        async
                        async   ('')
      });

      // Matt Austin's
      Function("arg=`", "/*body`){});({x: this/**/");
      (function(arg=`/*``*/){/*body`){});({x: this/**/})
    }

    Strings: {
      '@@'            // FIXME: Not a fault

      '\
      a\a'            // quote›‹punctuator, comment

      "\
      \\n\\b"/**/     // quote›‹comment, comment
    }

    Numerals: {
      0, -0, 1, -1, +1.1, 0.1, 0.1e3
      0b01, 0x0123456789abcdef
      // 1_1
      NaN, Infinity, -Infinity
    }
  }
};

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
                  : TokenMatcher.fault(text, state),
                match,
                // text,
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
            state.context.group !== undefined && state.context.group.closer === '\n'
              ? TokenMatcher.close(text, state) || (state.context.goal === CommentGoal ? 'break' : 'closer')
              : 'break',
            match,
            // text,
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
    IdentifierStartCharacter = RegExp(
      TokenMatcher.sequence/* regexp */ `[${IdentifierStart}]`,
      IdentifierPart.includes('\\p{') ? 'u' : '',
    ),
    IdentifierPartSequence = RegExp(
      TokenMatcher.sequence/* regexp */ `[${IdentifierPart}]+`,
      IdentifierPart.includes('\\p{') ? 'u' : '',
    ),
    fromUnicodeEscape = (fromCodePoint => text => fromCodePoint(parseInt(text.slice(2), 16)))(String.fromCodePoint),
  } = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \\u[${HexDigit}][${HexDigit}][${HexDigit}][${HexDigit}]
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
            // text,
          );
        })}
      )|(
        \\f|\\n|\\r|\\t|\\v|\\c[${ControlLetter}]
        |\\x[${HexDigit}][${HexDigit}]
        |\\u\{[${HexDigit}]*\}
        |\\[^]
        ${entity((text, entity, match, state) => {
          TokenMatcher.capture(state.context.goal.type || 'escape', match);
          match.capture[keywords[text]] = text;
        })}
      )`,
    ),
  Comment: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \/\/|\/\*
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? TokenMatcher.open(text, state) ||
                  // Safely fast forward to end of comment
                  (text === '//' ? TokenMatcher.forward('\n', match, state) : TokenMatcher.forward('*/', match, state),
                  (match.punctuator = CommentGoal.type),
                  'opener')
              : state.context.goal !== CommentGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? CommentGoal.type
              : TokenMatcher.close(text, state) || (match.punctuator = CommentGoal.type),
            match,
            // text,
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
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? TokenMatcher.open(text, state) ||
                  // Safely fast forward to end of string
                  (TokenMatcher.forward(text === '"' ? DoubleQuoteLookAhead : SingleQuoteLookAhead, match, state, -1),
                  // (match.flatten = true),
                  (match.punctuator = StringGoal.type),
                  'opener')
              : state.context.goal !== StringGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? StringGoal.type
              : TokenMatcher.close(text, state) ||
                ((match.punctuator = StringGoal.type),
                // (match.flatten = true),
                'closer'),
            match,
            // text,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ${'`'}
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? TokenMatcher.open(text, state) ||
                  // TODO: Explore fast forward in template string parts
                  ((match.punctuator = TemplateLiteralGoal.type), 'opener')
              : state.context.goal !== TemplateLiteralGoal
              ? state.context.goal.type || 'sequence'
              : state.context.group.closer !== text
              ? TemplateLiteralGoal.type
              : TokenMatcher.close(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'closer'),
            match,
            // text,
          );
        })}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.punctuators !== undefined && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.openers &&
                state.context.goal.openers[text] === true &&
                (state.context.goal !== RegExpGoal || state.context.group.opener !== '[')
              ? TokenMatcher.open(text, state) || 'opener'
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \}|\)|\]
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : state.context.goal.closers &&
                state.context.goal.closers[text] === true &&
                (state.context.goal !== RegExpGoal ||
                  (state.context.group.opener !== '[' || text === state.context.group.closer))
              ? TokenMatcher.close(text, state) || 'closer'
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Solidus: () =>
    // TODO: Refine the necessary criteria for RegExp vs Div
    // TEST: [eval('var g;class x {}/1/g'), eval('var g=class x {}/1/g')]
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \*\/|\/=|\/
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === CommentGoal
              ? (state.context.group.closer === text && TokenMatcher.close(text, state)) ||
                  (match.punctuator = state.context.goal.type)
              : state.context.goal === RegExpGoal && state.context.group.closer !== ']'
              ? TokenMatcher.close('/', state) || ((match.punctuator = state.context.goal.type), 'closer')
              : state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : text[0] === '*'
              ? TokenMatcher.fault(text, state)
              : state.lastAtom === undefined ||
                (state.lastAtom.type === 'operator'
                  ? state.lastAtom.text !== '++' && state.lastAtom.text !== '--'
                  : state.lastAtom.type === 'closer'
                  ? state.lastAtom.text === '}'
                  : state.lastAtom.type === 'opener' || state.lastAtom.type === 'keyword')
              ? TokenMatcher.open(text, state) || ((match.punctuator = 'pattern'), 'opener')
              : (match.punctuator = 'operator'),
            match,
            // text,
          );
        })}
      )`,
    ),
  Operator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal === ECMAScriptGoal
              ? (text === '*' && state.lastAtom && state.lastAtom.text === 'function' && 'keyword') || 'operator'
              : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
              ? (match.punctuator = 'punctuation')
              : state.context.goal.type || 'sequence',
            match,
            // text,
          );
        })}
      )`,
    ),
  Keyword: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `\b(
        ${TokenMatcher.join(...keywords).replace(/\./g, '\\.')}
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            (match.flatten = state.context.goal !== ECMAScriptGoal)
              ? state.context.goal.type || 'sequence'
              : state.lastAtom !== undefined && state.lastAtom.text === '.'
              ? 'identifier'
              : state.context.captureKeyword === undefined
              ? 'keyword'
              : state.context.captureKeyword(text, state) || TokenMatcher.fault(text, state),
            match,
            // text,
          );
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({RegExpFlags = /^[gimsuy]+$/} = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        [${IdentifierStart}][${IdentifierPart}]*
        ${entity((text, entity, match, state) => {
          match.format = 'identifier';
          TokenMatcher.capture(
            state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : state.lastToken !== undefined && state.lastToken.punctuator === 'pattern' && RegExpFlags.test(text)
              ? ((match.flatten = true), (match.punctuator = RegExpGoal.type), 'closer')
              : ((match.flatten = true), 'identifier'),
            match,
            // text,
          );
        })}
      )`,
      `${IdentifierStart}${IdentifierPart}`.includes('\\p{') ? 'u' : '',
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => TokenMatcher.sequence/* regexp */ `[${Digit}][${Digit}${TokenMatcher.escape(NumericSeparator)}]*`
      : Digit => TokenMatcher.sequence/* regexp */ `[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
    HexDigits = Digits(HexDigit),
    BinaryDigits = Digits(BinaryDigit),
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
