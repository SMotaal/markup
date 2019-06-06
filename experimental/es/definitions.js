//@ts-check
import {generateDefinitions, Keywords, Symbols, Construct} from './helpers.js';

const // Flags
  DEBUG_CONSTRUCTS = false;

const symbols = Symbols(
  'ECMAScriptGoal',
  'CommentGoal',
  'RegExpGoal',
  'StringGoal',
  'TemplateLiteralGoal',
  'FaultGoal',
);

/** Unique token records @type {{[symbol: symbol]: }} */
const tokens = {};

const identities = {
  UnicodeIDStart: 'ECMAScriptUnicodeIDStart',
  UnicodeIDContinue: 'ECMAScriptUnicodeIDContinue',
  HexDigits: 'ECMAScriptHexDigits',
  CodePoint: 'ECMAScriptCodePoint',
  ControlEscape: 'ECMAScriptControlEscape',
  ContextualWord: 'ECMAScriptContextualWord',
  RestrictedWord: 'ECMAScriptRestrictedWord',
  FutureReservedWord: 'ECMAScriptFutureReservedWord',
  Keyword: 'ECMAScriptKeyword',
  // MetaProperty: 'ECMAScriptMetaProperty',
};

const goals = {
  [symbols.ECMAScriptGoal]: {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    closers: ['}', ')', ']'],
  },
  [symbols.CommentGoal]: {type: 'comment', flatten: true, fold: true},
  [symbols.RegExpGoal]: {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['[', '(', '{'],
    closers: [']', ')', '}'],
    opener: '/',
    closer: '/',
    // punctuators: ['+', '*', '?', '|', '^', '{', '}', '(', ')'],
    punctuators: ['+', '*', '?', '|', '^'],
  },
  [symbols.StringGoal]: {type: 'quote', flatten: true, fold: true},
  [symbols.TemplateLiteralGoal]: {
    type: 'quote',
    flatten: true,
    fold: false,
    openers: ['${'],
    opener: '`',
    closer: '`',
  },
  [symbols.FaultGoal]: {type: 'fault'}, // , groups: {}
};

const {
  [symbols.FaultGoal]: FaultGoal,
  [symbols.ECMAScriptGoal]: ECMAScriptGoal,
  [symbols.CommentGoal]: CommentGoal,
  [symbols.RegExpGoal]: RegExpGoal,
  [symbols.StringGoal]: StringGoal,
  [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
} = goals;

const groups = {
  ['{']: {opener: '{', closer: '}'},
  ['(']: {opener: '(', closer: ')'},
  ['[']: {opener: '[', closer: ']'},
  ['//']: {
    opener: '//',
    closer: '\n',
    goal: symbols.CommentGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹comment›',
  },
  ['/*']: {
    opener: '/*',
    closer: '*/',
    goal: symbols.CommentGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹comment›',
  },
  ['/']: {
    opener: '/',
    closer: '/',
    goal: symbols.RegExpGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹pattern›',
  },
  ["'"]: {
    opener: "'",
    closer: "'",
    goal: symbols.StringGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹string›',
  },
  ['"']: {
    opener: '"',
    closer: '"',
    goal: symbols.StringGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹string›',
  },
  ['`']: {
    opener: '`',
    closer: '`',
    goal: symbols.TemplateLiteralGoal,
    parentGoal: symbols.ECMAScriptGoal,
    description: '‹template›',
  },
  ['${']: {
    opener: '${',
    closer: '}',
    goal: symbols.ECMAScriptGoal,
    parentGoal: symbols.TemplateLiteralGoal,
    description: '‹span›',
  },
};

/** @type {ECMAScript.Keywords} */
// @ts-ignore
const keywords = Keywords({
  // TODO: Let's make those constructs (this.new.target borks)
  // [identities.MetaProperty]: 'new.target import.meta',
  [identities.Keyword]: [
    ...['await', 'break', 'case', 'catch', 'class', 'const', 'continue'],
    ...['debugger', 'default', 'delete', 'do', 'else', 'export', 'extends'],
    ...['finally', 'for', 'function', 'if', 'import', 'in', 'instanceof'],
    ...['let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try'],
    ...['typeof', 'var', 'void', 'while', 'with', 'yield'],
  ],
  [identities.RestrictedWord]: ['interface', 'implements', 'package', 'private', 'protected', 'public'],
  [identities.FutureReservedWord]: ['enum'],
  // NOTE: This is purposely not aligned with the spec
  [identities.ContextualWord]: ['arguments', 'async', 'as', 'from', 'of', 'static', 'get', 'set'],
});

{
  const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
  const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
  const constructiveKeywords = new Set('await async function class await delete typeof void yield this new'.split(' '));

  /**
   * Determines if the capture is a valid keyword, identifier or undefined
   * based on matcher state (ie lastAtom, context, intent) and subset
   * of ECMAScript keyword rules of significant.
   *
   * TODO: Refactor or extensively test captureKeyword
   * TODO: Document subset of ECMAScript keyword rules of significant
   *
   * @param {string} text - Matched by /\b(‹text›)\b(?=[^\s$_:]|\s+[^:]|$)
   * @param {State} state
   * @param {string} [intent]
   */
  const captureKeyword = (text, {lastAtom: pre, lineIndex, context}, intent) => {
    //                              (a) WILL BE ‹fault› UNLESS  …
    switch (intent || (intent = context.intent)) {
      //  DESTRUCTURING INTENT  (ie Variable/Class/Function declarations)
      case 'destructuring':
      //  DECLARATION INTENT  (ie Variable/Class/Function declarations)
      case 'declaration':
        return (
          //                        (b)   WILL BE ‹idenfitier›
          //                              AFTER ‹.›  (as ‹operator›)
          (pre !== undefined && pre.text === '.' && 'identifier') ||
          //                        (c)   WILL BE ‹keyword›
          //                              IF DECLARATIVE AND …
          (declarativeKeywords.has(text) &&
            //                      (c1)  NOT AFTER ‹keyword› …
            (pre === undefined ||
              pre.type !== 'keyword' ||
              //                          UNLESS IS DIFFERENT
              (pre.text !== text &&
                //                        AND NOT ‹export› NOR ‹import›
                !(text === 'export' || text === 'import') &&
                //                  (c2)  FOLLOWS ‹export› OR ‹default›
                (pre.text === 'export' ||
                  pre.text === 'default' ||
                  //                (c3)  IS ‹function› AFTER ‹async›
                  (pre.text === 'async' && text === 'function')))) &&
            'keyword')
        );
      default:
        return (
          //                        (b)   WILL BE ‹idenfitier› …
          (((pre !== undefined &&
            //                      (b1)  AFTER ‹.›  (as ‹operator›)
            pre.text === '.') ||
            //                      (b2)  OR ‹await› (not as ‹keyword›)
            (text === 'await' && context.awaits === false) ||
            //                      (b3)  OR ‹yield› (not as ‹keyword›)
            (text === 'yield' && context.yields === false)) &&
            'identifier') ||
          //                        (c)   WILL BE ‹keyword› …
          ((pre === undefined ||
            //                      (c1)  NOT AFTER ‹keyword›
            pre.type !== 'keyword' ||
            //                      (c2)  UNLESS OPERATIVE
            operativeKeywords.has(pre.text) ||
            //                      (c3)  OR ‹if› AFTER ‹else›
            (text === 'if' && pre.text === 'else') ||
            //                      (c4)  OR ‹default› AFTER ‹export›
            (text === 'default' && pre.text === 'export') ||
            //                      (c5)  NOT AFTER ‹async›
            //                            EXCEPT ‹function›
            ((pre.text !== 'async' || text === 'function') &&
              //                    (c6)  AND NOT AFTER ‹class›
              //                          EXCEPT ‹extends›
              (pre.text !== 'class' || text === 'extends') &&
              //                    (c7)  AND NOT AFTER ‹for›
              //                          EXCEPT ‹await› (as ‹keyword›)
              (pre.text !== 'for' || text === 'await') &&
              //                    (c6)  NOT AFTER ‹return›
              //                          AND IS DIFFERENT
              //                          AND IS NOT ‹return›
              (pre.text !== 'return'
                ? pre.text !== text
                : text !== 'return'
                ? //                (c7)  OR AFTER ‹return›
                  //                      AND IS CONSTRUCTIVE
                  constructiveKeywords.has(text)
                : //                (c8)  OR AFTER ‹return›
                  //                      AND IS ‹return›
                  //                      WHEN ON NEXT LINE
                  pre.lineNumber < 1 + lineIndex))) &&
            'keyword')
        );
    }
  };

  const EmptyConstruct = Object.freeze(new Construct());
  const initializeContext = context => {
    if (context.state['USE_CONSTRUCTS'] !== true) return;
    context.parentContext == null || context.parentContext.currentConstruct == null
      ? (context.currentConstruct == null && (context.currentConstruct = EmptyConstruct),
        (context.parentConstruct = context.openingConstruct = EmptyConstruct))
      : (context.currentConstruct == null && (context.currentConstruct = new Construct()),
        (context.parentConstruct = context.parentContext.currentConstruct),
        context.parentContext.goal === ECMAScriptGoal && context.parentConstruct.add(context.group.description),
        (context.openingConstruct = context.parentConstruct.clone()),
        DEBUG_CONSTRUCTS === true && console.log(context));
  };

  goals[symbols.RegExpGoal].initializeContext = goals[symbols.StringGoal].initializeContext = goals[
    symbols.TemplateLiteralGoal
  ].initializeContext = initializeContext;

  /** @param {Context} context */
  goals[symbols.ECMAScriptGoal].initializeContext = context => {
    context.captureKeyword = captureKeyword;
    context.state['USE_CONSTRUCTS'] === true && initializeContext(context);
  };
}

generateDefinitions({groups, goals, identities, symbols, keywords, tokens});

export {
  identities,
  goals,
  groups,
  symbols,
  keywords,
  FaultGoal,
  ECMAScriptGoal,
  CommentGoal,
  RegExpGoal,
  StringGoal,
  TemplateLiteralGoal,
};

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */

// //@ts-ignore
// const keywords = {};

// function Symbolic(key, description = key) {
//   return (symbols[key] = Symbol(description));
// }
