//@ts-check
/// <reference path="./types.d.ts" />

// import {Matcher} from './matcher.js';
import {matchAll} from './helpers.js';

//
// TODO: Align generic type of Matches and Matcher.matchAll
//
//  <T extends MatcherMatch = MatcherExecArray | MatcherMatchArray>
//

export class Matches {
  /** @param {string} text @param {Matcher} matcher */
  constructor(text, matcher) {
    this.text = text;
    this.matcher = matcher;
  }

  get matches() {
    /** @type {Readonly<ArrayLike<MatcherMatch>>} */
    const value = Object.freeze(
      Object.setPrototypeOf(
        [
          //@ts-ignore
          ...matchAll(this.text, this.matcher),
        ],
        null,
      ),
    );
    Reflect.defineProperty(this, 'matches', {value, writable: false});
    return value;
  }

  get length() {
    return this.matches.length;
  }

  //@ts-ignore
  /** @returns {IterableIterator<T>} */
  [Symbol.iterator]() {}
}

{
  const ArrayPrototypeIterator = Function.call.bind(Array.prototype[Symbol.iterator]);

  Reflect.defineProperty(
    Matches.prototype,
    Symbol.iterator,
    Reflect.getOwnPropertyDescriptor(
      {
        [Symbol.iterator]() {
          //@ts-ignore
          return ArrayPrototypeIterator(this.matches);
        },
      },
      Symbol.iterator,
    ),
  );
}
