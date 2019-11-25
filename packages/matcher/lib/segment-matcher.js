//@ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from './matcher.js';
export {DELIMITER, UNKNOWN} from './matcher.js';

/** Segmenter for sub-match captures */
export class SegmentMatcher extends Matcher {
  /**
   * @param {MatcherPattern} pattern
   * @param {MatcherFlags} [flags]
   * @param {MatcherEntities} [entities]
   * @param {{}} [state]
   */
  constructor(pattern, flags, entities, state) {
    //@ts-ignore
    super(pattern, flags, entities, state);
    this.captureEntity = this.captureEntity;
  }
  /**
   * @template {MatcherMatch} T
   * @param {string} text
   * @param {number} capture
   * @param {T} match
   * @returns {T}
   */
  captureEntity(text, capture, match) {
    if (capture === 0) return void (match.capture = {});
    if (text === undefined) return;
    const index = capture - 1;
    const {
      entities: {[index]: entity, meta, identities},
      state,
    } = this;
    // entity === INSET ||
    // entity === LOOKAHEAD ||
    // entity === Matcher.DELIMITER ||
    // entity === Matcher.UNKNOWN ||
    // debugger;
    if (!entity) return;

    if (typeof entity === 'function') {
      match.entity = index;
      entity(text, capture, match, state);
      return;
    }

    if (meta.has(entity)) {
      // match.entity || (match.entity = index);
      match.meta = `${(match.meta && `${match.meta} `) || ''}${/** @type {string} */ (entity)}`;
    } else if (identities.has(entity) && match.identity == null) {
      match.entity = index;
      match.identity = entity;
    }
    match.capture[/** @type {MatcherNamedEntity} */ (entity)] = text;
  }

  /** @param {MatcherExecArray} match */
  capture(match) {
    if (match === null) return null;

    match.matcher = this;
    match.capture = {};

    match &&
      (match.forEach(this.captureEntity || SegmentMatcher.prototype.captureEntity, this),
      match.identity ||
        (match.capture[
          (/** @type {MatcherMatch} */(match)).identity = this.UNKNOWN || Matcher.UNKNOWN // prettier-ignore
        ] = match[0]));

    return match;
  }
}

export const {
  /** Identity for delimiter captures (like newlines) */
  INSET = (SegmentMatcher.INSET = 'INSET?'),
  /** Identity for unknown captures */
  LOOKAHEAD = (SegmentMatcher.LOOKAHEAD = 'LOOKAHEAD?'),
} = SegmentMatcher;
