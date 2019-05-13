﻿export const Tail = /\/?[#?].*$|\/?$/;
export const Head = /^(?:.*?\/(?:\/[^\/]+|libs|packages|node_modules|examples)(?=\/))?.*?(?=(?:\/[\w\.-]+)+(?:[?#.]|$))\//;

export const escape = RegExp.escape || (source => /[\\^$*+?.()|[\]{}]/g[Symbol.replace](source, '\\$&'));

export const sequence = (...args) =>
  Reflect.apply(String.raw, null, args.map((v = '') => v)).replace(/^\s+|\n\s*|\s+$/g, '');
// .replace(/^\s+|\s+\/\/\s+.*$\n?|\n\s*|\s+$/gm, '');

export const Hash = (() => {
  const symbols = {HASH: '#', MODE: '!', ITERATIONS: '*', REPEATS: '**', VARIANT: '@', ANCHOR: '#', DEBUGGING: '!!'};

  const Hash = ((HASH, MODE, ITERATIONS, REPEATS, VARIANT, ANCHOR, DEBUGGING, SYMBOL) =>
    new RegExp(
      sequence`
        ^(?:${HASH}
          (
            (?:${void 'scope'}https?:\/\/|[a-z]+:|[~]\/|[.]{0,2}\/|)
            (?:${void 'entry'}
              (?:${void 'base'}
                [^\s${SYMBOL}\/]*
                (?:
                  @[-_a-z][-_.\w]+\/|
                  [^\/]+\/|
                  \/
                )*
              )?
              [^${SYMBOL}]*
            )
          )
          (?${/* parameters */ ':'}
            (?=.*${MODE}([a-zA-Z]+)|)
            (?=.*${ITERATIONS}(\d+)|)
            (?=.*${REPEATS}(\d+)|)
            (?=.*${VARIANT}(\d+)|)
            (?=.*${ANCHOR}([^\s${SYMBOL}]+)|)
            (?=.*(${DEBUGGING})|)
            (?:${MODE}\2|${ITERATIONS}\3|${REPEATS}\4|${VARIANT}\5|${ANCHOR}\6|\7)*
          |)
        |)(.*?)$`,
      'iu',
    ))(...[...Object.values(symbols), [...new Set([...Object.values(symbols).join('')])].sort().join('')].map(escape));

  const parse = string => {
    let parsed, matched;
    try {
      matched = Hash.exec(string);

      let [hash, specifier, mode, iterations, repeats, variant, anchor, debugging, invalid] = matched;

      iterations = iterations >= 0 ? parseInt(iterations) : undefined;
      repeats = repeats >= 0 ? parseInt(repeats) : undefined;
      variant = variant >= 0 ? parseInt(variant) : undefined;
      debugging = debugging ? true : undefined;

      return (parsed = {hash, specifier, mode, iterations, repeats, variant, anchor, debugging, invalid});
    } finally {
      parsed && (parsed[Symbol.toStringTag] = 'Details');
      console.log('Hash ‹%o›  — %O', string, parsed); // , Hash
    }
  };

  return Object.defineProperties(Hash, Object.getOwnPropertyDescriptors(Object.freeze({...symbols, parse})));
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
        return (returned = resolveURL(specifier, referrer));
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

export const resolveURL = (specifier, referrer) => `${referrer ? new URL(specifier, referrer) : new URL(specifier)}`;

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
