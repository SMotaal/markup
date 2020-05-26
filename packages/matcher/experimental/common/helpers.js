//@ts-check
import {TokenMatcher} from '../../lib/token-matcher.js';
import {RegExpRange} from '../../lib/range.js';
import {SymbolMap} from '../../helpers/symbol-map.js';

/// Helpers
/** @typedef {<T extends {}>(options?: T) => MatcherPatternFactory} PatternFactory */

/**
 * @template {symbol} G
 * @template {string} K
 * @param {G} goal
 * @param {(constructor: typeof TokenMatcher) => Record<G|K, PatternFactory> } factory
 */
export const createMatcher = (goal, factory) =>
  TokenMatcher.define(factory(TokenMatcher)[goal](), 'gu', {goal: {value: goal, enumerable: true, writable: false}});

export const createMode = ({matcher, ...options}) => TokenMatcher.createMode(matcher, {...defaults.mode, ...options});

/** @param {State} state */
// TODO: Document initializeState
export const initializeState = state => {
  /** @type {Groups} state */
  (state.groups = []).closers = [];
  state.lineOffset = state.lineIndex = 0;
  state.totalCaptureCount = state.totalTokenCount = 0;

  /** @type {Contexts} */
  const contexts = (state.contexts = Array(100));
  const context = initializeContext({
    id: `«${state.matcher.goal.name}»`,
    number: (contexts.count = state.totalContextCount = 1),
    depth: 0,
    faults: 0,
    parentContext: undefined,
    goal: state.matcher.goal,
    //@ts-ignore
    group: (state.groups.root = Object.freeze({})),
    state,
    ...(state.USE_CONSTRUCTS === true ? {currentConstruct: new Construct()} : {}),
  });
  state.firstTokenContext = state.nextTokenContext = state.lastContext = state.context = contexts[-1] = context;
  state.lastTokenContext = undefined;
  state.initializeContext = initializeContext;
};

/** @param {State} state */
// TODO: Document finalizeState
export const finalizeState = state => {
  const isValidState =
    state.firstTokenContext === state.nextTokenContext &&
    state.nextToken === undefined &&
    state.nextOffset === undefined;

  const {
    flags: {debug = false} = {},
    options: {console: {log = console.log, warn = console.warn} = console} = {},
    error = (state.error = !isValidState ? 'Unexpected end of tokenizer state' : undefined),
  } = state;

  // if (!debug && error) throw Error(error);

  // Finalize latent token artifacts
  state.nextTokenContext = void (state.lastTokenContext = state.nextTokenContext);

  // Finalize tokenization artifacts
  error || (state.context = state.contexts = state.groups = undefined);

  // Output to console when necessary
  debug && (error ? warn : log)(`[tokenizer]: ${error || 'done'} — %O`, state);
};

export const initializeContext = (assign =>
  /**
   * @template {Partial<Context>} T
   * @template {{}} U
   * @param {T | Context} context
   * @param {U} [properties]
   * @returns {Context & T & U}
   */
  (context, properties) => {
    //@ts-ignore
    return (
      assign(context, stats, properties),
      context.goal &&
        context.goal.initializeContext &&
        //@ts-ignore
        context.goal.initializeContext(context),
      context
    );
  })(Object.assign);

const symbolMap = new SymbolMap();

/** @type {SymbolMap['define']} */
export const defineSymbol = (description, symbol) => symbolMap.define(description, symbol);

/** @type {SymbolMap['describe']} */
export const describeSymbol = symbol => symbolMap.describe(symbol);

export const generateDefinitions = ({groups = {}, goals = {}, identities = {}, symbols = {}, tokens = {}}) => {
  const seen = new WeakSet();

  for (const symbol of Object.getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    if (!goal || typeof goal != 'object') throw TypeError('generateDefinitions invoked with an invalid goal type');

    if (seen.has(goal)) throw TypeError('generateDefinitions invoked with a redundant goal entry');

    seen.add(goal);

    if (!goal || typeof goal != 'object' || (goal.symbol != null && goal.symbol !== symbol))
      throw Error('generateDefinitions invoked with goal-symbol mismatch');

    if (generateDefinitions.NullGoal == null) throw Error('generateDefinitions invoked with the NullGoal goal');

    if (generateDefinitions.FaultGoal == null) throw Error('generateDefinitions invoked with the FaultGoal goal');
  }

  const FaultGoal = generateDefinitions.FaultGoal;

  const punctuators = Object.create(null);

  for (const opener of Object.getOwnPropertyNames(groups)) {
    const {[opener]: group} = groups;
    'goal' in group && (group.goal = goals[group.goal] || FaultGoal);
    'parentGoal' in group && (group.parentGoal = goals[group.parentGoal] || FaultGoal);
    Object.freeze(group);
  }

  for (const symbol of Object.getOwnPropertySymbols(goals)) {
    // @ts-ignore
    const {[symbol]: goal} = goals;

    goal.symbol === symbol || (goal.symbol = symbol);
    goal.name = describeSymbol(symbol).replace(/Goal$/, '');
    symbols[`${goal.name}Goal`] = goal.symbol;
    goal[Symbol.toStringTag] = `«${goal.name}»`;
    goal.tokens = tokens[symbol] = {};
    goal.groups = [];

    if (goal.punctuators) {
      for (const punctuator of (goal.punctuators = [...goal.punctuators]))
        punctuators[punctuator] = !(goal.punctuators[punctuator] = true);
      Object.freeze(Object.setPrototypeOf(goal.punctuators, punctuators));
    } else {
      goal.punctuators = punctuators;
    }

    if (goal.closers) {
      for (const closer of (goal.closers = [...goal.closers])) punctuators[closer] = !(goal.closers[closer] = true);
      Object.freeze(Object.setPrototypeOf(goal.closers, punctuators));
    } else {
      goal.closers = generateDefinitions.Empty;
    }

    if (goal.openers) {
      const overrides = {...goal.openers};
      for (const opener of (goal.openers = [...goal.openers])) {
        const group = (goal.groups[opener] = {...groups[opener], ...overrides[opener]});
        typeof group.goal === 'symbol' && (group.goal = goals[group.goal] || FaultGoal);
        typeof group.parentGoal === 'symbol' && (group.parentGoal = goals[group.goal] || FaultGoal);
        punctuators[opener] = !(goal.openers[opener] = true);
        GoalSpecificTokenRecord(goal, group.opener, 'opener', {group});
        GoalSpecificTokenRecord(goal, group.closer, 'closer', {group});
        group.description || (group.description = `${group.opener}…${group.closer}`);
        group[Symbol.toStringTag] = `‹${group.opener}›`;
      }
      Object.freeze(Object.setPrototypeOf(goal.openers, punctuators));
    } else {
      goal.closers = generateDefinitions.Empty;
    }

    // if (goal.punctuation)
    Object.freeze(Object.setPrototypeOf((goal.punctuation = {...goal.punctuation}), null));

    Object.freeze(goal.groups);
    Object.freeze(goal.tokens);
    Object.freeze(goal);
  }

  Object.freeze(punctuators);
  Object.freeze(goals);
  Object.freeze(groups);
  Object.freeze(identities);
  Object.freeze(symbols);

  return Object.freeze({groups, goals, identities, symbols, tokens});

  // if (keywords) {
  //   for (const [identity, list] of entries({})) {
  //     for (const keyword of list.split(/\s+/)) {
  //       keywords[keyword] = identity;
  //     }
  //   }

  //   keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  //   freeze(keywords);
  // }

  /**
   * Creates a symbolically mapped goal-specific token record
   *
   * @template {{}} T
   * @param {Goal} goal
   * @param {string} text
   * @param {type} type
   * @param {T} properties
   */
  function GoalSpecificTokenRecord(goal, text, type, properties) {
    const symbol = defineSymbol(`‹${goal.name} ${text}›`);
    return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
  }
};

generateDefinitions.Empty = Object.freeze({[Symbol.iterator]: (iterator => iterator).bind([][Symbol.iterator])});

export const NullGoal = Object.freeze(
  (generateDefinitions.NullGoal = {type: undefined, flatten: undefined, fold: undefined}),
);

export const FaultGoal = (generateDefinitions.FaultGoal = {symbol: defineSymbol('FaultGoal'), type: 'fault'});
generateDefinitions({goals: {[FaultGoal.symbol]: FaultGoal}});

Object.freeze(generateDefinitions);

/** @typedef {Record<string, string[]>} Keywords.Mappings */
/** @template {Keywords.Mappings} T @typedef {keyof T} Keywords.Mappings.Identities  */
/** @template {Keywords.Mappings} T @typedef {T[keyof T][number]} Keywords.Mappings.Keywords */
/** @template {Keywords.Mappings} T @typedef {Record<Keywords.Mappings.Keywords<T>, Keywords.Mappings.Identities<T>>} Keywords.Records.Keywords */
/** @template {Keywords.Mappings} T @typedef {Record<Keywords.Mappings.Identities<T>, ReadonlyArray<Keywords.Mappings.Keywords<T>>>} Keywords.Records.Identities */
/** @template {Keywords.Mappings} T @typedef {Iterable<Keywords.Mappings.Keywords<T>> & Readonly<Keywords.Records.Keywords<T>> & Readonly<Keywords.Records.Identities<T>>} Keywords.Records */

/** @template {Keywords.Mappings} T @param {T} mappings@returns {Keywords.Records<T>} */
export const Keywords = mappings => {
  const identities = /** @type {any} */ ({});
  const keywords = /** @type {any} */ ({...Keywords.prototype});

  for (const identity in mappings) {
    identities[identity] = Object.freeze([...mappings[identity]]);
    for (const keyword of mappings[identity]) {
      keywords[keyword] = identity;
    }
  }

  return Object.freeze(Object.setPrototypeOf(keywords, Object.freeze(identities)));
};

Keywords.prototype = {
  [Symbol.iterator]() {
    return Object.getOwnPropertyNames(this)[Symbol.iterator]();
  },
};

/** @type {(keywords: string) => string[]} */
Keywords.split = RegExp.prototype[Symbol.split].bind(/\W+/gu);

export const Construct = class Construct extends Array {
  constructor() {
    super(...arguments);
    this.text = arguments.length ? this.join(' ') : '';
    this.last = arguments.length ? this[this.length - 1] : '';
  }

  add(text) {
    this.length === 0 ? (this.text = text) : (this.text += ` ${text}`);
    super.push((this.last = text));
  }
  set(text) {
    this.previousText = this.text;
    text === '' || text == null
      ? ((this.last = this.text = ''), this.length === 0 || super.splice(0, this.length))
      : this.length === 0
      ? super.push((this.last = this.text = text))
      : super.splice(0, this.length, (this.last = this.text = text));
  }
  clone() {
    const clone = new Construct(...this);
    clone.text = this.text;
    clone.last = this.last;
    return clone;
  }
};

/**
 * @template {string} K
 * @param {RegExpRange.Factories<K>} factories
 */
export const Ranges = factories => {
  /** @type {PropertyDescriptorMap} */
  const descriptors = {
    ranges: {
      get() {
        return ranges;
      },
      enumerable: true,
      configurable: false,
    },
  };

  // TODO: Revisit once unicode classes are stable
  const safeRange = (strings, ...values) => {
    try {
      return RegExpRange.define(strings, ...values);
    } catch (exception) {}
  };

  for (const property in factories) {
    descriptors[property] = {
      get() {
        const value = factories[property](safeRange, ranges);
        if (value === undefined) throw new RangeError(`Failed to define: ${factories[property]}`);
        Object.defineProperty(ranges, property, {value, enumerable: true, configurable: false});
        return value;
      },
      enumerable: true,
      configurable: true,
    };
  }

  /** @type {{ranges: typeof ranges} & Record<K, RegExpRange>} */
  const ranges = Object.create(null, descriptors);

  return ranges;
};

/// Internal

const defaults = {
  mode: {createToken: TokenMatcher.createToken},
};

/** @typedef {typeof stats} ContextStats */
const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  nestedCaptureCount: 0,
  nestedContextCount: 0,
  nestedTokenCount: 0,
};

/// Ambient

/** @typedef {import('./types').Match} Match */
/** @typedef {import('./types').Groups} Groups */
/** @typedef {import('./types').Group} Group */
/** @typedef {import('./types').Goal} Goal */
/** @typedef {import('./types').Context} Context */
/** @typedef {import('./types').Contexts} Contexts */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Token} Token */
