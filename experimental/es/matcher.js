import {Matcher} from '../../../modules/matcher/matcher.js';
import {HexDigit, ControlLetter, GraveAccent, UnicodeIDStart, UnicodeIDContinue} from './ranges.js';
import {keywords, goals, symbols, FaultGoal} from './definitions.js';
import {capture, forward, fault, open, close} from './helpers.js';

const dummy = async () => {
  /*
  prettier-ignore
  */ //               // Make sure this block never lints
  {
    let i\u0032;
    this.new.target;

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
    return await/*  *//(regexp)/g.exec(c).map(d);

    // Matt Austin's
    Function("arg=`", "/*body`){});({x: this/**/");
    (function(arg=`/*``*/){/*body`){});({x: this/**/})

    // Multiline Strings
    [
      '\
      a\a',           // quote›‹punctuator, comment
      "\
      \\n\\b"/**/     // quote›‹comment, comment
    ];
  }
};

export const matcher = (() => {
  const {
    [symbols.ECMAScriptGoal]: ECMAScriptGoal,
    [symbols.CommentGoal]: CommentGoal,
    [symbols.RegExpGoal]: RegExpGoal,
    [symbols.StringGoal]: StringGoal,
    [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
  } = goals;

  const ECMAScriptGrammar = {
    Break: ({lf = true, crlf = false} = {}) =>
      Matcher.define(
        entity => Matcher.sequence`(
          ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
          ${entity((text, entity, match, state) => {
            const group = state.context.group;
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
            capture((match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset', match, text);
          })}
        )`,
      ),
    Escape: () =>
      Matcher.define(
        entity => Matcher.sequence`(
          \\u[${HexDigit}][${HexDigit}][${HexDigit}][${HexDigit}]
          ${entity((text, entity, match, state) => {
            const context = state.context;
            capture(
              context.goal.type ||
                ((match.flatten =
                  context.goal === ECMAScriptGoal &&
                  state.previousToken != null &&
                  state.previousToken.type === 'identifier' &&
                  ECMAScriptUnicodeIDContinue.test(String.fromCodePoint(parseInt(text.slice(2), 16))))
                  ? 'identifier' // `let i\u0032` -> identifier tokens
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
          ${GraveAccent}
          ${entity((text, entity, match, state) => {
            // const {goal, group} = state.context;
            const context = state.context;
            capture(
              context.goal === ECMAScriptGoal
                ? open(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'opener')
                : context.goal !== TemplateLiteralGoal
                ? ((match.flatten = true), context.goal.type || 'sequence')
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
            capture(
              // openers && (text in openers ? openers.text : (openers.text = openers.includes(text)))
              context.goal.punctuators && context.goal.punctuators[text] === true
                ? (match.punctuator = 'combinator')
                : context.goal.openers &&
                  context.goal.openers[text] === true &&
                  (text !== '[' || context.goal !== RegExpGoal || context.group.opener !== '[')
                ? open(text, state) || 'opener'
                : ((match.flatten = true), context.goal.type || 'sequence'),
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
            // const goal = state.context.goal;
            // const {closers, punctuators, type} = state.context.goal;
            // goal === ECMAScriptGoal || (goal.closers && goal.closers.includes(text))
            // goal.punctuators && goal.punctuators.includes(text)
            capture(
              context.goal.punctuators && context.goal.punctuators[text] === true
                ? (match.punctuator = 'combinator')
                : context.goal.closers && context.goal.closers[text] === true
                ? close(text, state) || 'closer'
                : ((match.flatten = true), context.goal.type || 'sequence'),
              match,
              text,
            );
          })}
        )`,
      ),
    Solidus: () =>
      Matcher.define(
        entity => Matcher.sequence`(
          \*\/|\/=|\/
          ${entity((text, entity, match, state) => {
            let previousAtom;
            const context = state.context;
            capture(
              context.goal === CommentGoal
                ? (context.group.closer === text && close(text, state)) || (match.punctuator = context.goal.type)
                : context.goal === RegExpGoal && context.group.closer !== ']' // ie /…*/ or /…/
                ? close('/', state) || ((match.punctuator = context.goal.type), 'closer')
                : context.goal !== ECMAScriptGoal
                ? context.goal.type || 'sequence'
                : text[0] === '*'
                ? fault(text, state)
                : // ECMAScriptGoal
                /**
                 * TODO: Refine the necessary criteria for RegExp vs Div
                 * SEE: https://github.com/sweet-js/sweet-core/wiki/design
                 * SEE: https://inimino.org/~inimino/blog/javascript_semicolons
                 * SEE: https://github.com/guybedford/es-module-shims/blob/master/src/lexer.js
                 */
                !(previousAtom = state.previousAtom) ||
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
            // const goal = state.context.goal;
            const context = state.context;
            capture(
              context.goal === ECMAScriptGoal
                ? 'operator'
                : context.goal.punctuators && context.goal.punctuators[text] === true
                ? (match.punctuator = 'punctuation')
                : ((match.flatten = true), context.goal.type || 'sequence'),
              match,
              text,
            );
          })}
        )`,
      ),
    Keyword: () =>
      Matcher.define(
        entity => Matcher.sequence`\b(
          ${Matcher.join(...Object.keys(keywords))}
          ${entity((text, entity, match, state) => {
            let previousAtom, keywordSymbol;
            const context = state.context;
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
        )\b(?=[^\s$_:]|\s+[^:])`,
      ),
    Identifier: (RegExpFlags = /^[gimsuy]+$/) =>
      Matcher.define(
        entity => Matcher.sequence`(
          [${UnicodeIDStart}][${UnicodeIDContinue}]*
          ${entity((text, entity, match, state) => {
            let previousToken;
            const context = state.context;
            capture(
              context.goal !== ECMAScriptGoal
                ? context.goal.type || 'sequence'
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
        ECMAScriptIdentifierFlags,
      ),
    IdentifierStart: () =>
      Matcher.define(
        entity => Matcher.sequence`(
          ${entity(symbols.UnicodeIDStart)}[${UnicodeIDStart}]
        )`,
        ECMAScriptIdentifierFlags,
      ),
    IdentifierContinue: () =>
      Matcher.define(
        entity => Matcher.sequence`(
          ${entity(symbols.UnicodeIDContinue)}[${UnicodeIDContinue}]+
        )`,
        ECMAScriptIdentifierFlags,
      ),
    Number: () =>
      Matcher.define(
        entity => Matcher.sequence`\b(
          0x\d+|\d+\.\d+[eE]\d+|\d+\.\d+|\d+[eE]\d+|\d+
          ${entity((text, entity, match, state) => {
            const context = state.context;
            capture(
              context.goal !== ECMAScriptGoal ? context.goal.type || 'sequence' : ((match.flatten = false), 'number'),
              match,
              text,
            );
          })}
        )\b`,
      ),
  };

  const ECMAScriptIdentifierFlags = `${UnicodeIDStart}${UnicodeIDContinue}`.includes('\\p{') ? 'u' : undefined;
  const ECMAScriptUnicodeIDContinue = RegExp(ECMAScriptGrammar.IdentifierContinue(), ECMAScriptIdentifierFlags);

  const matcher = Matcher.define(
    entity => Matcher.sequence`
      ${entity(ECMAScriptGrammar.Break())}
      |${entity(ECMAScriptGrammar.Whitespace())}
      |${entity(ECMAScriptGrammar.Escape())}
      |${entity(ECMAScriptGrammar.Comment())}
      |${entity(ECMAScriptGrammar.StringLiteral())}
      |${entity(ECMAScriptGrammar.TemplateLiteral())}
      |${entity(ECMAScriptGrammar.Opener())}
      |${entity(ECMAScriptGrammar.Closer())}
      |${entity(ECMAScriptGrammar.Solidus())}
      |${entity(ECMAScriptGrammar.Operator())}
      |${entity(ECMAScriptGrammar.Keyword())}
      |${entity(ECMAScriptGrammar.Number())}
      |${entity(ECMAScriptGrammar.Identifier())}
      |.
    `,
    'gu',
  );

  // |(?:0x|)\d+(?:\.\d+(?:e\d+|E\d+|)|)
  //    |\d[\d_]*

  matcher.goal = ECMAScriptGoal;

  return matcher;
})();
