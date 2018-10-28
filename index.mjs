#!/usr/bin/env node --experimental-modules --loader ./index.mjs

async function bootstrap() {
  global.fetch || (await polyfillFetch());
  const markup = await import('./lib/markup.js');
  await markup.ready;

  {
    const sources = [
      ['<html/>', {sourceType: 'html'}],
      ['export default "js";', {sourceType: 'es'}],
    ];

    const markups = await Promise.all(sources.map(args => markup.render(...args)));

    const jsons = JSON.parse(JSON.stringify(markups));
    console.info('worker.js: %o', {sources, markups, jsons});
  }
}

/// Interoperability

/** Bare-metal shim for global.fetch */
async function polyfillFetch(test = false) {
  await import('https').then(
    https =>
      (global.fetch = (...args) =>
        new Promise((resolve, reject) => {
          https
            .get(...args, response => {
              let body = '';
              response.text = async () => body;
              response.setEncoding('utf8');
              response.on('data', chunk => (body += chunk));
              response.on('end', () => resolve(response));
            })
            .on('error', reject);
          // return request;
        })),
  );

  test &&
    fetch((test.length && test) || (test = 'https://www.google.com/humans.txt'))
      .then(async response => response.text())
      .then(text => console.log('fetch(%o).text() => %o', test, typeof text === 'string'))
      .catch(console.warn);

  return fetch;
}

/** Node.js ESM loader resolve hook */
export const resolve = async function resolver(specifier, referrer, resolve) {
  resolver.base || (resolver.base = `${new URL('.', (resolver.url = import.meta.url))}`);
  const resolved = resolve(specifier, referrer);
  (resolved.format === 'cjs' &&
    resolved.url.startsWith(resolver.base) &&
    (resolved.format = 'esm')) ||
    (resolved.url === resolver.url &&
      (resolver.initialized || (resolved.url += resolver.initialized = '#initialize')));
  // console.log({resolved, ...resolver});
  return resolved;
}

/// Initialize

import.meta.url.endsWith('#initialize') && bootstrap();


// const unicode = await import('./lib/markup-unicode.js');
// const parser = await import('./lib/markup-parser.js');
// const dom = await import('./lib/markup-dom.js');
// console.log({parser, dom, unicode});
// (await import('./lib/markup-unicode.js')).Unicode.initialize();
