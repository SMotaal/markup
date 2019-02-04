//@ts-check
/// <reference lib="esnext.asynciterable" />

const VOID = Symbol('[[Void]]');

/**
 * @template T
 * @typedef {Promise<T> | T} async
 */

/**
 * @template T
 * @typedef {{next(): async<IteratorResult<async<T>>>}} iterator
 */

/**
 * @template T
 * @typedef {iterator<T> | {[Symbol.iterator](): iterator<T>}  | {[Symbol.asyncIterator](): iterator<T>}} iterable
 */

/**
 * @template T, U
 * @param {iterable<T>} iterable
 * @param {(value: T) => U} ƒ
 */
export async function each(iterable, ƒ) {
  const iterator =
    (iterable && ('next' in iterable && typeof iterable.next === 'function' && iterable)) ||
    ((Symbol.asyncIterator in iterable && iterable[Symbol.asyncIterator]()) ||
      (Symbol.iterator in iterable && iterable[Symbol.iterator]()));
  try {
    if (iterator || typeof iterator.next === 'function') {
      let result, done;
      while (!done && (result = await iterator.next())) {
        await ƒ(await result.value);
        done = result.done;
      }
    }
  } finally {
    iterator &&
      iterable !== iterator &&
      'return' in iterator &&
      typeof iterator.return === 'function' &&
      iterator.return();
  }
}

// export async function next(iterator, previous, received, done) {
//   let result, value;
//   !previous || (await previous);
//   const next = done ? 'return' : 'next';
//   !(iterator && next in iterator && typeof iterator[next] === 'function') ||
//     !((result = received === VOID ? iterator[next]() : iterator[next](received)) && (result = await result)) ||
//     ('done' in result && (done = !!(await result.done)), 'value' in result && (value = await result.value));
//   return {value, done: !!done};
// }

// export const AsyncIterator = (() => {
//   const Done = Symbol('[[Done]]');
//   const Result = Symbol('[[Result]]');
//   const Iterator = Symbol('[[Iterator]]');
//   const DONE = Object.freeze(Object.seal({done: true, value: undefined}));
//   const VOID = Symbol('[[Void]]');
//   const EMPTY = [];
//   const reject = async reason => ({value: Promise.reject(reason), done: true});
//   const next = async (iterator, previous, received, done) => {
//     let result, value;
//     !previous || (await previous);
//     const next = done ? 'return' : 'next';
//     !(iterator && next in iterator && typeof iterator[next] === 'function') ||
//       !((result = received === VOID ? iterator[next]() : iterator[next](received)) && (result = await result)) ||
//       ('done' in result && (done = !!(await result.done)), 'value' in result && (value = await result.value));
//     return {value, done: !!done};
//   };

//   /**
//    * @template T
//    * @implements {AsyncIterableIterator<T>}
//    */
//   class AsyncIterator {
//     /** @param {IterableIterator<T> | AsyncIterableIterator<T>} [iterator] */
//     constructor(iterator) {
//       Object.defineProperty(this, Iterator, {
//         value:
//           (iterator &&
//             (iterator[Iterator] ||
//               (Symbol.iterator in iterator && iterator[Symbol.iterator]()) ||
//               (Symbol.asyncIterator in iterator && iterator[Symbol.asyncIterator]()))) ||
//           EMPTY[Symbol.iterator](),
//       });
//     }

//     [Symbol.asyncIterator]() {
//       return this;
//     }

//     /** @param {T} [value] @returns {Promise<IteratorResult<T>>} */
//     async next(value) {
//       let result;
//       return this[Done]
//         ? this[Result] || DONE
//         : ((this[Done] = (await (result = this[Result] = next(
//             this[Iterator],
//             this[Result],
//             arguments.length ? value : VOID,
//           ))).done),
//           result);
//     }

//     /**
//      * @param {any} [value]
//      * @returns {Promise<IteratorResult>}
//      */
//     async return(value) {
//       return this[Done]
//         ? this[Result] || DONE
//         : (this[Result] = next(this[Iterator], null, arguments.length ? value : VOID, (this[Done] = true)));
//     }

//     /**
//      * @param {any} error
//      * @returns {Promise<IteratorResult>}
//      */
//     async throw(error) {
//       return this[Done] ? this[Result] || DONE : ((this[Done] = true), (this[Result] = reject(error)));
//     }
//   }

//   return AsyncIterator;
// })();

// const x = new AsyncIterator([1]);
// const y = x[Symbol.asyncIterator]();

// export const async = {
//   each: async (iterable, ƒ) => {

//   }
// };

//  * @param {AsyncIterableIterator<T> | AsyncIterator<T>} iterable
