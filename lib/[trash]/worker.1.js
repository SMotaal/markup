/// <reference lib="dom" />
/// <reference lib="webworker" />
/// <reference types="@types/node" />

import './markup.spec.js';

// import markup from './markup.js';

// async function test(
//   sources = [['<html/>', {sourceType: 'html'}], ['export default "js";', {sourceType: 'es'}]],
// ) {
//   await markup.ready;
//   for (const [source, options] of sources) {
//     const fragment = await markup.render(source, options);
//     const json = JSON.parse(JSON.stringify(fragment));
//     const text = String(fragment);
//     const logs = [...fragment.logs];
//     const job = {source, options, json, text, logs};
//     console.info(Object.defineProperty(job, 'fragment', {get: () => fragment}));
//   }
// }

// test();

// (async context => {
//   /** @type {{scope: LexicalScope, self: BrowserContext, global: NodeContext}} */
//   const {
//     self,
//     global,
//     scope = (context.scope =
//       self || global || Object.create(null, {[Symbol.toStringTag]: {value: 'UnknownScope'}})),
//   } = context;

//   const inBrowser = 'function' === typeof self.postMessage;
//   const inWindow = inBrowser && 'object' === typeof self.document;
//   const inNode = 'object' === typeof global.process;
//   const inWorker = (inBrowser && !inWindow) || (inNode && false);

//   /** @type {LexicalScope} */
//   const {
//     console: {warn, log} = context.console,
//     // navigator = self && self.addEventListener && self.navigator,
//     document = 'object' === typeof self.document && self.document,
//     process = 'object' === typeof global.process && global.process,
//     Worker,
//   } = scope;

//   log({context, scope: {log, warn, document, process, Worker}});

//   /**
//    * TODO: Node.js Worker - inNode && !inBrowser && await bootstrapNode();
//    */
//   async function bootstrapNode() {
//     try {
//       const {isMainThread, Worker, parentPort, workerData} = await import('worker_threads');
//       isMainThread ? (scope.Worker = Worker) : (scope.parentPort = parentPort);
//     } catch (exception) {
//       console.warn(exception);
//     }
//   }
// })({
//   scope: ('object' === typeof this && this) || undefined,
//   self: 'object' === typeof self && self === (self || 0).self && self,
//   global: 'object' === typeof global && global === (global || 0).global && global,
//   console:
//     ('object' === typeof console && 'function' === typeof (console || 0).log && console) ||
//     undefined,
// });

// /**
//  * CONTEXT
//  * @typedef {WindowOrWorkerGlobalScope} BrowserContext
//  * @typedef {NodeJS.Global} NodeContext
//  * SCOPE
//  * @typedef {{console: Console}} Globals
//  * @typedef {{document: Document, Worker: typeof Worker}} WindowGlobals
//  * @typedef {Worker & WindowGlobals & BrowserContext} BrowserGlobals
//  * @typedef {{process: NodeJS.Process}} NodeGlobals
//  * @typedef {Partial<Globals & BrowserGlobals & NodeGlobals>} LexicalScope
//  */

// // `console.info('worker.js - ${new Date().toLocaleString()}: %o', {sources, markups, jsons})`;

// // // const supportsMessage = scope && 'onmessage' in scope && isFunction[typeof scope.postMessage];

// // const imports = (id, then) => {
// //   const promise = imports[`[${id}]`] || (imports[`[${id}]`] = import(id));
// //   return ((then && promise.then(then)) || promise).catch(warn); // error => {error}
// // };
