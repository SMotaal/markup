import {Matcher} from '/modules/matcher/matcher.js';
import {ranges} from './ranges.js';
import {keywords, goals, symbols, FaultGoal} from './definitions.js';
import {capture, forward, fault, open, close} from './helpers.js';

const {
  [symbols.ECMAScriptGoal]: ECMAScriptGoal,
  [symbols.CommentGoal]: CommentGoal,
  [symbols.RegExpGoal]: RegExpGoal,
  [symbols.StringGoal]: StringGoal,
  [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
} = goals;

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
    ( ([              /([(regexp)])/g ] )/ []);
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

const ECMAScriptGrammar = {
  Break: ({lf = true, crlf = false} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          const {group} = state.context;
          capture('break', match, text);
          (group && group.closer === '\n' && close(text, state)) || 'closer';
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
        \\u[${ranges.HexDigit}][${ranges.HexDigit}][${ranges.HexDigit}][${ranges.HexDigit}]
        ${entity((text, entity, match, state) => {
          const {goal} = state.context;
          capture(
            goal.type ||
              ((match.flatten =
                goal === ECMAScriptGoal &&
                state.previousToken != null &&
                state.previousToken.type === 'identifier' &&
                ECMAScriptUnicodeIDContinue.test(String.fromCodePoint(parseInt(text.slice(2), 16))))
                ? 'identifier' // `let i\u0032` -> identifier tokens
                : 'escape'),
            match,
            text,
          );
        })})
      |(
        ${entity((text, entity, match, state) => {
          const {goal} = state.context;
          capture(goal.type || 'escape', match, (match.capture[keywords[text]] = text));
        })}
        \\f|\\n|\\r|\\t|\\v|\\c[${ranges.ControlLetter}]
        |\\x[${ranges.HexDigit}][${ranges.HexDigit}]
        |\\u\{[${ranges.HexDigit}]*\}
        |\\.
      )`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/|\/\*
        ${entity((text, entity, match, state) => {
          const {goal, group} = state.context;
          capture(
            goal === ECMAScriptGoal
              ? open(text, state) ||
                  // Safely fast skip to end of comment
                  (forward(text === '//' ? '\n' : '*/', match, state),
                  // No need to track delimiter
                  CommentGoal.type)
              : goal !== CommentGoal
              ? goal.type || 'sequence'
              : group.closer !== text
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
          const {goal, group} = state.context;
          capture(
            goal === ECMAScriptGoal
              ? open(text, state) ||
                  // TODO: Investigate why regexp forward is slow
                  // (void forward(text === '"' ? /(?:[^"\\\n]+?(?=\\.|")|\\.)*?"/g : /(?:[^'\\\n]+?(?=\\.|')|\\.)*?'/g, match, state)) ||
                  ((match.punctuator = StringGoal.type), 'opener')
              : goal !== StringGoal
              ? goal.type || 'sequence'
              : group.closer !== text
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
        ${ranges.GraveAccent}
        ${entity((text, entity, match, state) => {
          const {goal, group} = state.context;
          capture(
            goal === ECMAScriptGoal
              ? open(text, state) || ((match.punctuator = TemplateLiteralGoal.type), 'opener')
              : goal !== TemplateLiteralGoal
              ? ((match.flatten = true), goal.type || 'sequence')
              : group.closer !== text
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
          const {goal} = state.context;
          capture(
            (text === '${'
            ? goal === TemplateLiteralGoal
            : goal === ECMAScriptGoal || (goal.openers && goal.openers.includes(text)))
              ? open(text, state) || 'opener'
              : goal.punctuators && goal.punctuators.includes(text)
              ? (match.punctuator = 'combinator')
              : ((match.flatten = true), goal.type || 'sequence'),
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
          const {goal} = state.context;
          capture(
            goal === ECMAScriptGoal || (goal.closers && goal.closers.includes(text))
              ? close(text, state) || 'closer'
              : goal.punctuators && goal.punctuators.includes(text)
              ? (match.punctuator = 'combinator')
              : ((match.flatten = true), goal.type || 'sequence'),
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
          let previousText, previousType;
          const {goal, group} = state.context;
          capture(
            goal === CommentGoal
              ? (group.closer === text && close(text, state)) || (match.punctuator = goal.type)
              : goal === RegExpGoal // ie /…*/ or /…/
              ? close('/', state) || ((match.punctuator = goal.type), 'closer')
              : goal !== ECMAScriptGoal
              ? goal.type || 'sequence'
              : text[0] === '*'
              ? fault(text, state)
              : // ECMAScriptGoal
              /**
               * TODO: Refine the necessary criteria for RegExp vs Div
               * SEE: https://github.com/sweet-js/sweet-core/wiki/design
               * SEE: https://inimino.org/~inimino/blog/javascript_semicolons
               * SEE: https://github.com/guybedford/es-module-shims/blob/master/src/lexer.js
               */
              !state.previousAtom ||
                (({text: previousText, type: previousType} = state.previousAtom),
                previousType === 'operator'
                  ? previousText !== '++' && previousText !== '--'
                  : previousType === 'closer'
                  ? previousText === '}'
                  : previousType === 'opener' || previousType === 'keyword')
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
        ${entity((text, entity, match, state) => {
          // TODO: Add conditional lookahead (or look behined)
          const {goal} = state.context;
          capture(
            goal === ECMAScriptGoal
              ? 'operator'
              : goal.punctuators && goal.punctuators.includes(text)
              ? (match.punctuator = 'punctuation')
              : ((match.flatten = true), goal.type || 'sequence'),
            match,
            text,
          );
        })}
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
      )`,
    ),
  Keyword: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        ${Object.keys(keywords).join('|')}
        ${entity((text, entity, match, state) => {
          let previousAtom, keywordSymbol;
          const {goal} = state.context;
          // TODO: Add conditional lookahead (or look behined)
          capture(
            (match.flatten = goal !== ECMAScriptGoal)
              ? goal.type || 'sequence'
              : ((keywordSymbol = keywords[text]), (previousAtom = state.previousAtom)) && previousAtom.text === '.'
              ? 'identifier'
              : 'keyword',
            match,
            text,
          );
          keywordSymbol && (state.context[`${(match.capture[keywordSymbol] = text)}-keyword-index`] = match.index);
        })}
      )\b(?=[^\s$_:]|\s+[^:])`,
    ),
  Identifier: (RegExpFlags = /^[gimsuy]+$/) =>
    Matcher.define(
      entity => Matcher.sequence`(
        [${ranges.UnicodeIDStart}][${ranges.UnicodeIDContinue}]*
        ${entity((text, entity, match, state) => {
          const {goal} = state.context;
          // TODO: Add conditional lookahead (or look behined)
          capture(
            goal !== ECMAScriptGoal
              ? goal.type || 'sequence'
              : state.previousToken && state.previousToken.punctuator === 'pattern' && RegExpFlags.test(text)
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
        ${entity(symbols.UnicodeIDStart)}[${ranges.UnicodeIDStart}]
      )`,
      ECMAScriptIdentifierFlags,
    ),
  IdentifierContinue: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${entity(symbols.UnicodeIDContinue)}[${ranges.UnicodeIDContinue}]+
      )`,
      ECMAScriptIdentifierFlags,
    ),
};

const ECMAScriptIdentifierFlags = `${ranges.UnicodeIDStart}${ranges.UnicodeIDContinue}`.includes('\\p{')
  ? 'u'
  : undefined;
const ECMAScriptUnicodeIDContinue = RegExp(ECMAScriptGrammar.IdentifierContinue(), ECMAScriptIdentifierFlags);

export const matcher = Matcher.define(
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
    |${entity(ECMAScriptGrammar.Identifier())}
    |\d+
    |.
  `,
  'gu',
);

matcher.goal = ECMAScriptGoal;
