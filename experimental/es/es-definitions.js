//@ts-check
import {
  generateDefinitions,
  defineSymbol,
  Keywords,
  Construct,
} from '../../packages/matcher/experimental/common/helpers.js';

export const {
  ECMAScriptGoal,
  ECMAScriptCommentGoal,
  ECMAScriptRegExpGoal,
  ECMAScriptRegExpClassGoal,
  ECMAScriptStringGoal,
  ECMAScriptTemplateLiteralGoal,
  ECMAScriptDefinitions,
} = (() => {
  // Avoids TypeScript "always …" style errors
  const DEBUG_CONSTRUCTS = Boolean(false);

  const identities = {
    UnicodeIDStart: 'ECMAScript.UnicodeIDStart',
    UnicodeIDContinue: 'ECMAScript.UnicodeIDContinue',
    HexDigits: 'ECMAScript.HexDigits',
    CodePoint: 'ECMAScript.CodePoint',
    ControlEscape: 'ECMAScript.ControlEscape',
    ContextualWord: 'ECMAScript.ContextualWord',
    RestrictedWord: 'ECMAScript.RestrictedWord',
    FutureReservedWord: 'ECMAScript.FutureReservedWord',
    Keyword: 'ECMAScript.Keyword',
  };

  const goals = {};
  const symbols = {};

  const ECMAScriptGoal = (goals[(symbols.ECMAScriptGoal = defineSymbol('ECMAScriptGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    // TODO: Properly fault on invalid closer
    closers: ['}', ')', ']'],
    /** @type {ECMAScript.Keywords} */
    // @ts-ignore
    keywords: Keywords({
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
    }),

    punctuation: {
      '=>': 'combinator',
      '?': 'delimiter',
      ':': 'delimiter',
      ',': 'delimiter',
      ';': 'breaker',
      '"': 'quote',
      "'": 'quote',
      '`': 'quote',
    },
  });

  const ECMAScriptCommentGoal = (goals[(symbols.ECMAScriptCommentGoal = defineSymbol('ECMAScriptCommentGoal'))] = {
    type: 'comment',
    flatten: true,
    fold: true,
    spans: {
      // SINLE-LINE COMMENT
      //
      //    This faults when match[1] === ''
      //    It forwards until ‹\n›
      '//': /.*?(?=\n|($))/g,
      //
      //    Alternative: '\n' ie indexOf(…, lastIndex)
      //
      // MULTI-LINE COMMENT
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹*/›
      '/*': /[^]*?(?=\*\/|($))/g,
      //
      //   Alternative: '*/' ie indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptRegExpGoal = (goals[(symbols.ECMAScriptRegExpGoal = defineSymbol('ECMAScriptRegExpGoal'))] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['(', '{', '['],
    closers: [],
    opener: '/',
    closer: '/',
    punctuators: ['+', '*', '?', '|', '^', '.', '?=', '?:', '?!'],
    punctuation: {
      '[': 'combinator',
      ']': 'combinator',
      '(': 'combinator',
      ')': 'combinator',
      '{': 'combinator',
      '}': 'combinator',
      '\n': 'fault',
    },
    spans: {
      // This faults when match[1] === ''
      //   It forwards thru ‹•\d•,•}› ‹•,•\d•}› or ‹•\d•}› only
      '{': /\s*(?:\d+\s*,\s*\d+|\d+\s*,|\d+|,\s*\d+)\s*}|()/g,
    },
  });

  const ECMAScriptRegExpClassGoal = (goals[
    (symbols.ECMAScriptRegExpClassGoal = defineSymbol('ECMAScriptRegExpClassGoal'))
  ] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: [],
    closers: [']'],
    opener: '[',
    closer: ']',
    punctuators: ['\\', '^', '-'],
    punctuation: {
      '[': 'pattern',
      ']': 'combinator',
      '(': 'pattern',
      ')': 'pattern',
      '{': 'pattern',
      '}': 'pattern',
      '\n': 'fault',
    },
  });

  ECMAScriptRegExpGoal.openers['['] = {
    goal: symbols.ECMAScriptRegExpClassGoal,
    parentGoal: symbols.ECMAScriptRegExpGoal,
  };

  const ECMAScriptStringGoal = (goals[(symbols.ECMAScriptStringGoal = defineSymbol('ECMAScriptStringGoal'))] = {
    type: 'quote',
    flatten: true,
    fold: true,
    spans: {
      // SINGLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹'›
      "'": /(?:[^'\\\n]+?(?=\\[^]|')|\\[^])*?(?='|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
      //
      // DOUBLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹"›
      '"': /(?:[^"\\\n]+?(?=\\[^]|")|\\[^])*?(?="|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptTemplateLiteralGoal = (goals[
    (symbols.ECMAScriptTemplateLiteralGoal = defineSymbol('ECMAScriptTemplateLiteralGoal'))
  ] = {
    type: 'quote',
    flatten: true,
    fold: false,
    openers: ['${'],
    opener: '`',
    closer: '`',
    punctuation: {
      '${': 'opener',
    },
    spans: {
      // GRAVE/BACKTIC QUOTE
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹\n› ‹`› or ‹${›
      '`': /(?:[^`$\\\n]+?(?=\n|\\.|`|\$\{)|\\.)*?(?=\n|`|\$\{|($))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
  });

  {
    const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
    const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
    const constructiveKeywords = new Set(
      'await async function class await delete typeof void yield this new'.split(' '),
    );

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

    goals[symbols.ECMAScriptRegExpGoal].initializeContext = goals[
      symbols.ECMAScriptStringGoal
    ].initializeContext = goals[symbols.ECMAScriptTemplateLiteralGoal].initializeContext = initializeContext;

    /** @param {Context} context */
    goals[symbols.ECMAScriptGoal].initializeContext = context => {
      context.captureKeyword = captureKeyword;
      context.state['USE_CONSTRUCTS'] === true && initializeContext(context);
    };
  }

  return {
    ECMAScriptGoal,
    ECMAScriptCommentGoal,
    ECMAScriptRegExpGoal,
    ECMAScriptRegExpClassGoal,
    ECMAScriptStringGoal,
    ECMAScriptTemplateLiteralGoal,
    ECMAScriptDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}'},
        ['(']: {opener: '(', closer: ')'},
        ['[']: {opener: '[', closer: ']'},
        ['//']: {
          opener: '//',
          closer: '\n',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/*']: {
          opener: '/*',
          closer: '*/',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/']: {
          opener: '/',
          closer: '/',
          goal: symbols.ECMAScriptRegExpGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹pattern›',
        },
        ["'"]: {
          opener: "'",
          closer: "'",
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['"']: {
          opener: '"',
          closer: '"',
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['`']: {
          opener: '`',
          closer: '`',
          goal: symbols.ECMAScriptTemplateLiteralGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹template›',
        },
        ['${']: {
          opener: '${',
          closer: '}',
          goal: symbols.ECMAScriptGoal,
          parentGoal: symbols.ECMAScriptTemplateLiteralGoal,
          description: '‹span›',
        },
      },
    }),
  };
})();

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */
