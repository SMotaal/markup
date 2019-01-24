/// Helpers
export const InspectSymbol = Symbol.for('nodejs.util.inspect.custom');

export const Null = Object.freeze(Object.create(null));

export const raw = String.raw;

export const RegExpFlags = /^\/((?:g(?=[^g]*$)|i(?=[^i]*$)|m(?=[^m]*$)|s(?=[^s]*$)|u(?=[^u]*$)|y(?=[^y]*$))+)$|/;

/**
 * Create a sequence match expression from patterns.
 *
 * @param  {...Pattern} patterns
 */
export const sequence = (...patterns) => (
  patterns.length > 1 &&
    (patterns.flags = RegExpFlags.exec(patterns[patterns.length - 1]).pop()) &&
    (patterns[patterns.length - 1] = ''),
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
    const symbols = (sources.length && Species.split(...sources)) || [];
    return new Species(symbols);
  }

  static split(...sources) {
    const Species = this || Symbols;
    const symbols = [];
    for (const source of sources.flat()) {
      source &&
        (typeof source === 'string'
          ? symbols.push(...source.split(/ +/))
          : Symbol.iterator in source
          ? symbols.push(...Species.split(...source))
          : source['(symbols)'] && typeof source['(symbols)'] === 'string'
          ? symbols.push(...Species.split(source['(symbols)']))
          : null);
    }
    return symbols;
  }

  static inspect(symbol, depth, {stylize = String, compact = false} = {}) {
    const type = typeof symbol;
    return `${stylize(
      type === 'symbol'
        ? `Symbol(${symbol.description || ''})`
        : type === 'string'
        ? JSON.stringify(symbol).slice(1, -1)
        : `${symbol}`,
      type,
    )}`;
  }

  get includes() {
    Object.defineProperty(Symbols.prototype, 'includes', Object.getOwnPropertyDescriptor(Set.prototype, 'has'));
    return this.has;
  }
  set includes(value) {
    this.includes = (this.includes, value);
  }

  get(symbol) {
    if (this.has(symbol)) return symbol;
  }

  [InspectSymbol](depth, {stylize = String, compact = false} = {}) {
    try {
      const depth = arguments[0] + 1;
      const options = arguments[1];
      let Species = (this && this.constructor) || Symbols;
      const {inspect = (Species = Closures).inspect} = Species;
      return `${(this && this.constructor && this.constructor.name) || 'Symbols'} ‹${Array.from(this.values())
        .map(symbol => Species.inspect(symbol, depth, options))
        .join('|')}›`;
    } catch (exception) {
      return super.toString(this);
    }
  }
}
/// Closures

export class Closure extends String {
  constructor(opener, closer = opener) {
    if (!opener || !closer) throw Error(`Cannot construct closure from "${opener}" … "${closer}"`);
    super(`${opener}…${closer}`);
    this.opener = opener;
    this.closer = closer;
  }

  [InspectSymbol](depth, {stylize = String, compact = false} = {}) {
    try {
      const depth = arguments[0] + 1;
      const options = arguments[1];
      return `${(this && this.constructor && this.constructor.name) || 'Closure'} ‹${Closures.inspect(this)}›`;
    } catch (exception) {
      return `${this}`;
    }
  }
}

export class Closures extends Map {
  static get splitter() {
    Object.defineProperty(Closures, 'splitter', {value: / *?([^ ]+…[^ ]+|[^ …]+) *?/});
  }

  static from(...sources) {
    const Species = this || Closures;
    const closures = (sources.length && Species.split(...sources)) || [];
    return new Species(closures);
  }
  static split(...sources) {
    const Species = this || Closures;
    const Member = Species.Element || Closure;
    const closures = [];
    for (const source of sources.flat()) {
      if (!source) continue;
      switch (typeof source) {
        case 'object':
          source instanceof Member
            ? closures.push([source.opener, source])
            : source instanceof Species
            ? closures.push(...source)
            : source['(closures)'] && typeof source['(closures)'] === 'string'
            ? closures.push(...Closures.split(source['(closures)']))
            : null;
          break;
        case 'string': {
          for (const pair of source.split(Species.splitter || Closures.splitter)) {
            if (!pair) continue;
            const [opener, closer] = pair.split('…');
            const closure = new Member(opener, closer);
            closures.push([opener, closure]);
          }
          break;
        }
      }
    }
    return closures;
  }

  static inspect(closure, depth, {stylize = String, compact = false} = {}) {
    let opener, openerType, closer, closerType;
    return closure && 'opener' in closure && 'closer' in closure
      ? `${stylize(
          (openerType = typeof (opener = closure.opener)) === 'string' ? JSON.stringify(opener).slice(1, -1) : opener,
          openerType,
        )}\u{25CC}${stylize(
          (closerType = typeof (closer = closure.closer)) === 'string' ? JSON.stringify(closer).slice(1, -1) : closer,
          closerType,
        )}`
      : stylize(`${closure}`, typeof closure);
  }

  get includes() {
    Object.defineProperty(Closures.prototype, 'includes', Object.getOwnPropertyDescriptor(Map.prototype, 'has'));
    return this.has;
  }

  set includes(value) {
    this.includes = (this.includes, value);
  }

  [InspectSymbol](depth, {stylize = String, compact = false} = {}) {
    try {
      const depth = arguments[0] + 1;
      const options = arguments[1];
      let Species = (this && this.constructor) || Closures;
      const {inspect = (Species = Closures).inspect} = Species;
      return `${(this && this.constructor && this.constructor.name) || 'Closures'} ‹${Array.from(this.values())
        .map(closure => Species.inspect(closure, depth, options))
        .join('|')}›`;
    } catch (exception) {
      return super.toString(this);
    }
  }
}

/// TRAVERSING

export const previousTextFrom = (token, matcher) => {
  const text = [];
  if (matcher != null) {
    if (matcher.test)
      do token.text && text.push(token.text), (token = token.previous);
      while (!token.text || !matcher.test(token.text));
    else if (matcher.includes)
      do token.text && text.push(token.text), (token = token.previous);
      while (!token.text || !matcher.includes(token.text));
    text.length && text.reverse();
  }
  return text.join('');
};

/// INDENTS

export const indenter = (indenting, tabs = 2) => {
  let source = indenting;
  const indent = new RegExp(raw`(?:\t|${' '.repeat(tabs)})`, 'g');
  const space = indent.source;
  source = source.replace(/\\?(?=[\(\)\:\?\[\]])/g, '\\');
  const [, lead, tail] = /^(\s*.*?)(\s*?)$/.exec(source);
  return new RegExp(`^${lead.replace(indent, space)}(?:${tail.replace(indent, `${space}?`)})?`, 'm');
};
