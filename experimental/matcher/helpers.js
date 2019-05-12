// / <reference path="../../../modules/matcher/types.d.ts" />
/// <reference path="./types.d.ts" />

export const {createTokenFromMatch, createMatcherInstance, createString, countLineBreaks} = (() => {
  const {
    RegExp,
    Object,
    Object: {create, assign, setPrototypeOf, defineProperty, defineProperties, getOwnPropertyDescriptors},
    String,
  } = globalThis;

  /** @typedef {RegExpConstructor['prototype']} Matcher */

  /** @type {<T extends {}, U extends string | symbol, V>(target: T, property: U, value: V) => T & {readonly [property: U]: V }} */
  const defineEnumerableConstant = (target, property, value) =>
    defineProperty(target, property, {value, writable: false, configurable: false, enumerable: true});

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenizerState<T, U>} [state]
   * @returns {TokenMatcher<U>}
   */
  const createMatcherInstance = (matcher, state) =>
    defineProperty(
      // (matcher = (matcher instanceof RegExp && createMatcherClone(matcher)) || RegExp(matcher, 'g')),
      // 'state',
      // defineEnumerableConstant(state || create(null), 'matcher', matcher),
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

  /** @type {(string: string, sequence: string , index?: number) => number} */
  const indexOf = Function.call.bind(String.prototype.indexOf);

  /** @type {(string: string) => number} */
  const countLineBreaks = text => {
    let breaks = 0;
    for (let index = -1; (index = indexOf(text, '\n', index + 1)) > -1; breaks++);
    return breaks;
  };

  /**
   * @type {<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>}
   * @param {MatchResult<MatchArray>} param0
   */
  const createTokenFromMatch = ({0: text, identity, capture, index}) => ({
    type: (identity && (identity.description || identity)) || 'text',
    text,
    breaks: countLineBreaks(text),
    inset: (capture && capture.inset) || '',
    offset: index,
    // hint: getOwnPropertyNames(capture).join(' '),
    // capture,
  });

  return {createTokenFromMatch, createMatcherInstance, createString, countLineBreaks};
})();

// /** @typedef {string | symbol} identity */

// /**
//  * @template {{}} T
//  * @typedef {T & {type: string, text: string, offset: number, breaks: number, inset?: text, hint?: string, capture?: MatchCapture}} Token
//  */

// /**
//  * @template {RegExp} T
//  * @template {{}} U
//  * @typedef {{matcher: T, sourceText?: string, lastToken?: Token<U>, previousToken?: Token<U>}} TokenizerState
//  */
// /**
//  * @template {RegExp} T
//  * @template {{}} U
//  * @typedef {{createToken?<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>, lastToken?: Token<U>, previousToken?: Token<U>}} Tokenizer
//  */

// /**
//  * @template {RegExp} T
//  * @template {{}} U
//  * @typedef {Matcher & {state: TokenizerState<this, U>}} TokenMatcher
//  */

// /** @typedef {RegExpMatchArray | RegExpExecArray} MatchArray */
// /** @typedef {import('/modules/matcher/matcher.js').Matcher} Matcher */
// /** @typedef {import('/modules/matcher/matcher.js').Matcher.Capture} MatchCapture */
// /** @template {MatchArray} T @typedef {import('/modules/matcher/matcher.js').Matcher.MatchResult<T>} MatchResult */
