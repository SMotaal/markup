//@ts-check
/// <reference path="./types.d.ts" />

// const trace = /** @type {[function, any[]][]} */ [];

class Matcher extends RegExp {
  /**
   * @template T
   * @param {Matcher.Pattern} pattern
   * @param {Matcher.Flags} [flags]
   * @param {Matcher.Entities} [entities]
   * @param {T} [state]
   */
  constructor(pattern, flags, entities, state) {
    // trace.push([new.target, [...arguments]]);
    //@ts-ignore
    super(pattern, flags);
    // Object.assign(this, RegExp.prototype, new.target.prototype);
    (pattern &&
      pattern.entities &&
      Symbol.iterator in pattern.entities &&
      ((!entities && (entities = pattern.entities)) || entities === pattern.entities)) ||
      Object.freeze((entities = (entities && Symbol.iterator in entities && [...entities]) || []));
    /** @type {MatcherEntities} */
    this.entities = entities;
    /** @type {T} */
    this.state = state;
    this.capture = this.capture;
    this.exec = this.exec;
    // this.test = this.test;
    ({
      // LOOKAHEAD: this.LOOKAHEAD = Matcher.LOOKAHEAD,
      // INSET: this.INSET = Matcher.INSET,
      // OUTSET: this.OUTSET = Matcher.OUTSET,
      DELIMITER: this.DELIMITER = Matcher.DELIMITER,
      UNKNOWN: this.UNKNOWN = Matcher.UNKNOWN,
    } = new.target);
  }

  /**
   * @param {string} source
   * @returns {MatcherMatchResult}
   */
  exec(source) {
    /** @type {MatcherMatchArray} */
    const match = super.exec(source);

    // @ts-ignore
    if (match === null) return null;

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
    // @ts-ignore
    return match;
  }

  /**
   * @param {Matcher.PatternFactory} factory
   * @param {Matcher.Flags} [flags]
   * @param {PropertyDescriptorMap} [properties]
   */
  static define(factory, flags, properties) {
    /** @type {MatcherEntities} */
    const entities = [];
    entities.flags = '';
    // const pattern = factory(entity => void entities.push(((entity != null || undefined) && entity) || undefined));
    const pattern = factory(entity => {
      if (entity !== null && entity instanceof Matcher) {
        entities.push(...entity.entities);

        !entity.flags || (entities.flags = entities.flags ? Matcher.flags(entities.flags, entity.flags) : entity.flags);

        return entity.source;
      } else {
        entities.push(((entity != null || undefined) && entity) || undefined);
      }
    });
    flags = Matcher.flags('g', flags == null ? pattern.flags : flags, entities.flags);
    const matcher = new ((this && (this.prototype === Matcher.prototype || this.prototype instanceof RegExp) && this) ||
      Matcher)(pattern, flags, entities);

    properties && Object.defineProperties(matcher, properties);

    return matcher;
  }

  static flags(...sources) {
    let flags = '',
      iterative;
    for (const source of sources) {
      if (!source || (typeof source !== 'string' && typeof source.flags !== 'string')) continue;
      for (const flag of source.flags || source)
        (flag === 'g' || flag === 'y' ? iterative || !(iterative = true) : flags.includes(flag)) || (flags += flag);
    }
    // console.log('%o: ', flags, ...sources);
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
}

export const {
  // INSET = (Matcher.INSET = /* Symbol.for */ 'INSET'),
  // OUTSET = (Matcher.OUTSET = /* Symbol.for */ 'OUTSET'),
  DELIMITER = (Matcher.DELIMITER = /* Symbol.for */ 'DELIMITER'),
  UNKNOWN = (Matcher.UNKNOWN = /* Symbol.for */ 'UNKNOWN'),
  // LOOKAHEAD = (Matcher.LOOKAHEAD = /* Symbol.for */ 'LOOKAHEAD'),
  escape = (Matcher.escape = /** @type {<T>(source: T) => string} */ ((() => {
    const {replace} = Symbol;
    return source => /[\\^$*+?.()|[\]{}]/g[replace](source, '\\$&');
  })())),
  sequence,
  matchAll = (Matcher.matchAll =
    /**
     * @template {RegExp} T
     * @type {(string: Matcher.Text, matcher: T) => Matcher.Iterator<T> }
     */
    //@ts-ignore
    (() =>
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
      ))()),
} = Matcher;

/** @typedef {MatcherFlags} Matcher.Flags */
/** @typedef {MatcherText} Matcher.Text */
/** @typedef {MatcherOperator} Matcher.Operator */
/** @typedef {MatcherIdentity} Matcher.Identity */
/** @typedef {MatcherEntity} Matcher.Entity */
/** @typedef {MatcherCapture} Matcher.Capture */
/** @typedef {MatcherEntityFactory} Matcher.EntityFactory */
/** @typedef {MatcherPatternFactory} Matcher.PatternFactory */
/** @typedef {MatcherPattern} Matcher.Pattern */
/** @typedef {MatcherEntities} Matcher.Entities */
/** @template {RegExpMatchArray | RegExpExecArray} T @typedef {MatcherMatchArray} Matcher.MatchArray<T> */
/** @template {RegExpMatchArray | RegExpExecArray} T @typedef {MatcherMatchResult} Matcher.MatchResult<T> */
/** @template {RegExp} T @typedef {MatcherIterator} Matcher.Iterator<T> */

export {Matcher};
