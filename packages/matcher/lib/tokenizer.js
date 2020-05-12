// @ts-check
/// <reference path="./types.d.ts" />
import {countLineBreaks} from '../../tokenizer/lib/core.js';
import {TokenMatcher} from './token-matcher.js';
import {TokenizerState} from './state.js';

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
      // @ts-ignore
      lineBreaks: countLineBreaks(text),
      lineInset: (capture && /** @type {any} */ (capture).inset) || '',
      lineOffset: index,
      capture,
    };
  }

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @template V
   * @param {string} string
   * @param {U & Partial<Record<'USE_ITERATOR'|'USE_GENERATOR', boolean>>} properties
   * @param {V} [flags]
   */
  tokenize(string, properties, flags) {
    return this.TokenGenerator(string, properties);
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

Object.preventExtensions(Object.setPrototypeOf(Object.freeze(Object.setPrototypeOf(Tokenizer, null)).prototype, null));

export {Tokenizer};
