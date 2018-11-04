#!/usr/bin/env node --experimental-modules --loader ./index.mjs

/// Initialize
import.meta.url.endsWith('#initialize') &&
  import('./node').then(() => import('./benchmarks/benchmark.js'));
  // import('./node').then(() => import('./lib/markup.spec.js'));

/// Loader
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
};


[
  '',
  '\'',
]
