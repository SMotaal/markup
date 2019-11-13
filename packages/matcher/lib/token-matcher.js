// @ts-check
/// <reference path="./types.d.ts" />

import {countLineBreaks} from '../../tokenizer/lib/core.js';
import {Matcher} from './matcher.js';
import {TokenizerState} from './state.js';

export const TokenMatcher = (() => {
  /** @typedef {Object} State */

  /** @template  U */
  class TokenMatcher extends Matcher {
    /**
     * Safely updates the match to reflect the captured identity.
     *
     * NOTE: fault always sets match.flatten to false
     *
     * @template T @param {string} identity @param {T} match @returns {T}
     */
    static capture(identity, match) {
      // @ts-ignore
      match.capture[(match.identity = identity)] = match[0];
      // @ts-ignore
      (match.fault = identity === 'fault') && (match.flatten = false);
      return match;
    }

    /**
     * Safely mutates matcher state to open a new context.
     *
     * @template {State} S
     * @param {string} text - Text of the intended { type = "opener" } token
     * @param {S} state - Matcher state
     * @returns {undefined | string} - String when context is **not** open
     */
    static open(text, state) {
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
          goal !== initialGoal
            ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}`
            : group[Symbol.toStringTag]
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
    }

    /**
     * Safely mutates matcher state to close the current context.
     *
     * @template {State} S
     * @param {string} text - Text of the intended { type = "closer" } token
     * @param {S} state - Matcher state
     * @returns {undefined | string} - String when context is **not** closed
     */
    static close(text, state) {
      const groups = state.groups;
      const index = groups.closers.lastIndexOf(text);

      if (index === -1 || index !== groups.length - 1) return 'fault';

      groups.closers.splice(index, groups.closers.length);
      groups.splice(index, groups.length);
      state.nextContext = state.context.parentContext;
    }

    /**
     * Safely mutates matcher state to skip ahead.
     *
     * TODO: Finish implementing forward helper
     *
     * @template {State} S
     * @param {string | RegExp} search
     * @param {MatcherMatch} match
     * @param {S} state - Matcher state
     * @param {number | boolean} [delta]
     */
    static forward(search, match, state, delta) {
      if (typeof search === 'string' && search.length) {
        state.nextOffset =
          match.input.indexOf(search, match.index + match[0].length) + (0 + /** @type {number} */ (delta) || 0);
      } else if (search != null && typeof search === 'object') {
        // debugger;
        search.lastIndex = match.index + match[0].length;
        const matched = search.exec(match.input);
        // console.log(...matched, {matched});
        if (!matched || matched[1] !== undefined) {
          if (delta === false) return false;
          state.nextOffset = search.lastIndex;
          state.nextFault = true;
          return 'fault';
        } else {
          if (delta === false) return true;
          state.nextOffset = search.lastIndex + (0 + /** @type {number} */ (delta) || 0);
        }
      } else {
        throw new TypeError(`forward invoked with an invalid search argument`);
      }
    }

    /**
     * @param {Matcher} matcher
     * @param {any} [options]
     */
    static createMode(matcher, options) {
      const tokenizer = Object.defineProperties(
        {matcher: Object.freeze(TokenMatcher.create(matcher))},
        tokenizerPropertyDescriptors,
      );

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

      Object.freeze(tokenizer);

      return mode;
    }
  }

  /** @type {import('../experimental/common/types').Goal|symbol} */
  TokenMatcher.prototype.goal = undefined;

  class Tokenizer {
    constructor() {
      this.finalizeState = /** @type {<S extends TokenizerState>(state: S) => S} */ (undefined);
      this.initializeState = /** @type {<V, S extends TokenizerState>(state: S) => V & S} */ (undefined);
    }

    /** @type {<M extends MatcherArray, T extends {}, S extends TokenizerState>(init: MatcherMatch<M>, state?: S) => Token<T>} */
    createToken({0: text, identity, capture, index}, state) {
      // @ts-ignore
      return {
        // @ts-ignore
        type: (identity && (identity.description || identity)) || 'text',
        text,
        lineBreaks: countLineBreaks(text),
        lineInset: (capture && /** @type {any} */ (capture).inset) || '',
        lineOffset: index,
        capture,
      };
    }

    /**
     * @template {Matcher} T
     * @template {{}} U
     * @param {string} string
     * @param {U & Partial<Record<'USE_ITERATOR'|'USE_GENERATOR', boolean>>} properties
     */
    tokenize(
      string,
      properties,
      USE_ITERATOR = properties && 'USE_ITERATOR' in properties
        ? !!properties.USE_ITERATOR
        : properties && 'USE_GENERATOR' in properties
        ? !properties.USE_GENERATOR
        : !true,
    ) {
      return !!USE_ITERATOR ? this.TokenIterator(string, properties) : this.TokenGenerator(string, properties);
    }
    /**
     * @template {Matcher} T
     * @template {{}} U
     * @param {string} string
     * @param {U} properties
     */
    TokenIterator(string, properties) {
      const state = new TokenizerState({
        ...TokenizerState.defaults,
        ...((typeof properties === 'object' && properties) || undefined),
        source: string,
        initialize: this.initializeState && (() => void this.initializeState(state)),
        finalize: this.finalizeState && (() => void this.finalizeState(state)),
        createToken: match => this.createToken(match, state),
      });

      /** @type {TokenMatcher<U>} */
      const matcher = /** @type {any} */ (TokenMatcher.create(/** @type {any} */ (this).matcher, state));
      matcher.exec = matcher.exec;
      return state;
    }

    /** @template {Matcher} T @template {{}} U */
    *TokenGenerator() {
      /** @type {string} */
      const string = `${arguments[0]}`;
      /** @type {TokenMatcher<U>} */
      const matcher = /** @type {any} */ (TokenMatcher.create(/** @type {any} */ (this).matcher, arguments[1] || {}));

      const state = /** @type {TokenizerState<T, U>} */ (matcher.state);

      this.initializeState && this.initializeState(state);
      matcher.exec = matcher.exec;

      for (
        let match, capturedToken, retainedToken, index = 0;
        // BAIL on first failed/empty match
        ((match = matcher.exec(string)) !== null && match[0] !== '') ||
        //   BUT first yield a nextToken if present
        (retainedToken !== undefined && (yield retainedToken), (state.nextToken = undefined));

      ) {
        // @ts-ignore
        if ((capturedToken = this.createToken(match, state)) === undefined) continue;

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
    }
  }

  const tokenizerPropertyDescriptors = Object.getOwnPropertyDescriptors(
    Object.preventExtensions(
      Object.setPrototypeOf(Object.freeze(Object.setPrototypeOf(Tokenizer, null)).prototype, null),
    ),
  );

  delete tokenizerPropertyDescriptors.constructor;

  Object.freeze(TokenMatcher);

  return TokenMatcher;
})();
