//@ts-check
/// <reference path="./types.d.ts" />

import {MatcherState} from './state.js';

/** Matcher for composable matching */
export class Matcher extends RegExp {
  /**
   * @param {MatcherPattern} pattern
   * @param {MatcherFlags} [flags]
   * @param {MatcherEntities} [entities]
   * @param {{}} [state]
   */
  constructor(pattern, flags, entities, state) {
    //@ts-ignore
    super(pattern, flags);
    (pattern &&
      pattern.entities &&
      Symbol.iterator in pattern.entities &&
      ((!entities && (entities = pattern.entities)) || entities === pattern.entities)) ||
      Object.freeze(
        Object.assign((entities = (entities && Symbol.iterator in entities && [...entities]) || []), {
          flags,
          meta: Matcher.metaEntitiesFrom(entities),
          identities: Matcher.identityEntitiesFrom(entities),
        }),
      );

    /** @type {MatcherEntities} */
    this.entities = entities;
    this.state = state;
    this.exec = this.exec;
    this.capture = this.capture;

    ({DELIMITER: this.DELIMITER = Matcher.DELIMITER, UNKNOWN: this.UNKNOWN = Matcher.UNKNOWN} = new.target);
  }

  /** @param {MatcherExecArray} match */
  capture(match) {
    // @ts-ignore
    if (match === null) return null;

    // @ts-ignore
    match.matcher = this;
    match.capture = {};

    //@ts-ignore
    for (
      let i = 0, entity;
      match[++i] === undefined ||
      void (
        (entity = this.entities[(match.entity = i - 1)]) == null ||
        (typeof entity === 'function'
          ? entity(match[0], i, match, this.state)
          : (match.capture[(match.identity = entity)] = match[0]))
      );

    );

    return match;
  }

  /**
   * @param {string} source
   */
  exec(source) {
    const match = /** @type {MatcherExecArray} */ (super.exec(source));
    match == null || this.capture(match);
    return match;
  }

  /** @returns {entity is MatcherMetaEntity} */
  static isMetaEntity(entity) {
    return typeof entity === 'string' && entity.endsWith('?');
  }

  /** @returns {entity is MatcherIdentityEntity} */
  static isIdentityEntity(entity) {
    return typeof entity === 'string'
      ? entity !== '' && entity.trim() === entity && !entity.endsWith('?')
      : typeof entity === 'symbol';
  }

  static metaEntitiesFrom(entities) {
    return /** @type {MatcherEntitySet<MatcherMetaEntity>} */ (new Set([...entities].filter(Matcher.isMetaEntity)));
  }

  static identityEntitiesFrom(entities) {
    return /** @type {MatcherEntitySet<MatcherIdentityEntity>} */ (new Set(
      [...entities].filter(Matcher.isIdentityEntity),
    ));
  }

  /**
   * @param {MatcherPatternFactory} factory
   * @param {MatcherFlags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(factory, flags, properties) {
    /** @type {MatcherEntities} */
    const entities = [];
    entities.flags = '';
    const pattern = factory(entity => {
      if (entity !== null && entity instanceof Matcher) {
        entities.push(...entity.entities);

        !entity.flags || (entities.flags = entities.flags ? Matcher.flags(entities.flags, entity.flags) : entity.flags);

        return entity.source;
      } else {
        entities.push(((entity != null || undefined) && entity) || undefined);
      }
    });
    entities.meta = Matcher.metaEntitiesFrom(entities);
    entities.identities = Matcher.identityEntitiesFrom(entities);
    flags = Matcher.flags('g', flags == null ? pattern.flags : flags, entities.flags);
    const matcher = new ((this && (this.prototype === Matcher.prototype || this.prototype instanceof RegExp) && this) ||
      Matcher)(pattern, flags, entities);

    properties && Object.defineProperties(matcher, properties);

    return matcher;
  }

  static flags(...sources) {
    let flags, iterative, sourceFlags;
    flags = '';
    for (const source of sources) {
      sourceFlags =
        (!!source &&
          (typeof source === 'string'
            ? source
            : typeof source === 'object' &&
              typeof source.flags !== 'string' &&
              typeof source.source === 'string' &&
              source.flags)) ||
        undefined;
      if (!sourceFlags) continue;
      for (const flag of sourceFlags)
        (flag === 'g' || flag === 'y' ? iterative || !(iterative = true) : flags.includes(flag)) || (flags += flag);
    }
    return flags;
  }

  static get sequence() {
    const {raw} = String;
    const {replace} = Symbol;

    /**
     * @param {TemplateStringsArray} template
     * @param  {...any} spans
     * @returns {string}
     */
    const sequence = (template, ...spans) =>
      sequence.WHITESPACE[replace](raw(template, ...spans.map(sequence.span)), '');
    // const sequence = (template, ...spans) =>
    //   sequence.WHITESPACE[replace](sequence.COMMENTS[replace](raw(template, ...spans.map(sequence.span)), ''), '');

    /**
     * @param {any} value
     * @returns {string}
     */
    sequence.span = value =>
      (value &&
        // TODO: Don't coerce to string here?
        (typeof value !== 'symbol' && `${value}`)) ||
      '';

    sequence.WHITESPACE = /^\s+|\s*\n\s*|\s+$/g;
    // sequence.COMMENTS = /(?:^|\n)\s*\/\/.*(?=\n)|\n\s*\/\/.*(?:\n\s*)*$/g;

    Object.defineProperty(Matcher, 'sequence', {value: Object.freeze(sequence), enumerable: true, writable: false});
    return sequence;
  }

  static get join() {
    const {sequence} = this;

    const join = (...values) =>
      values
        .map(sequence.span)
        .filter(Boolean)
        .join('|');

    Object.defineProperty(Matcher, 'join', {value: Object.freeze(join), enumerable: true, writable: false});

    return join;
  }

  static get matchAll() {
    /** @template {RegExp} T @type {(string: MatcherText, matcher: T) => MatcherIterator<T> } */
    // const matchAll = (string, matcher) => new MatcherState(string, matcher);
    const matchAll = (() =>
      Function.call.bind(
        // String.prototype.matchAll || // TODO: Uncomment eventually
        {
          /**
           * @this {string}
           * @param {RegExp | string} pattern
           */
          *matchAll() {
            const matcher =
              arguments[0] &&
              (arguments[0] instanceof RegExp
                ? Object.setPrototypeOf(RegExp(arguments[0].source, arguments[0].flags || 'g'), arguments[0])
                : RegExp(arguments[0], 'g'));
            const string = String(this);

            if (!(matcher.flags.includes('g') || matcher.flags.includes('y'))) return void (yield matcher.exec(string));

            for (
              let match, lastIndex = -1;
              lastIndex <
              ((match = matcher.exec(string)) ? (lastIndex = matcher.lastIndex + (match[0].length === 0)) : lastIndex);
              yield match, matcher.lastIndex = lastIndex
            );
          },
        }.matchAll,
      ))();

    Object.defineProperty(Matcher, 'matchAll', {value: Object.freeze(matchAll), enumerable: true, writable: false});

    return matchAll;
  }

  /**
   * @template {Matcher} T
   * @template {T} U
   * @template {{}} V
   * @param {T & V} matcher
   * @param {U} [instance]
   * @returns {U & V}
   */
  static clone(matcher, instance) {
    const {
      constructor: {prototype},
      source,
      flags,
      lastIndex,
      ...properties
    } = matcher;
    const clone = /** @type {U & V} */ (Object.assign(
      instance ||
        (prototype && 'source' in prototype && 'flags' in prototype
          ? RegExp(source, flags || 'g')
          : RegExp(matcher, 'g')),
      properties,
    ));
    // prototype && Object.setPrototypeOf(clone, prototype);
    Object.setPrototypeOf(
      clone,
      prototype || (this && this !== Matcher && this.prototype instanceof Matcher ? this.prototype : Matcher.prototype),
    );
    return clone;
  }

  /**
   * @template {Matcher} T
   * @template {{}} U
   * @param {T} matcher
   * @param {TokenizerState<T, U>} [state]
   * @returns {TokenMatcher<U>}
   */
  static create(matcher, state) {
    /** @type {typeof Matcher} */
    const Species = !this || this === Matcher || !(this.prototype instanceof Matcher) ? Matcher : this;

    return Object.defineProperty(
      ((state || (state = Object.create(null))).matcher = /** @type {typeof Matcher} */ (matcher &&
      matcher instanceof RegExp &&
      matcher.constructor &&
      typeof /** @type {typeof Matcher} */ (matcher.constructor).clone !== 'function'
        ? matcher.constructor
        : Species === Matcher || typeof Species.clone !== 'function'
        ? Matcher
        : Species
      ).clone(matcher)),
      'state',
      {value: state},
    );
  }
}

// Well-known identities for meaningful debugging which are
//   Strings but could possible be changed to Symbols
//
//   TODO: Revisit Matcher.UNKOWN
//

export const {
  /** Identity for delimiter captures (like newlines) */
  DELIMITER = (Matcher.DELIMITER = 'DELIMITER?'),
  /** Identity for unknown captures */
  UNKNOWN = (Matcher.UNKNOWN = 'UNKNOWN?'),
} = Matcher;
