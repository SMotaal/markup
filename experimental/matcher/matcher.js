/// <reference path="./types.d.ts" />

import {Parser} from '/markup/packages/tokenizer/lib/parser.js';
import {createTokenFromMatch, createMatcherInstance, createString} from './helpers.js';

/**
 * @type { {<T extends Matcher, U extends {} = {}>(sourceText: string, initialState?: Partial<TokenizerState<undefined, U>): IterableIterator<Token<U>>} }
 */
const createTokenizer = (() => {
  /** @type {ObjectConstructor} */
  const Object = globalThis.Object;
  const {freeze, assign, defineProperties} = Object;
  const properties = Object.getOwnPropertyDescriptors(
    freeze(
      class Tokenizer {
        /**
         * @template {Matcher} T
         * @template {{}} U
         */
        *tokenize() {
          'use strict';
          /** @type {Token<U>} */
          // let next;
          /** @type {{createToken: typeof createTokenFromMatch, initializeState: <V>(state: V) => V & TokenizerState<T, U>}} */
          const createToken = (this && this.createToken) || createTokenFromMatch;
          /** @type {string} */
          const string = createString(arguments[0]);
          /** @type {TokenMatcher<U>} */
          const matcher = createMatcherInstance(this.matcher, assign(arguments[1] || {}, {sourceText: string}));
          /** @type {TokenizerState<T, U>} */
          const state = matcher.state;
          this.initializeState && this.initializeState(state);
          matcher.exec = matcher.exec; //.bind(matcher);
          // freeze(matcher);
          // console.log(this, {string, matcher, state}, [...arguments]);
          for (
            let match, token, next, index = 0;
            // Abort on first failed match
            (match = matcher.exec(string)) ||
            //   but first yield a lastToken if present
            void (next && (yield next));
            // We hold back one grace token
            (token = createToken(match, state)) &&
            //  until createToken(…) !== undefined (ie new token)
            //  set the incremental token index for this lastToken
            (((state.lastToken = token).index = index++),
            //  and finally push the previous lastToken and yield
            next && (yield next),
            (next = token))
          );

          // setTimeout(() => console.log(state.contexts));
          // next && (yield next);
        }
      }.prototype,
    ),
  );
  return instance => defineProperties(instance, properties);
})();

export default //
/**
 * @param {import('/modules/matcher/matcher.js').Matcher} matcher
 * @param {any} [overrides]
 */
(matcher, overrides) => {
  /** @type {ObjectConstructor} */
  const {freeze} = globalThis.Object;

  const tokenizer = createTokenizer({
    createToken: createTokenFromMatch,
    /** @type {(state: {}) =>  void} */
    initializeState: undefined,
    matcher: freeze(createMatcherInstance(matcher)),
  });

  // tokenizer.tokenize = createTokenizer.bind(tokenizer, matcherInstance);
  const mode = {syntax: 'matcher', tokenizer};
  overrides &&
    ({
      syntax: mode.syntax = mode.syntax,
      createToken: tokenizer.createToken = tokenizer.createToken,
      initializeState: tokenizer.initializeState,
      // tokenizer: tokenizer.tokenize = createTokenizer.bind(tokenizer, matcherInstance),
      ...overrides
    } = overrides);
  const parser = new Parser({mode, tokenizer, url: import.meta.url});

  freeze(tokenizer);

  return (
    /**
     * @param {import('/markup/packages/tokenizer/lib/api').API} markup
     */
    async markup => {
      // console.log({matcher, overrides, parser});
      markup.parsers.splice(0, markup.parsers.length, parser);
      return {...overrides};
    }
  );
};
