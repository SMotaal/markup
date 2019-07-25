/// <reference path="./types.d.ts" />

import {countLineBreaks} from '../../tokenizer/lib/core.js';
import {Matcher} from './matcher.js';

export const {
  createTokenFromMatch,
  createMatcherInstance,
  // createString,
  createMatcherTokenizer,
  createMatcherMode,
} = (() => {
  const {
    RegExp,
    Object,
    Object: {assign, create, freeze, defineProperty, defineProperties, getOwnPropertyNames, setPrototypeOf},
    String,
  } = globalThis;

  // /** @typedef {RegExpConstructor['prototype']} Matcher */

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenizerState<T, U>} [state]
   * @returns {TokenMatcher<U>}
   */
  const createMatcherInstance = (matcher, state) =>
    defineProperty(
      ((state || (state = create(null))).matcher =
        (matcher && matcher instanceof RegExp && createMatcherClone(matcher)) || RegExp(matcher, 'g')),
      'state',
      {value: state},
    );

  /**
   * @template {Matcher} T
   * @template {T} U
   * @template {{}} V
   * @type {(matcher: T & V, instance?: U) => U & V}
   * @param {T} param0
   * @param {U} [param1]
   * @returns {U}
   */
  const createMatcherClone = ({constructor: {prototype}, source, flags, lastIndex, ...properties}, instance) => (
    (instance = assign(instance || RegExp(source, flags || 'g'), properties)),
    prototype && setPrototypeOf(instance, prototype),
    instance
  );

  /** @type {(value: any) => string} */
  const createString = String;

  /**
   * @type {<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>}
   * @param {MatchResult<MatchArray>} param0
   */
  const createTokenFromMatch = ({0: text, identity, capture, index}) => ({
    type: (identity && (identity.description || identity)) || 'text',
    text,
    lineBreaks: countLineBreaks(text),
    lineInset: (capture && capture.inset) || '',
    offset: index,
    capture,
  });

  const tokenizerProperties = Object.getOwnPropertyDescriptors(
    freeze(
      class Tokenizer {
        /** @template {Matcher} T @template {{}} U */
        *tokenize() {
          /** @type {Token<U>} */
          // let next;
          /** @type {{createToken: typeof createTokenFromMatch, initializeState: <V>(state: V) => V & TokenizerState<T, U>}} */
          const createToken = (this && this.createToken) || createTokenFromMatch;
          /** @type {string} */
          const string = createString(Object.keys({[arguments[0]]: 1})[0]);
          /** @type {TokenMatcher<U>} */
          const matcher = createMatcherInstance(this.matcher, assign(arguments[1] || {}, {sourceText: string}));
          /** @type {TokenizerState<T, U>} */
          const state = matcher.state;
          this.initializeState && this.initializeState(state);
          matcher.exec = matcher.exec;

          for (
            let match, capturedToken, retainedToken, index = 0;
            // BAIL on first failed/empty match
            ((match = matcher.exec(string)) !== null && match[0] !== '') ||
            //   BUT first yield a nextToken if present
            (retainedToken !== undefined && (yield retainedToken), (state.nextToken = undefined));

          ) {
            if ((capturedToken = createToken(match, state)) === undefined) continue;

            // HOLD back one grace token
            //   until createToken(…) !== undefined (ie new token)
            //   set the incremental token index for this token
            //   and keep it referenced directly on the state
            (state.nextToken = capturedToken).index = index++;

            //   THEN yield a previously held token
            if (retainedToken !== undefined) yield retainedToken;

            //   THEN finally clear the nextToken reference
            retainedToken = capturedToken;
            state.nextToken = undefined;
          }

          this.finalizeState && this.finalizeState(state);

          // console.log({...state});
        }
      }.prototype,
    ),
  );

  /**
   * @type { {<T extends Matcher, U extends {} = {}>(sourceText: string, initialState?: Partial<TokenizerState<undefined, U>): IterableIterator<Token<U>>} }
   */
  const createMatcherTokenizer = instance => defineProperties(instance, tokenizerProperties);

  /**
   * @param {Matcher} matcher
   * @param {any} [options]
   */
  const createMatcherMode = (matcher, options) => {
    const tokenizer = createMatcherTokenizer({
      createToken: createTokenFromMatch,
      /** @type {(state: {}) =>  void} */
      initializeState: undefined,
      finalizeState: undefined,
      matcher: freeze(createMatcherInstance(matcher)),
    });

    const mode = {syntax: 'matcher', tokenizer};
    options &&
      ({
        syntax: mode.syntax = mode.syntax,
        aliases: mode.aliases,
        preregister: mode.preregister,
        createToken: tokenizer.createToken = tokenizer.createToken,
        initializeState: tokenizer.initializeState,
        finalizeState: tokenizer.finalizeState,
        ...mode.overrides
      } = options);

    freeze(tokenizer);

    return mode;
  };

  Object.freeze(createTokenFromMatch);
  Object.freeze(createMatcherInstance);
  Object.freeze(createString);
  Object.freeze(createMatcherTokenizer);
  Object.freeze(createMatcherMode);

  return {createTokenFromMatch, createMatcherInstance, createString, createMatcherTokenizer, createMatcherMode};
})();

export const TokenMatcher = (() => {
  /**
   * Safely updates the match to reflect the captured identity.
   *
   * NOTE: fault always sets match.flatten to false
   *
   * @param {string} text - Text of the intended { type = "opener" } token
   * @param {State} state - Matcher state
   * @returns {undefined | string} - String when context is **not** open
   */
  const capture = (identity, match) => {
    match.capture[(match.identity = identity)] = match[0];
    (match.fault = identity === 'fault') && (match.flatten = false);
    return match;
  };

  /**
   * Safely mutates matcher state to open a new context.
   *
   * @param {string} text - Text of the intended { type = "opener" } token
   * @param {State} state - Matcher state
   * @returns {undefined | string} - String when context is **not** open
   */
  const open = (text, state) => {
    const {
      contexts,
      context: parentContext,
      context: {depth: index, goal: initialGoal},
      groups,
      initializeContext,
    } = state;
    const group = initialGoal.groups[text];

    if (!group) return initialGoal.type || 'sequence';
    groups.splice(index, groups.length, group);
    groups.closers.splice(index, groups.closers.length, group.closer);

    parentContext.contextCount++;

    const goal = group.goal === undefined ? initialGoal : group.goal;

    const nextContext = {
      id: `${parentContext.id} ${
        goal !== initialGoal ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}` : group[Symbol.toStringTag]
      }`,
      number: ++contexts.count,
      depth: index + 1,
      parentContext,
      goal,
      group,
      state,
    };

    typeof initializeContext === 'function' && initializeContext(nextContext);

    state.nextContext = contexts[index] = nextContext;
  };

  /**
   * Safely mutates matcher state to close the current context.
   *
   * @param {string} text - Text of the intended { type = "closer" } token
   * @param {State} state - Matcher state
   * @returns {undefined | string} - String when context is **not** closed
   */
  const close = (text, state) => {
    const groups = state.groups;
    const index = groups.closers.lastIndexOf(text);

    if (index === -1 || index !== groups.length - 1) return fault(text, state);

    groups.closers.splice(index, groups.closers.length);
    groups.splice(index, groups.length);
    state.nextContext = state.context.parentContext;
  };

  /**
   * Safely mutates matcher state to skip ahead.
   *
   * TODO: Finish implementing forward helper
   *
   * @param {string | RegExp} search
   * @param {Match} match
   * @param {State} state
   * @param {number} [delta]
   */
  const forward = (search, match, state, delta) => {
    if (typeof search === 'string' && search.length) {
      state.nextOffset = match.input.indexOf(search, match.index + match[0].length) + (0 + delta || 0);
    } else if (search != null && typeof search === 'object') {
      search.lastIndex = match.index + match[0].length;
      search.exec(match.input);
      state.nextOffset = search.lastIndex + (0 + delta || 0);
    } else {
      throw new TypeError(`forward invoked with an invalid search argument`);
    }
  };

  /**
   * @returns {'fault'}
   */
  const fault = (text, state) => {
    // console.warn(text, {...state});
    return 'fault';
  };

  class TokenMatcher extends Matcher {}

  Object.defineProperty(TokenMatcher, 'capture', {
    value: capture,
    enumerable: true,
    writable: false,
  });

  Object.defineProperty(TokenMatcher, 'open', {value: open, enumerable: true, writable: false});

  Object.defineProperty(TokenMatcher, 'close', {value: close, enumerable: true, writable: false});

  Object.defineProperty(TokenMatcher, 'forward', {
    value: forward,
    enumerable: true,
    writable: false,
  });

  Object.defineProperty(TokenMatcher, 'fault', {value: fault, enumerable: true, writable: false});

  Object.freeze(capture);
  Object.freeze(open);
  Object.freeze(close);
  Object.freeze(forward);
  Object.freeze(fault);
  Object.freeze(TokenMatcher);

  return TokenMatcher;
})();
