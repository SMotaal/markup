﻿//@ts-check
import {countLineBreaks} from '../../packages/tokenizer/lib/core.js';

/** @typedef {typeof stats} ContextStats */
const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  nestedCaptureCount: 0,
  nestedContextCount: 0,
  nestedTokenCount: 0,
};

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
    parentContext: undefined,
    goal: state.matcher.goal,
    group: undefined,
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
  // NOTE: don't forget to uncomment after debugging
  state.context = state.contexts = state.groups = undefined;

  // Output to console when necessary
  debug && (error ? warn : log)(`[tokenizer]: ${error || 'done'} — %O`, state);
};

/** @param {Match} match @param {State} state @returns {Token}*/
export const createToken = (match, state) => {
  let currentGoal,
    // goalName,
    currentGoalType,
    contextId,
    contextNumber,
    contextDepth,
    contextGroup,
    parentContext,
    tokenReference,
    tokenContext,
    nextToken,
    text,
    type,
    fault,
    punctuator,
    offset,
    lineInset,
    lineBreaks,
    isDelimiter,
    isComment,
    isWhitespace,
    flatten,
    fold,
    columnNumber,
    lineNumber,
    tokenNumber,
    captureNumber,
    hint;

  const {
    context: currentContext,
    nextContext,
    lineIndex,
    lineOffset,
    nextOffset,
    lastToken,
    lastTrivia,
    lastAtom,
  } = state;

  /* Capture */
  ({
    0: text,
    capture: {inset: lineInset},
    identity: type,
    flatten,
    fault,
    punctuator,
    index: offset,
  } = match);

  if (!text) return;

  ({
    id: contextId,
    number: contextNumber,
    depth: contextDepth,
    goal: currentGoal,
    group: contextGroup,
    parentContext,
  } = tokenContext = (type === 'opener' && nextContext) || currentContext);

  currentGoalType = currentGoal.type;

  nextOffset &&
    (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
    (state.matcher.lastIndex = nextOffset)));

  lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
  isDelimiter = type === 'closer' || type === 'opener';
  isWhitespace = !isDelimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

  (isComment = type === 'comment' || punctuator === 'comment')
    ? (type = 'comment')
    : type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

  if (lineBreaks) {
    state.lineIndex += lineBreaks;
    state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
  }

  /* Flattening / Token Folding */

  flatten === false || flatten === true || (flatten = !isDelimiter && currentGoal.flatten === true);

  captureNumber = ++tokenContext.captureCount;
  state.totalCaptureCount++;

  if (
    (fold = flatten) && // fold only if flatten is allowed
    lastToken != null &&
    ((lastToken.contextNumber === contextNumber && lastToken.fold === true) ||
      (type === 'closer' && flatten === true)) && // never fold across contexts
    (lastToken.type === type || (currentGoal.fold === true && (lastToken.type = currentGoalType)))
  ) {
    lastToken.captureCount++;
    lastToken.text += text;
    lineBreaks && (lastToken.lineBreaks += lineBreaks);
  } else {
    // The generator retains this new as state.nextToken
    //   which means tokenContext is state.nextTokenContext
    //   and the fact that we are returning a token here will
    //   yield the current state.nextToken so we need to also
    //   set state.lastTokenContext to match
    //
    //   TODO: Add parity tests for tokenizer's token/context states
    state.lastTokenContext = state.nextTokenContext;
    state.nextTokenContext = tokenContext;

    /* Token Creation */
    flatten = false;
    columnNumber = 1 + (offset - lineOffset || 0);
    lineNumber = 1 + (lineIndex || 0);

    tokenNumber = ++tokenContext.tokenCount;
    state.totalTokenCount++;

    // hint = `${(isDelimiter ? type : currentGoalType && `in-${currentGoalType}`) ||
    hint = `${
      currentGoalType
        ? isDelimiter && currentGoal.opener === text
          ? `${type}`
          : `in-${currentGoalType}`
        : isDelimiter
        ? type
        : ''
    }\n\n${contextId} #${tokenNumber}\n(${lineNumber}:${columnNumber})`;

    tokenReference = isWhitespace || isComment ? 'lastTrivia' : 'lastAtom';

    nextToken = tokenContext[tokenReference] = state[tokenReference] = tokenContext.lastToken = state.lastToken = {
      text,
      type,
      offset,
      punctuator,
      hint,
      lineOffset,
      lineBreaks,
      lineInset,
      columnNumber,
      lineNumber,
      captureNumber,
      captureCount: 1,
      tokenNumber,
      contextNumber,
      contextDepth,

      isWhitespace, // whitespace:
      isDelimiter, // delimiter:
      isComment, // comment:

      // FIXME: Nondescript
      fault,
      fold,
      flatten,

      goal: currentGoal,
      group: contextGroup,
      state,
      context: tokenContext,
    };
  }
  /* Context */
  !nextContext ||
    ((state.nextContext = undefined), nextContext === currentContext) ||
    ((state.lastContext = currentContext),
    currentContext === nextContext.parentContext
      ? (state.totalContextCount++,
        (nextContext.precedingAtom = lastAtom),
        (nextContext.precedingTrivia = lastTrivia),
        (nextContext.precedingToken = lastToken))
      : ((parentContext.nestedContextCount += currentContext.nestedContextCount + currentContext.contextCount),
        (parentContext.nestedCaptureCount += currentContext.nestedCaptureCount + currentContext.captureCount),
        (parentContext.nestedTokenCount += currentContext.nestedTokenCount + currentContext.tokenCount)),
    (state.context = nextContext));

  return nextToken;
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

export const generateDefinitions = ({groups, goals, identities, symbols, keywords, tokens}) => {
  const {[symbols.FaultGoal]: FaultGoal} = goals;

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
        group.description || (group.description = `${group.opener}…${group.closer}`);
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

  for (const [identity, list] of entries({})) {
    for (const keyword of list.split(/\s+/)) {
      keywords[keyword] = identity;
    }
  }

  keywords[Symbol.iterator] = Array.prototype[Symbol.iterator].bind(Object.getOwnPropertyNames(keywords));
  freeze(keywords);

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
    const symbol = Symbol(`‹${goal.name} ${text}›`);
    return (goal.tokens[text] = goal.tokens[symbol] = tokens[symbol] = {symbol, text, type, goal, ...properties});
  }
};

/**
 * @template {string} K
 * @template {string} I
 * @param {{[i in I]: K[]}} mappings
 */
export const Keywords = mappings => {
  /** @type {{[k in K]: I}} */
  //@ts-ignore
  const keywords = {};

  for (const identity in mappings) {
    for (const keyword of mappings[identity]) {
      keywords[keyword] = identity;
    }
  }
  return keywords;
};

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

/** @typedef {import('./types').Match} Match */
/** @typedef {import('./types').Groups} Groups */
/** @typedef {import('./types').Group} Group */
/** @typedef {import('./types').Goal} Goal */
/** @typedef {import('./types').Context} Context */
/** @typedef {import('./types').Contexts} Contexts */
/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Token} Token */
/** @typedef {Goal['type']} type */
/** @typedef {{symbol: symbol, text: string, type: type, goal?: Goal, group?: Group}} token */
