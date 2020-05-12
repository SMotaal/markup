//@ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from './matcher.js';

const RegExpClass = /^(?:\[(?=.*(?:[^\\](?:\\\\)*|)\]$)|)((?:\\.|[^\\\n\[\]]*)*)\]?$/;

class RegExpRange extends RegExp {
  /**
   * @param {string|RegExp} source
   * @param {string} [flags]
   */
  constructor(source, flags) {
    /** @type {string} */
    let range;

    range = (source && typeof source === 'object' && source instanceof RegExp
      ? (flags === undefined && (flags = source.flags), source.source)
      : (typeof source === 'string' ? source : (source = `${source || ''}`)).trim() &&
        (source = RegExpClass[Symbol.replace](source, '[$1]'))
    ).slice(1, -1);

    if (!range || !RegExpClass.test(range)) {
      throw TypeError(`Invalid Regular Expression class range: ${range}`);
    }

    typeof flags === 'string' || (flags = `${flags || ''}` || '');

    flags.includes('u') ||
      //@ts-ignore
      !(source.includes('\\p{') || source.includes('\\u')) ||
      (flags += 'u');

    //@ts-ignore
    super(source, flags);

    // this.arguments = [...arguments];

    Object.defineProperty(this, 'range', {value: range, enumerable: true, writable: false});

    Object.freeze(this);
  }

  /** @type {string} */
  //@ts-ignore
  get range() {
    return `^`;
  }

  toString() {
    return this.range;
  }

  /**
   * @template T
   * @param {TemplateStringsArray} strings
   * @param {... T} values
   */
  static define(strings, ...values) {
    let source = String.raw(strings, ...values);
    let flags;
    // @ts-ignore
    return (
      RegExpRange.ranges[source] ||
      (RegExpRange.ranges[source] = (flags = Matcher.flags(
        ...values.map(value => (value instanceof RegExpRange ? value : undefined)),
      ))
        ? new (this || RegExpRange)(source, flags)
        : new (this || RegExpRange)(source))
    );
  }
}

/** @type {{[name: string]: RegExpRange}} */
RegExpRange.ranges = {};

globalThis.RegExpRange = RegExpRange;

/**
 * @template {string} K
 * @typedef {{[k in K]: (range: typeof RegExpRange.define, ranges: RegExpRange.Ranges<K>) => RegExpRange}} RegExpRange.Factories
 */

/**
 * @template {string} K
 * @typedef {{[k in K]: RegExpRange}} RegExpRange.Ranges
 */

export {RegExpRange};
