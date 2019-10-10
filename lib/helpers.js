//@ts-check
/// Helpers
export const raw = String.raw;

/**
 * Create a sequence match expression from patterns.
 *
 * @param  {(Partial<RegExp> & Partial<string>)[]} patterns
 */
export const sequence = (...patterns) =>
  new RegExp(Reflect.apply(raw, null, patterns.map(p => (p && p.source) || p || '')), 'g');

/**
 * Create a maybeIdentifier test (ie [<first>][<other>]*) expression.
 *
 * @param  {string} first - Valid ^[<…>] entity
 * @param  {string} other - Valid [<…>]*$ entity
 * @param  {string} [flags] - RegExp flags (defaults to 'u')
 * @param  {unknown} [boundary]
 */
export const identifier = (first, other = first, flags = 'u', boundary = /yg/.test(flags) && '\\b') =>
  new RegExp(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

/**
 * Create a sequence pattern from patterns.
 *
 * @param  {(Partial<RegExp> & Partial<string>)[]} patterns
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
}

Object.defineProperties(Symbols.prototype, {
  includes: Object.getOwnPropertyDescriptor(Set.prototype, 'has'),
  map: Object.getOwnPropertyDescriptor(Array.prototype, 'map'),
});

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
    const closures = [];
    for (const source of sources.flat()) {
      if (source) {
        switch (typeof source) {
          case 'object': {
            if (source instanceof Closure) {
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
              const closure = new Closure(opener, closer);
              closures.push([opener, closure]);
            }
            break;
          }
        }
      }
    }
    return closures;
  }
}

Object.defineProperties(Closures.prototype, {includes: Object.getOwnPropertyDescriptor(Map.prototype, 'has')});
