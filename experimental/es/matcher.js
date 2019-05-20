import {Matcher} from '../../../modules/matcher/matcher.js';
import {HexDigit, DecimalDigit, BinaryDigit, ControlLetter, UnicodeIDStart, UnicodeIDContinue} from './ranges.js';
import {keywords, ECMAScriptGoal, CommentGoal, RegExpGoal, StringGoal, TemplateLiteralGoal} from './definitions.js';
import {capture, forward, fault, open, close} from './helpers.js';

DUMMY: async () => {
  /*
  prettier-ignore
  */ //                 // Make sure this block never lints
  {
    let i\u0032;
    this.new.target;

    Solidus: {
      a = b             // Identifiers always divide (never ASI)
                        /(div)/g.exec(c).map(d);

                        // ExpressionStart never divide
      ( ([              /([(regexp)])/g ] )/ [] );
      ( [] /( [         /([(regexp)])/g ] )/ [] );
      ( ([]) /( [       /([(regexp)])/g ] )/ [] );
      ( [] /* */ /( [   /([(regexp)])/g ] )/ [] );

                        // Literals always divide (never ASI)
      ( []              /([(div)])/g / [] );
      ( ([])            /([(div)])/g / [] );
      ( [] /* */        /([(div)])/g / [] );
                        // FIXME: ObjectLiteral is "a literal"
      const x = {}      /(div)/g.exec(c).map(d);

                        // Declaration (ASI) then ExpressionStart
      function ƒ () {}  /(regexp)/g.exec(c).map(d);

                        // FIXME: Function/ClassExpression is "an expression"
      const y = function ƒ () {}
                        /(div)/g.exec(c).map(d);

                        // Keyword always regexp (regardless of ASI)
      return await/*/\*//(regexp)/g.exec(c).map(d);

      // Matt Austin's
      Function("arg=`", "/*body`){});({x: this/**/");
      (function(arg=`/*``*/){/*body`){});({x: this/**/})
    }

    Strings: {
      '\
      a\a'           // quote›‹punctuator, comment

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
  Matcher.define(
    entity =>
      Matcher.join(
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
        /* Fallthrough */ '.',
      ),
    'gu',
    {
      goal: {value: ECMAScriptGoal, enumerable: true, writable: false},
    },
  ))({
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
  Escape: ({
    ECMAScriptUnicodeIDContinue = RegExp(
      Matcher.sequence`[${UnicodeIDContinue}]+`,
      UnicodeIDContinue.includes('\\p{') ? 'u' : '',
    ),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        \\u[${HexDigit}][${HexDigit}][${HexDigit}][${HexDigit}]
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'escape';
          capture(
            context.goal.type ||
              (context.goal === ECMAScriptGoal &&
              state.previousToken != null &&
              state.previousToken.type === 'identifier' &&
              ECMAScriptUnicodeIDContinue.test(String.fromCodePoint(parseInt(text.slice(2), 16)))
                ? ((match.flatten = true), 'identifier')
                : 'escape'),
            match,
            text,
          );
        })}
      )|(
        \\f|\\n|\\r|\\t|\\v|\\c[${ControlLetter}]
        |\\x[${HexDigit}][${HexDigit}]
        |\\u\{[${HexDigit}]*\}
        |\\.
        ${entity((text, entity, match, state) => {
          capture(state.context.goal.type || 'escape', match, (match.capture[keywords[text]] = text));
        })}
      )`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/|\/\*
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // Safely fast skip to end of comment
                  (forward(text === '//' ? '\n' : '*/', match, state),
                  // No need to track delimiter
                  CommentGoal.type)
              : context.goal !== CommentGoal
              ? context.goal.type || 'sequence'
              : context.group.closer !== text
              ? CommentGoal.type
              : close(text, state) || (match.punctuator = CommentGoal.type),
            match,
            text,
          );
        })}
      )`,
    ),
  StringLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        "|'
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal === ECMAScriptGoal
              ? open(text, state) ||
                  // TODO: Investigate why regexp forward is slow
                  // (void forward(text === '"' ? /(?:[^"\\\n]+?(?=\\.|")|\\.)*?"/g : /(?:[^'\\\n]+?(?=\\.|')|\\.)*?'/g, match, state)) ||
                  ((match.punctuator = StringGoal.type), 'opener')
              : context.goal !== StringGoal
              ? context.goal.type || 'sequence'
              : context.group.closer !== text
              ? StringGoal.type
              : ((match.flatten = false), close(text, state) || ((match.punctuator = StringGoal.type), 'closer')),
            match,
            text,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${'`'}
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal === ECMAScriptGoal
              ? open(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'opener')
              : context.goal !== TemplateLiteralGoal
              ? context.goal.type || 'sequence'
              : context.group.closer !== text
              ? TemplateLiteralGoal.type
              : close(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'closer'),
            match,
            text,
          );
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal.punctuators && context.goal.punctuators[text] === true
              ? (match.punctuator = 'combinator')
              : context.goal.openers &&
                context.goal.openers[text] === true &&
                (text !== '[' || context.goal !== RegExpGoal || context.group.opener !== '[')
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
        \}|\)|\]
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
  Solidus: () =>
    // TODO: Refine the necessary criteria for RegExp vs Div
    // SEE: https://github.com/sweet-js/sweet-core/wiki/design
    // SEE: https://inimino.org/~inimino/blog/javascript_semicolons
    // SEE: https://github.com/guybedford/es-module-shims/blob/master/src/lexer.js
    Matcher.define(
      entity => Matcher.sequence`(
        \*\/|\/=|\/
        ${entity((text, entity, match, state) => {
          let previousAtom;
          const context = state.context;
          match.format = 'punctuation';
          capture(
            context.goal === CommentGoal
              ? (context.group.closer === text && close(text, state)) || (match.punctuator = context.goal.type)
              : context.goal === RegExpGoal && context.group.closer !== ']' // ie /…*/ or /…/
              ? close('/', state) || ((match.punctuator = context.goal.type), 'closer')
              : context.goal !== ECMAScriptGoal
              ? context.goal.type || 'sequence'
              : text[0] === '*'
              ? fault(text, state)
              : !(previousAtom = state.previousAtom) ||
                (previousAtom.type === 'operator'
                  ? previousAtom.text !== '++' && previousAtom.text !== '--'
                  : previousAtom.type === 'closer'
                  ? previousAtom.text === '}'
                  : previousAtom.type === 'opener' || previousAtom.type === 'keyword')
              ? open(text, state) || ((match.punctuator = 'pattern'), 'opener')
              : (match.punctuator = 'operator'),
            match,
            text,
          );
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
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
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${Matcher.join(...keywords)}
        ${entity((text, entity, match, state) => {
          let previousAtom, keywordSymbol;
          const context = state.context;
          match.format = 'identifier';
          capture(
            (match.flatten = context.goal !== ECMAScriptGoal)
              ? context.goal.type || 'sequence'
              : ((keywordSymbol = keywords[text]), (previousAtom = state.previousAtom)) && previousAtom.text === '.'
              ? 'identifier'
              : 'keyword',
            match,
            text,
          );
          keywordSymbol &&
            ((context.keywords = (context.keywords || 0) + 1),
            (context[`${(match.capture[keywordSymbol] = text)}-keyword-index`] = match.index));
        })}
      )\b(?=[^\s$_:]|\s+[^:]|$)`,
    ),
  Identifier: ({RegExpFlags = /^[gimsuy]+$/} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        [${UnicodeIDStart}][${UnicodeIDContinue}]*
        ${entity((text, entity, match, state) => {
          let previousToken;
          match.format = 'identifier';
          capture(
            state.context.goal !== ECMAScriptGoal
              ? state.context.goal.type || 'sequence'
              : (previousToken = state.previousToken) &&
                previousToken.punctuator === 'pattern' &&
                RegExpFlags.test(text)
              ? ((match.punctuator = RegExpGoal.type), 'closer')
              : ((match.flatten = true), 'identifier'),
            match,
            text,
          );
        })}
      )`,
      `${UnicodeIDStart}${UnicodeIDContinue}`.includes('\\p{') ? 'u' : '',
    ),
  Number: ({
    NumericSeparator,
    Digits = NumericSeparator
      ? Digit => Matcher.sequence`[${Digit}][${Digit}${Matcher.escape(NumericSeparator)}]*`
      : Digit => Matcher.sequence`[${Digit}]+`,
    DecimalDigits = Digits(DecimalDigit),
    HexDigits = Digits(HexDigit),
    BinaryDigits = Digits(BinaryDigit),
  } = {}) =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${DecimalDigits}\.${DecimalDigits}[eE]${DecimalDigits}
        |\.${DecimalDigits}[eE]${DecimalDigits}
        |0[xX]${HexDigits}
        |0[bB]${BinaryDigits}
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
