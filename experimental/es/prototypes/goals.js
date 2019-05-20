import {List} from './helpers.js';

const definitions = {};

/** Symbol map @type {{ [key: string]: symbol }} */
const symbols = (definitions.symbols = {});

/** Identity map @type {{ [key: string]: symbol }} */
const identities = (definitions.identities = {});

/** Unique token records @type {{ [symbol: symbol]: token }} */
const tokens = (definitions.tokens = {});

/** Unique keyword records @type {{ [symbol: symbol]: token }} */
const keywords = (definitions.keywords = {});

/** Unique keyword records @type {{ [symbol: symbol]: group }} */
const groups = (definitions.groups = {});

const delimiters = {
  ['{…}']: {opener: '{', closer: '}'},
  ['(…)']: {opener: '(', closer: ')'},
  ['[…]']: {opener: '[', closer: ']'},
  ['//…\n']: {opener: '//', closer: '\n'},
  ['/*…*/']: {opener: '/*', closer: '*/'},
  ['/…/']: {opener: '/', closer: '/'},
  ["'…'"]: {opener: "'", closer: "'"},
  ['"…"']: {opener: '"', closer: '"'},
  ['`…`']: {opener: '`', closer: '`'},
  ['${…}']: {opener: '${', closer: '}'},
};

const GoalSymbol = Symbolic('Goal');
const GroupSymbol = Symbolic('Group');
const TokenSymbol = Symbolic('Token');

const ParentGoal = Symbolic('Parent Goal');
const NestedGoal = Symbolic('Nested Goal');

// TODO: Wrap goal definitions by Grammar
const goals = (definitions.goals = {
  [Symbolic('FaultGoal')]: {type: 'fault', groups: []},

  ...(({
    ECMAScript = Symbolic('ECMAScriptGoal'),
    [ECMAScript]: {
      Comment = Symbolic('ECMAScript:CommentGoal'),
      RegularExpressionLiteral = Symbolic('ECMAScript:RegularExpressionLiteralGoal'),
      RegularExpressionClass = Symbolic('ECMAScript:RegularExpressionClassGoal'),
      StringLiteral = Symbolic('ECMAScript:StringLiteralGoal'),
      TemplateLiteral = Symbolic('ECMAScript:TemplateLiteralGoal'),

      // Keywords
      Keyword = Symbolic('ECMAScript:Keyword'),
      FutureReservedWord = Symbolic('ECMAScript:FutureReservedWord'),
      RestrictedWord = Symbolic('ECMAScript:RestrictedWord'),
      ContextualWord = Symbolic('ECMAScript:ContextualWord'),
    } = {},
  } = {}) => ({
    /** @see https://www.ecma-international.org/ecma-262/#prod-Comment */
    [Comment]: {type: 'comment'},

    /** @see https://www.ecma-international.org/ecma-262/#prod-RegularExpressionClass */
    [RegularExpressionClass]: {type: 'pattern'},

    /** @see https://www.ecma-international.org/ecma-262/#prod-RegularExpressionLiteral */
    [RegularExpressionLiteral]: {
      type: 'pattern',
      groups: [
        {...delimiters['[…]'], [NestedGoal]: RegularExpressionClass},
        {...delimiters['(…)'], [NestedGoal]: RegularExpressionLiteral},
      ],
    },

    /** @see https://www.ecma-international.org/ecma-262/#prod-StringLiteral */
    [StringLiteral]: {type: 'quote'},

    /** @see https://www.ecma-international.org/ecma-262/#prod-Template */
    [TemplateLiteral]: {type: 'quote', groups: [{...delimiters['${…}'], [NestedGoal]: ECMAScript}]}, // matcher: /\\.|(`|$\{)/g,

    /** @see https://www.ecma-international.org/ecma-262/#sec-grammar-summary */
    [ECMAScript]: {
      entities: List('UnicodeIDStart UnicodeIDContinue HexDigits CodePoint ControlEscape'),
      keywords: {
        /** @see https://www.ecma-international.org/ecma-262/#prod-Keyword */
        [Keyword]: List(
          'await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield',
        ),

        /** @see https://www.ecma-international.org/ecma-262/#prod-FutureReservedWord */
        [FutureReservedWord]: List('enum'),

        /** Context-specific reserved keywords (ie Strict Mode) */
        [RestrictedWord]: List('interface implements package private protected public'),

        /** Context-specific keywords */
        [ContextualWord]: List('arguments async as from of static'),
      },
      identities: {
        Keyword: Keyword,
        FutureReservedWord: FutureReservedWord,
        RestrictedWord: RestrictedWord,
        ContextualWord: ContextualWord,
      },
      groups: [
        {...delimiters['{…}']}, // polymorphic goal
        {...delimiters['(…)']}, // polymorphic goal
        {...delimiters['[…]']}, // polymorphic goal
        {...delimiters['//…\n'], [NestedGoal]: Comment},
        {...delimiters['/*…*/'], [NestedGoal]: Comment},
        {...delimiters['/…/'], [NestedGoal]: RegularExpressionLiteral},
        {...delimiters["'…'"], [NestedGoal]: StringLiteral},
        {...delimiters['"…"'], [NestedGoal]: StringLiteral},
        {...delimiters['`…`'], [NestedGoal]: TemplateLiteral},
      ],
    },
  }))(),
});

const FaultGoal = goals[symbols.FaultGoal];

{
  const {freeze, entries, values, getOwnPropertySymbols} = Object;

  for (const goalSymbol of getOwnPropertySymbols(definitions.goals)) {
    const goal = definitions.goals[goalSymbol];

    goal[GoalSymbol] = goalSymbol;

    const {
      name: goalName = (goal.name = goalSymbol.description.replace(/Goal$/, '')),
      groups: goalGroups,
      entities: goalEntities,
      keywords: goalKeywords,
      identities: goalIdentities = (goal.identities = {}),
      tokens: goalTokens = (goal.tokens = {}),
    } = goal;

    const predefinedIdentities = values(goalIdentities);

    if (goalGroups) {
      if ('openers' in goal) throw new TypeError(`Redundant goal definition: ${goalName}`);

      const openers = (goal.openers = {});

      for (const group of goalGroups) {
        const {opener, closer} = group;
        const groupDescription = `${goalName} ‹${opener}…${closer}›`;

        if (!opener || !closer || (group[NestedGoal] && typeof group[NestedGoal] !== 'symbol'))
          throw new TypeError(`Invalid group delimiters: ${groupDescription}`);

        if (GroupSymbol in group || opener in goalGroups)
          throw new Error(`Redundant group definition: ${groupDescription}`);

        TokenRecord(goal, opener, 'opener', {group});
        TokenRecord(goal, closer, 'closer', {group});

        group[ParentGoal] = goal;

        group[NestedGoal]
          ? typeof group[NestedGoal] === 'object' ||
            (group[NestedGoal] = definitions.goals[group[NestedGoal]] || FaultGoal)
          : (group[NestedGoal] = undefined);

        freeze((openers[opener] = definitions.groups[(group[GroupSymbol] = Symbol(groupDescription))] = group));
      }

      freeze(goalGroups);
    }

    if (goalEntities) {
      for (const entity of goalEntities) {
        const key = `${goalName}:${entity}`;

        if (entity in goalIdentities || key in definitions.identities)
          throw new Error(`Redundant entity definition: ${key}`);

        definitions.identities[key] = goalIdentities[entity] = Symbolic(key);
      }
      freeze(goalEntities);
    }

    if (goalKeywords) {
      for (const keywordIdentity of getOwnPropertySymbols(goalKeywords)) {
        const key = keywordIdentity.description;

        if (!predefinedIdentities.includes(keywordIdentity)) throw new Error(`Undeclared keyword identity: ${key}`);

        if (key in definitions.identities) throw new Error(`Redundant keyword definition: ${key}`);

        for (const keyword of freeze(goalKeywords[keywordIdentity])) {
          const keywordRecord = (goalKeywords[keyword] = TokenRecord(goal, keyword, keywordIdentity));
          definitions.keywords[keywordRecord[TokenSymbol]] = keywordRecord;
        }

        definitions.identities[key] = keywordIdentity;
      }
      freeze(goalKeywords);
    }

    freeze(goalIdentities);
    freeze(goalTokens);
    freeze(goal);
  }

  freeze(definitions.identities);
  freeze(definitions.goals);
  freeze(definitions.groups);
  freeze(definitions.keywords);
  freeze(definitions.symbols);
}

export {identities, goals, groups, keywords, symbols, FaultGoal};

/**
 * Creates a symbolically mapped goal-specific token record
 *
 * @template {{}} T
 * @param {goal} parentGoal
 * @param {string} text
 * @param {type} type
 * @param {T} [properties]
 */
function TokenRecord(parentGoal, text, type, properties) {
  const tokenSymbol = Symbol(`${parentGoal.name} ‹${text}›`);
  return (parentGoal.tokens[text] = parentGoal.tokens[tokenSymbol] = definitions.tokens[tokenSymbol] = {
    [TokenSymbol]: tokenSymbol,
    [ParentGoal]: parentGoal,
    text,
    type,
    ...properties,
  });
}

/**
 * Creates or returns a symbolic mapping symbol.
 *
 * @param {string} key - Unique symbolic mapping key for the symbol (ie if defined)
 * @param {string} [description] - Actual description of the symbol (ie when first defined)
 */
function Symbolic(key, description = key) {
  return symbols[key] || (symbols[key] = Symbol(description));
}

/** @typedef {string | symbol} identity */

/**
 * @template {{}} T
 * @typedef {{[TokenSymbol]: symbol, text: string, type: identity} & T} token
 */

/**
 * @template {{}} T
 * @typedef {{opener: string, closer: string} & T} group
 */

/** @typedef {{[GoalSymbol]: symbol , groups?: groups, type?: token.type}} goal */
/** @typedef {token<{goal: goal}>} goal.token */

/** @typedef {token<{group: group}>} group.token */

/** @typedef {{[name: symbol]: goal}} goals */
/** @typedef {{[name: string]: group}} groups */

/**
 * @typedef {'UnicodeIDStart'|'UnicodeIDContinue'|'HexDigits'|'CodePoint'|'ControlEscape'|'ContextualWord'|'RestrictedWord'|'FutureReservedWord'|'Keyword'} ECMAScript.Identities
 */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */
