//@ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from './matcher.js';
export {DELIMITER, UNKNOWN} from './matcher.js';

/** Segmenter for sub-match captures */
export class Segmenter extends Matcher {
  /**
   * @param {MatcherPattern} pattern
   * @param {MatcherFlags} [flags]
   * @param {MatcherEntities} [entities]
   * @param {{}} [state]
   */
  constructor(pattern, flags, entities, state) {
    //@ts-ignore
    super(pattern, flags, entities, state);
    this.capture = this.capture;
  }
  /**
   * @template {MatcherMatch} T
   * @param {string} text
   * @param {number} capture
   * @param {T} match
   * @returns {T}
   */
  capture(text, capture, match) {
    if (capture === 0) return void (match.capture = {});
    if (text === undefined) return;
    const index = capture - 1;
    const {
      entities: {[index]: entity},
      state,
    } = this;
    typeof entity === 'function'
      ? ((match.entity = index), entity(text, capture, match, state))
      : entity == null ||
        // entity === INSET ||
        // entity === LOOKAHEAD ||
        // entity === Matcher.DELIMITER ||
        // entity === Matcher.UNKNOWN ||
        (match.entity !== undefined || ((match.identity = entity), (match.entity = index)),
        (match.capture[entity] = text));
  }

  /**
   * @param {string} source
   */
  exec(source) {
    /** @type {MatcherExecArray} */
    let match;

    // @ts-ignore
    match = super.exec(source);

    // @ts-ignore
    if (match === null) return null;

    // @ts-ignore
    match.matcher = this;
    match.capture = {};

    match &&
      (match.forEach(this.capture || Segmenter.prototype.capture, this),
      match.identity || (match.capture[this.UNKNOWN || Matcher.UNKNOWN] = match[0]));

    return match;
  }
}

export const {
  /** Identity for delimiter captures (like newlines) */
  INSET = (Segmenter.INSET = 'INSET'),
  /** Identity for unknown captures */
  LOOKAHEAD = (Segmenter.LOOKAHEAD = 'LOOKAHEAD'),
} = Segmenter;
