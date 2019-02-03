/// Loader
/** Node.js ESM loader resolve hook */
export const resolve = function resolver(specifier, referrer, resolve) {
  resolve.initialized ||
    (resolver.base || (resolver.base = `${new URL('..', (resolver.url = import.meta.url))}`),
    (resolve.initialized = (resolve(import.meta.url, import.meta.url), true)));
  const resolved = resolve(specifier, referrer);
  resolved.format === 'cjs' &&
    resolved.url.startsWith(resolver.base) &&
    resolved.url.endsWith('.js') &&
    (resolved.format = 'esm');
  return resolved;
};

// import * as loader from './loader.mjs';

// {
//   const {base, initialized} = loader.resolve;
//   console.log({base, initialized});
// }
