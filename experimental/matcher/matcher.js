/// <reference path="./types.d.ts" />

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

          console.log({...state});
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
  const options = {};
  overrides &&
    ({
      syntax: mode.syntax = mode.syntax,
      syntax: options.syntax = mode.syntax,
      aliases: options.aliases,
      preregister: options.preregister,
      createToken: tokenizer.createToken = tokenizer.createToken,
      initializeState: tokenizer.initializeState,
      // tokenizer: tokenizer.tokenize = createTokenizer.bind(tokenizer, matcherInstance),
      ...overrides
    } = overrides);
  // const parser = new Parser({mode, tokenizer, url: import.meta.url});

  freeze(tokenizer);

  return (
    /**
     * @param {import('/markup/packages/tokenizer/lib/api').API} markup
     */
    async markup => {
      const parser = markup.parsers[0];

      options.preregister && options.preregister(parser);

      parser.register(mode, options);
      console.log(parser);
      return {...overrides};
    }
  );
};
