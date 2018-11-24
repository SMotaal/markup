/// Helpers
export const Null = Object.freeze(Object.create(null));

export const raw = String.raw;

export const RegExpFlags = /^\/((?:g(?=[^g]*$)|i(?=[^i]*$)|m(?=[^m]*$)|s(?=[^s]*$)|u(?=[^u]*$)|y(?=[^y]*$))+)$|/;

/**
 * Create a sequence match expression from patterns.
 *
 * @param  {...Pattern} patterns
 */
export const sequence = (...patterns) => (
  patterns.length > 1 && (patterns.flags = RegExpFlags.exec(patterns[patterns.length - 1]).pop()) && (patterns[patterns.length - 1] = ''),
  new RegExp(Reflect.apply(raw, null, patterns.map(p => (p && p.source) || p || '')), patterns.flags || 'g')
);

/**
 * Create a maybeIdentifier test (ie [<first>][<other>]*) expression.
 *
 * @param  {Entity} first - Valid ^[<…>] entity
 * @param  {Entity} other - Valid [<…>]*$ entity
 * @param  {string} [flags] - RegExp flags (defaults to 'u')
 * @param  {unknown} [boundary]
 */
export const identifier = (first, other = first, flags = 'u', boundary = /yg/.test(flags) && '\\b') =>
  new RegExp(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

/**
 * Create a sequence pattern from patterns.
 *
 * @param  {...Pattern} patterns
 */
export const all = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

/// Symbols

export class Symbols extends Set {
  static from(...sources) {
    const Species = this || Symbols;
    const symbols = (sources.length && Species.split(sources)) || [];
    return new Species(symbols);
  }

  get(symbol) {
    if (this.has(symbol)) return symbol;
  }

  static split(...sources) {
    const Species = this || Symbols;
    const symbols = [];
    for (const source of sources.flat()) {
      source &&
        (typeof source === 'string'
          ? symbols.push(...source.split(/ +/))
          : Symbol.iterator in source && symbols.push(...Species.split(...source)));
    }
    return symbols;
  }

  toString() {
    debugger;
  }
}

{
  const {has} = Object.getOwnPropertyDescriptors(Set.prototype);
  // const {map} = Object.getOwnPropertyDescriptors(Array.prototype);
  // Object.defineProperties(Symbols.prototype, {includes: has, map});
  Object.defineProperties(Symbols.prototype, {includes: has});
}

/// Closures

export class Closure extends String {
  constructor(opener, closer = opener) {
    if (!opener || !closer) throw Error(`Cannot construct closure from "${opener}" … "${closer}"`);
    super(`${opener}…${closer}`);
    this.opener = opener;
    this.closer = closer;
  }
}

export class Closures extends Map {
  static from(...sources) {
    const Species = this || Closures;
    const closures = (sources.length && Species.split(sources)) || [];
    return new Species(closures);
  }
  static split(...sources) {
    const Species = this || Closures;
    const Member = Species.Element || Closure;
    const closures = [];
    for (const source of sources.flat()) {
      if (source) {
        switch (typeof source) {
          case 'object': {
            if (source instanceof Member) {
              closures.push([source.opener, source]);
            } else if (source instanceof Species) {
              closures.push(...source);
            }
            break;
          }
          case 'string': {
            for (const pair of source.split(/ *?([^ ]+…[^ ]+|[^ …]+) *?/)) {
              if (!pair) continue;
              const [opener, closer] = pair.split('…');
              const closure = new Member(opener, closer);
              closures.push([opener, closure]);
            }
            break;
          }
        }
      }
    }
    return closures;
  }

  toString() {
    debugger;
  }
}

{
  const {has} = Object.getOwnPropertyDescriptors(Map.prototype);
  Object.defineProperties(Closures.prototype, {includes: has});
}

// export const Symbols = Object.defineProperty(
//   source =>
//     (source &&
//       ((typeof source === 'string' && source.split(/ +/)) ||
//         (Symbol.iterator in source && [...source]))) ||
//     [],
//   'from',
//   {value: (...args) => [...new Set([].concat(...args.map(Symbols)))]},
// );
// export const Symbols = Object.defineProperty(source => Symbols.from(source), 'from', {
//   value: (...args) => Symbols.from(...args),
// });

// export const closures = string => {
//   const pairs = Symbols.from(string);
//   const array = new Array(pairs.size);
//   const entries = {};
//   array.pairs = pairs;
//   let i = 0;
//   for (const pair of pairs) {
//     const [opener, closer] = pair.split('…');
//     // array[(array[i++] = opener)] = {opener, closer};
//     entries[(array[i++] = opener)] = {opener, closer};
//   }
//   array.get = opener => entries[opener];
//   array.toString = () => string;
//   return array;
// };

// export const lines = string => string.split(/\n+/),
