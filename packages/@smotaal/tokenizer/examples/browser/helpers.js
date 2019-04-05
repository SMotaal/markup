export const Tail = /\/?[#?].*$|\/?$/;
export const Head = /^(?:.*?\/(?:\/[^\/]+|libs|packages|node_modules|examples)(?=\/))?.*?(?=(?:\/[\w\.-]+)+(?:[?#.]|$))\//;

export const escape = source => /[\\^$*+?.()|[\]{}]/g[Symbol.replace](source, '\\$&');

export const Hash = (() => {
  const HASH = '#';
  const MODE = '!';
  const ITERATIONS = '*';
  const REPEATS = '**';
  const VARIANT = '@';
  const DEBUGGING = '!!';
  const Hash = new RegExp(
    String.raw`^${escape(HASH)}((?:https?:\/\/|[a-z]+:|[~]\/|[.]{0,2}\/|)[^#!*@]*)(?:
      (?:${escape(MODE)}([a-zA-Z]+)?)?
      (?:${escape(ITERATIONS)}(\d+)?)?
      (?:${escape(REPEATS)}(\d+))?
      .*?(?:${escape(VARIANT)}(\d+))?
      .*?(?:(${escape(DEBUGGING)}))?
    )$|`.replace(/^\s+|\n\s*|\s+$/g, ''),
    'i',
  );
  const parse = string => {
    let {0: hash, 1: specifier, 2: mode, 3: iterations, 4: repeats, 5: variant, 6: debugging} = Hash.exec(string);
    iterations = iterations >= 0 ? parseInt(iterations) : undefined;
    repeats = repeats >= 0 ? parseInt(repeats) : undefined;
    variant = variant >= 0 ? parseInt(variant) : undefined;
    debugging = debugging ? true : undefined;
    return {hash, specifier, mode, iterations, repeats, variant, debugging};
  };
  return Object.defineProperties(
    Hash,
    Object.getOwnPropertyDescriptors(Object.freeze({HASH, MODE, ITERATIONS, REPEATS, VARIANT, DEBUGGING, parse})),
  );
})();

export const baseURL = `${new URL(
  './',
  (typeof document === 'object' && document && 'documentURI' in document && document.documentURI) ||
    (typeof location === 'object' && location && 'href' in location && `${location}`) ||
    `file://${(typeof process === 'object' && process && process.cwd && process.cwd()) || '/'}`,
)}`;

export const Resolvers = scopes => {
  const resolvers = {};
  for (const scope of Object.getOwnPropertyNames(scopes)) {
    resolvers[scope] = Resolver(scopes[scope], {prefix: scope});
  }
  return resolvers;
};

export const Resolver = (scope, {base = baseURL, prefix} = {}) => {
  const resolver = Object.defineProperties(
    (specifier, referrer = resolver.scope) => {
      let returned;
      try {
        return (returned = resolve(specifier, referrer));
      } finally {
        returned === undefined && console.log({specifier, referrer, scope});
      }
    },
    {
      scope: {
        get: () => scope || undefined,
        set: url => void (scope = resolver(url, base) || undefined),
      },
    },
  );
  return (resolver.scope = scope), resolver;
};

export const resolve = (specifier, referrer) => `${referrer ? new URL(specifier, referrer) : new URL(specifier)}`;

export const rewrite = (specifier, {tail = '', head = ''} = {}) => (
  specifier &&
    (tail == null || (specifier = Tail[Symbol.replace](specifier, tail)),
    head == null || (specifier = Head[Symbol.replace](specifier, head))),
  specifier
);

rewrite.tail = (specifier, tail = '') => specifier && Tail[Symbol.replace](specifier, tail);
rewrite.head = (specifier, head = '') => specifier && Head[Symbol.replace](specifier, head);

export const frame = () => new Promise(requestAnimationFrame);
export const timeout = timeout => new Promise(resolve => setTimeout(resolve, timeout));
