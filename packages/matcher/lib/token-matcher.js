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
     * @param {string} opener - Text of the intended { type = "opener" } token
     * @param {S} state - Matcher state
     * @returns {undefined | string} - String when context is **not** open
     */
    static open(opener, state) {
      const {
        context: parentContext,
        context: {
          depth: index,
          goal: initialGoal,
          goal: {
            groups: {[opener]: group},
          },
        },
      } = state;

      if (!group) return initialGoal.type || 'sequence';
      state.groups.splice(index, state.groups.length, group);
      state.groups.closers.splice(index, state.groups.closers.length, group.closer);

      parentContext.contextCount++;

      const goal = group.goal === undefined ? initialGoal : group.goal;
      const forward = state.currentMatch != null && goal.spans != null && goal.spans[opener] != null;

      if (forward) {
        if (
          this.forward(
            goal.spans[opener],
            state,
            // DONE: fix deltas for forwards expressions
            // typeof goal.spans[text] === 'string' ? undefined : false,
          ) === 'fault'
        )
          return 'fault';

        // if (goal.type) state.currentMatch.format = goal.type;
        // if (match[match.format] = state.nextContext.goal.type || 'comment')
      }

      const nextContext = {
        id: `${parentContext.id} ${
          goal !== initialGoal
            ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}`
            : group[Symbol.toStringTag]
        }`,
        number: ++state.contexts.count,
        depth: index + 1,
        parentContext,
        goal,
        group,
        state,
      };

      typeof state.initializeContext === 'function' && state.initializeContext(nextContext);

      state.nextContext = state.contexts[index] = nextContext;
    }

    /**
     * Safely ensures matcher state can open a new context.
     *
     * @template {State} S
     * @param {string} opener - Text of the intended { type = "opener" } token
     * @param {S} state - Matcher state
     * @returns {boolean}
     */
    static canOpen(opener, state) {
      // const upperCase = text.toUpperCase();
      return /** @type {boolean} */ (state.context.goal.openers != null &&
        state.context.goal.openers[opener] === true &&
        (state.context.goal.spans == null ||
          state.context.goal.spans[opener] == null ||
          // Check if conditional span faults
          this.lookAhead(state.context.goal.spans[opener], state)));
    }
    /**
     * Safely ensures matcher state can open a new context.
     *
     * @template {State} S
     * @param {string} closer - Text of the intended { type = "opener" } token
     * @param {S} state - Matcher state
     * @returns {boolean}
     */
    static canClose(closer, state) {
      // const upperCase = text.toUpperCase();
      return /** @type {boolean} */ (state.context.group.closer === closer ||
        (state.context.goal.closers != null && state.context.goal.closers[closer] === true));
    }

    /**
     * Safely mutates matcher state to close the current context.
     *
     * @template {State} S
     * @param {string} closer - Text of the intended { type = "closer" } token
     * @param {S} state - Matcher state
     * @returns {undefined | string} - String when context is **not** closed
     */
    static close(closer, state) {
      // const groups = state.groups;
      const index = state.groups.closers.lastIndexOf(closer);

      if (index === -1 || index !== state.groups.length - 1) return 'fault';

      state.groups.closers.splice(index, state.groups.closers.length);
      state.groups.splice(index, state.groups.length);
      state.nextContext = state.context.parentContext;
    }

    /**
     * Safely mutates matcher state to skip ahead.
     *
     * TODO: Finish implementing forward helper
     *
     * @template {State} S
     * @param {string | RegExp} search
     * @param {S} state - Matcher state
     */
    static lookAhead(search, state) {
      return this.forward(search, state, null);
    }
    /**
     * Safely mutates matcher state to skip ahead.
     *
     * TODO: Finish implementing forward helper
     *
     * @template {State} S
     * @param {string | RegExp} search
     * @param {S} state - Matcher state
     * @param {number | boolean | null} [delta]
     */
    static forward(search, state, delta) {
      if (typeof search === 'string' && search.length) {
        if (delta === null)
          return (
            state.currentMatch.input.slice(
              state.currentMatch.index + state.currentMatch[0].length,
              state.currentMatch.index + state.currentMatch[0].length + search.length,
            ) === search
          );
        state.nextOffset =
          state.currentMatch.input.indexOf(search, state.currentMatch.index + state.currentMatch[0].length) +
          (0 + /** @type {number} */ (delta) || 0);
      } else if (search != null && typeof search === 'object') {
        search.lastIndex = state.currentMatch.index + state.currentMatch[0].length;
        const matched = search.exec(state.currentMatch.input);
        // console.log(...matched, {matched});
        if (!matched || matched[1] !== undefined) {
          if (delta === null) return false;
          state.nextOffset = search.lastIndex;
          state.nextFault = true;
          return 'fault';
        } else {
          if (delta === null) return true;
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

  /**
   * @template {State} T
   * @param {string} text
   * @param {number} capture
   * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
   * @param {T} [state]
   */
  TokenMatcher.Opener = (text, capture, match, state) => {
    match.upperCase = text.toUpperCase();
    match.format = 'punctuator';
    TokenMatcher.capture(
      state.context.goal.punctuators != null && state.context.goal.punctuators[match.upperCase] === true
        ? (match.punctuator =
            (state.context.goal.punctuation && state.context.goal.punctuation[match.upperCase]) || 'combinator')
        : TokenMatcher.canOpen(match.upperCase, state)
        ? TokenMatcher.open(match.upperCase, state) ||
          ((match.punctuator =
            (state.context.goal.punctuation && state.context.goal.punctuation[match.upperCase]) ||
            state.context.goal.type),
          'opener')
        : // If it is passive sequence we keep only on character
          (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
          state.context.goal.type),
      match,
    );
  };

  /**
   * @template {State} T
   * @param {string} text
   * @param {number} capture
   * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
   * @param {T} [state]
   */
  TokenMatcher.Closer = (text, capture, match, state) => {
    match.upperCase = text.toUpperCase();
    match.format = 'punctuator';
    TokenMatcher.capture(
      state.context.goal.punctuators && state.context.goal.punctuators[text] === true
        ? (match.punctuator = 'combinator')
        : TokenMatcher.canClose(match.upperCase, state)
        ? TokenMatcher.close(match.upperCase, state) ||
          ((match.punctuator =
            (state.context.goal.punctuation && state.context.goal.punctuation[text]) || state.context.goal.type),
          'closer')
        : state.context.goal.type,
      match,
    );
  };

  /**
   * @template {State} T
   * @param {string} text
   * @param {number} capture
   * @param {MatcherMatch & {format?: string, punctuator?: string, flatten?: boolean}} match
   * @param {T} [state]
   */
  TokenMatcher.Quote = (text, capture, match, state) => {
    match.format = 'punctuator';
    TokenMatcher.capture(
      state.context.goal.punctuation[text] === 'quote' && TokenMatcher.canOpen(text, state)
        ? TokenMatcher.open(text, state) ||
            ((match.punctuator =
              (state.nextContext.goal.punctuation && state.nextContext.goal.punctuation[text]) ||
              state.nextContext.goal.type ||
              'quote'),
            'opener')
        : state.context.group.closer === text && TokenMatcher.canClose(text, state)
        ? TokenMatcher.close(text, state) || ((match.punctuator = state.context.goal.type || 'quote'), 'closer')
        : state.context.goal.type || 'quote',
      match,
    );
  };

  /**
   * @template {State} T
   * @param {string} text
   * @param {number} capture
   * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
   * @param {T} [state]
   */
  TokenMatcher.Whitespace = (text, capture, match, state) => {
    match.format = 'whitespace';
    TokenMatcher.capture(
      state.context.goal.type || (match.flatten = state.lineOffset !== match.index) ? 'whitespace' : 'inset',
      match,
    );
  };
  /**
   * @template {State} T
   * @param {string} text
   * @param {number} capture
   * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
   * @param {T} [state]
   */
  TokenMatcher.Break = (text, capture, match, state) => {
    match.format = 'whitespace';
    TokenMatcher.capture(
      (state.context.group != null && state.context.group.closer === '\n' && TokenMatcher.close(text, state)) ||
        // NOTE: ‹break› takes precedence over ‹closer›
        state.context.goal.punctuation['\n'] ||
        'break',
      match,
    );
    match.flatten = false;
  };

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
