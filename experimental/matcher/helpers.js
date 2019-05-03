/// <reference path="../../../modules/matcher/types.d.ts" />

export const {createTokenFromMatch, createMatcherInstance, createString, countLineBreaks} = (() => {
  const {
    RegExp,
    Object: {create, assign, setPrototypeOf, defineProperty, getOwnPropertyNames},
    String,
  } = globalThis;

  /** @template {RegExp} T @template {Object} U @param {T} matcher @param {U} [state] @returns {T & {state: U}} */
  const createMatcherInstance = (matcher, state) =>
    defineProperty((matcher instanceof RegExp && createMatcherClone(matcher)) || RegExp(matcher, 'g'), 'state', {
      value: state || create(null),
    });

  /** @type {<T extends RegExp & Partial<{constructor: {prototype: T}>>(matcher: T | RegExp, instance?: T) => T} */
  const createMatcherClone = ({constructor: {prototype}, source, flags, lastIndex, ...properties}, instance) => (
    (instance = assign(instance || RegExp(source, flags || g), properties)),
    prototype && setPrototypeOf(instance, prototype),
    instance
  );

  /** @param {any} source @returns {string} */
  const createString = String; // source => String(source);

  /** @type {(string: string, sequence: string , index?: number) => number */
  const indexOf = Function.call.bind(String.prototype.indexOf);

  /** @type {(string: string) => number} */
  const countLineBreaks = text => {
    let breaks = 0;
    for (let index = -1; (index = indexOf(text, '\n', index + 1)) > -1; breaks++);
    return breaks;
  };

  /** @typedef {RegExpMatchArray | RegExpExecArray} MatchArray*/
  /** @template {RegExpMatchArray | RegExpExecArray} T @typedef {import('/modules/matcher/matcher.js').Matcher.MatchResult<T>} MatchResult */

  /** @param {MatchResult<MatchArray>} param0 */
  const createTokenFromMatch = ({0: text, identity, capture, index}) => ({
    type: (identity && (identity.description || identity)) || 'text',
    text,
    breaks: countLineBreaks(text),
    offset: index,
    hint: getOwnPropertyNames(capture).join(' '),
    capture,
  });

  return {createTokenFromMatch, createMatcherInstance, createString, countLineBreaks};
})();
