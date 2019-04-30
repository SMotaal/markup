/** Node.js --experimental-modules --loader for versions 8.9.x - 11.x */
export const resolve = function resolver(specifier, referrer, resolve) {
  resolve.initialized ||
    (resolver.base || (resolver.base = `${new URL('../../', (resolver.url = import.meta.url))}`),
    (resolve.initialized = (resolve(import.meta.url, import.meta.url), true)));
  const resolved = resolve(specifier, referrer);
  resolved.format === 'cjs' &&
    resolved.url.startsWith(resolver.base) &&
    resolved.url.endsWith('.js') &&
    (resolved.format = 'esm');
  return resolved;
};
