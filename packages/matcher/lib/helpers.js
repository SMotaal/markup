//@ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from './matcher.js';

export const {
  escape = (Matcher.escape = /** @type {<T>(source: T) => string} */ ((() => {
    const {replace} = Symbol;
    return source => /[\\^$*+?.()|[\]{}]/g[replace](source, '\\$&');
  })())),
  join,
  sequence,
  matchAll,
} = Matcher;
