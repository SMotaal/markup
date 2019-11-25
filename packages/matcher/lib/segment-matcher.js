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

  async debug(options) {
    const job = {options, ...options};
    try {
      job.timestamp = `?${encodeURIComponent(Date.now())}`;
      job.location =
        (typeof globalThis === 'object' &&
          globalThis &&
          globalThis.location != null &&
          typeof globalThis.location === 'object' &&
          globalThis.location &&
          globalThis.location.href) ||
        /\/(?:node_modules\/(?:@.+?\/|)|)(?:Markdown\/|)lib\/.*$/[Symbol.replace](import.meta.url, '/');
      if (job.specifier != null) {
        job.sourceText = null;
        job.url = new URL(job.specifier, job.location);
        job.response = await (job.request = fetch(job.url));
        if (!job.response.ok) throw Error(`Failed to fetch ${job.url}`);
        job.sourceText = await job.response.text();
      }
      job.sourceText === null ||
        /** @type {import('./debug.js')} */ (await import('./debug.js')).debugMatcher(
          this, // SegmentMatcher.prototype,
          job.sourceText,
          (job.debugging = {}),
        );
    } catch (exception) {
      throw (job.error = (exception.stack, exception));
    } finally {
      console.group('%o', job);
      if (job.error) console.warn(job.error);
      console.groupEnd();
    }
  }
}

export const {
  /** Identity for delimiter captures (like newlines) */
  INSET = (SegmentMatcher.INSET = SegmentMatcher.prototype.INSET = /** @type {MatcherIdentityString} */ ('INSET?')),
  /** Identity for unknown captures */
  LOOKAHEAD = (SegmentMatcher.LOOKAHEAD = SegmentMatcher.prototype.LOOKAHEAD =
    /** @type {MatcherIdentityString} */ ('LOOKAHEAD?')),
} = SegmentMatcher;

// await (SegmentMatcher.prototype.debug['implementation'] ||
//   (SegmentMatcher.prototype.debug['implementation'] = import(
//     // TODO: Find a better way to resolve matcher/lib/debug.js
//     '/markup/packages/matcher/lib/debug.js'
//   ).catch(exception => {
//     console.warn(exception);
//     return new Proxy(Object.seal(Object.freeze(() => {})), {
//       get() {
//         return arguments[0];
//       },
//       apply: Reflect.apply.bind(console.warn, null, [exception], undefined),
//     });
//   })))
