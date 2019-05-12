/** Symbol map @type {{ [key: string]: symbol }} */
const symbols = {};

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
};

const goals = {
  [Symbolic('ECMAScriptGoal')]: {
    type: undefined,
    flatten: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    closers: ['}', ')', ']'],
  },
  [Symbolic('CommentGoal')]: {type: 'comment', flatten: true},
  [Symbolic('RegExpGoal')]: {
    type: 'pattern',
    flatten: undefined,
    openers: ['['],
    closers: [']'],
    punctuators: ['+', '*', '?', '|', '^', '{', '}', '(', ')'],
  },
  [Symbolic('StringGoal')]: {type: 'quote', flatten: true},
  [Symbolic('TemplateLiteralGoal')]: {
    type: 'quote',
    flatten: true,
    openers: ['${'],
  },
  [Symbolic('FaultGoal')]: {type: 'fault', groups: {}},
};

const {[symbols.FaultGoal]: FaultGoal} = goals;

const groups = {
  ['{']: {opener: '{', closer: '}'},
  ['(']: {opener: '(', closer: ')'},
  ['[']: {opener: '[', closer: ']'},
  ['//']: {opener: '//', closer: '\n', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  ['/*']: {opener: '/*', closer: '*/', goal: symbols.CommentGoal, parentGoal: symbols.ECMAScriptGoal},
  ['/']: {opener: '/', closer: '/', goal: symbols.RegExpGoal, parentGoal: symbols.ECMAScriptGoal},
  ["'"]: {opener: "'", closer: "'", goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  ['"']: {opener: '"', closer: '"', goal: symbols.StringGoal, parentGoal: symbols.ECMAScriptGoal},
  ['`']: {
    opener: '`',
    closer: '`',
    goal: symbols.TemplateLiteralGoal,
    parentGoal: symbols.ECMAScriptGoal,
  },
  ['${']: {
    opener: '${',
    closer: '}',
    goal: symbols.ECMAScriptGoal,
    parentGoal: symbols.TemplateLiteralGoal,
  },
};

/**  @type {ECMAScript.Keywords} */
const keywords = {};

{
  const {freeze, entries, getOwnPropertySymbols, getOwnPropertyNames} = Object;

  for (const opener of getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    freeze(group);
  }

  for (const symbol of getOwnPropertySymbols(goals)) {
    const {[symbol]: goal} = goals;

    goal.name = (goal.symbol = symbol).description.replace(/Goal$/, '');
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.closers) {
      freeze(goal.closers);
    }

    if (goal.openers) {
      for (const opener of freeze((goal.openers = [...goal.openers]))) {
        const group = (goal.groups[opener] = groups[opener]);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
      }
    }

    freeze(goal.groups);
    freeze(goal.tokens);
    freeze(goal);
  }

  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);

  for (const [identity, list] of entries({
    [identities.Keyword]:
      'await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield',
    [identities.RestrictedWord]: 'interface implements package private protected public',
    [identities.FutureReservedWord]: 'enum',
    [identities.ContextualWord]: 'arguments async as from of static',
  })) {
    for (const keyword of list.split(/\s+/)) keywords[keyword] = identity;
  }
  freeze(keywords);
}

export {identities, goals, groups, symbols, keywords, FaultGoal};

/**
 * Creates a symbolically mapped goal-specific token record
 *
 * @template {{}} T
 * @param {goal} goal
 * @param {string} text
 * @param {type} type
 * @param {T} properties
 */
function GoalSpecificTokenRecord(goal, text, type, properties) {
  const symbol = Symbol(`‹${goal.name} ${text}›`);
  return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
}

function Symbolic(key, description = key) {
  return (symbols[key] = Symbol(description));
}

/** @typedef {typeof goals} goals */
/** @typedef {goals[keyof goals]} goal */
/** @typedef {goal['type']} type */
/** @typedef {{symbol: symbol, text: string, type: type, goal?: goal, group?: group}} token */
/** @typedef {typeof groups} groups */
/** @typedef {groups[keyof groups]} group */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */
