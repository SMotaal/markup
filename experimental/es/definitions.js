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
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    closers: ['}', ')', ']'],
  },
  [Symbolic('CommentGoal')]: {type: 'comment', flatten: true, fold: true},
  [Symbolic('RegExpGoal')]: {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['['],
    closers: [']'],
    punctuators: ['+', '*', '?', '|', '^', '{', '}', '(', ')'],
  },
  [Symbolic('StringGoal')]: {type: 'quote', flatten: true, fold: true},
  [Symbolic('TemplateLiteralGoal')]: {
    type: 'quote',
    flatten: true,
    fold: false,
    openers: ['${'],
  },
  [Symbolic('FaultGoal')]: {type: 'fault'}, // , groups: {}
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
  const {create, freeze, entries, getOwnPropertySymbols, getOwnPropertyNames, setPrototypeOf} = Object;

  const punctuators = create(null);

  for (const opener of getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    freeze(group);
  }

  for (const symbol of getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    goal.name = (goal.symbol = symbol).description.replace(/Goal$/, '');
    goal[Symbol.toStringTag] = `«${goal.name}»`;
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.punctuators) {
      for (const punctuator of (goal.punctuators = [...goal.punctuators]))
        punctuators[punctuator] = !(goal.punctuators[punctuator] = true);
      freeze(setPrototypeOf(goal.punctuators, punctuators));
    }

    if (goal.closers) {
      for (const closer of (goal.closers = [...goal.closers])) punctuators[closer] = !(goal.closers[closer] = true);
      freeze(setPrototypeOf(goal.closers, punctuators));
    }

    if (goal.openers) {
      for (const opener of (goal.openers = [...goal.openers])) {
        const group = (goal.groups[opener] = {...groups[opener]});
        punctuators[opener] = !(goal.openers[opener] = true);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
        group[Symbol.toStringTag] = `‹${group.opener}›`;
      }
      freeze(setPrototypeOf(goal.openers, punctuators));
    }

    freeze(goal.groups);
    freeze(goal.tokens);
    freeze(goal);
  }

  freeze(punctuators);
  freeze(goals);
  freeze(groups);
  freeze(identities);
  freeze(symbols);

  for (const [identity, list] of entries({
    [identities.Keyword]:
      'await break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new return super switch this throw try typeof var void while with yield',
    [identities.RestrictedWord]: 'interface implements package private protected public',
    [identities.FutureReservedWord]: 'enum',
    // NOTE: This is purposely not aligned with the spec
    [identities.ContextualWord]: 'arguments async as from of static get set',
  })) {
    for (const keyword of list.split(/\s+/)) keywords[keyword] = identity;
  }
  keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  freeze(keywords);
}

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
