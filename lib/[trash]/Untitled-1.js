
// // export class Renderer extends Transformer {}

// // constructor: {
// //   get() {
// //     return this;
// //   },
// //   set(constructor) {},
// // },
// // const writable = true;

// // create(null, (({name, toString}) => ({name, toString}))(getOwnPropertyDescriptors(Class))),

// // for (const [test, push = result] of (scope => {
// //   let tests;
// //   with (new Proxy(scope, {
// //     has: () => true,
// //   })) {
// //     tests = [
// //       [({Class}) => (constructed = new Class(A++))],
// //       [({Class}) => (initialized = Class.initialize(A++))],
// //       [({constructed}) => (subinitialized = constructed.initialize(A++))],
// //       [({initialized}) => (reinitialized = initialized.initialize(A++))],
// //     ];
// //   }

// //   return tests;
// // })(results)) {
// //   let result;
// //   try {
// //     result = test(results);
// //   } catch (exception) {
// //     result = exception;
// //   } finally {
// //     push && push(result);
// //   }
// // }
// // const result = (ƒ, result) => ($[ƒ] = result);

// // export const defaults = (transform.defaults = {
// //   transformer: Transformer,
// // });

// // export async function* transform(tokens, options, defaults = transform.defaults) {
// //   for await (const token of tokens) {
// //     const {type = 'text', text, punctuator, breaks} = token;

// //     // const tokenRenderer =
// //     //   (punctuator && (tokenRenderers[punctuator] || tokenRenderers.operator)) ||
// //     //   (type && tokenRenderers[type]) ||
// //     //   (text && tokenRenderers.text);
// //     // const element = tokenRenderer && tokenRenderer(text, token);
// //     // element && (yield element);
// //   }
// // }
// // const {prototype, toString, name} = Class;
// // create(null, {toString: {value: Class.toString}}),
// // (next = () => ({done: tests.done, value: tests.test}) = tests.next(result))();

// // const GeneratorFunction = getPrototypeOf(
// //   getPrototypeOf(function*() {
// //     'use strict';
// //     yield arguments;
// //   }),
// // ).constructor;

// const {getPrototypeOf} = {}.constructor;
// const GeneratorFunction = getPrototypeOf(getPrototypeOf(this.tests())).constructor;

// this.tests.prototype = class extends GeneratorFunction {
//   next(result = this.result) {
//     return (
//       (({done: this.done, value: this.current} = super.next(result)),
//       (this.result = undefined)),
//       this.done
//     );
//   }
// }.prototype;


// tests.next = class extends Object.getPrototypeOf(tests).constructor {
//   next() {
//     return super.next(this, result);
//   }
// }.prototype.next;
