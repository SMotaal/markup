const markup = (function (exports) {
  'use strict';

  // @ts-check
  const applyEntitiesMixin = (() => {
    const entities = Object.freeze({
      extractCodePoint: Object.freeze(
        /** @type {(source: any, index: number) => number} */
        (Function.call.bind(''.charCodeAt)),
      ),
      replaceEntities: Object.freeze(
        /** @type {(source: any, replacer: string|Function) => string} */
        (RegExp.prototype[Symbol.replace].bind(/[\u00A0-\u9999<>\&]/g)),
      ),
      encodeEntities: Object.freeze(
        /** @type {(source: any) => string} */
        source => entities.replaceEntities(source, entities.encodeEntity),
      ),
      encodeEntity: Object.freeze(
        /** @type {(source: any) => string} */
        source => `&#${entities.extractCodePoint(source, 0)};`,
      ),
    });

    return Object.freeze(
      /**
       * @template {{}} T
       * @param {T} Pseudom
       * @return {T & typeof entities}
       */
      Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(entities)),
    );
  })();

  // @ts-check
  const applyEndowmentsMixin = (() => {
    const endowments = Object.freeze({
      fixClassInheritance: Object.freeze(
        /**
         * @template T, U
         * @param {(new () => T & U)} Class
         * @param {(new () => U) | null | undefined} Super
         * @param {Pick<typeof globalThis, 'Object'>} endowments
         */
        (Class, Super, endowments = globalThis) => {
          endowments.Object.setPrototypeOf(
            Class.prototype,
            Super === null ? null : Super ? Super.prototype : endowments.Object.prototype,
          );

          endowments.Object.setPrototypeOf(Class, Super == null ? endowments.Object : Super);

          return Class;
        },
      ),
      checkPrimordialEndowments: Object.freeze(
        /**
         * @template {Pick<typeof globalThis, 'Object' | U>} T
         * @template {keyof typeof globalThis} U
         * @param {{[k in keyof T]?: T[k] & {__proto__: object}}} endowments
         * @param {U[]} primordials
         */
        (endowments, ...primordials) => {
          for (const endowment of `Object,${primordials}`.replace(/^,Object|(,\w+)(?=.*?\1)/g, '').split(',')) {
            if (
              endowment === 'Object'
                ? !(
                    typeof endowments[endowment] === 'function' &&
                    typeof endowments[endowment].prototype === 'object' &&
                    endowments[endowment].prototype !== null &&
                    endowments[endowment].__proto__ &&
                    endowments[endowment].__proto__.__proto__ === endowments.Object.prototype
                  )
                : endowment in endowments &&
                  !(
                    typeof endowments[endowment] === 'function' &&
                    endowments[endowment].prototype != null &&
                    // typeof endowments[endowment].prototype === 'object' &&
                    endowments[endowment].__proto__ === endowments.Object.__proto__ &&
                    endowments[endowment].prototype.__proto__ === endowments.Object.prototype
                  )
            )
              throw `Error: createPseudoDOM invoked with an invalid ‹${endowment}› endowment.`;
          }
        },
      ),
    });

    return Object.freeze(
      /**
       * @template {{}} T
       * @param {T} Pseudom
       * @return {T & typeof endowments}
       */
      Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(endowments)),
    );
  })();

  // @ts-check
  const applyQueriesMixin = (() => {
    const queries = Object.freeze({
      querySelector: Object.freeze(
        /**
         * @param {Element | DocumentFragment} scope
         * @param {string} selector
         */
        (scope, selector) => {},
      ),
      querySelectorAll: Object.freeze(
        /**
         * @param {Element | DocumentFragment} scope
         * @param {string} selector
         */
        (scope, selector) => {},
      ),
    });

    return Object.freeze(
      /**
       * @template {{}} T
       * @param {T} Pseudom
       * @return {T & typeof queries}
       */
      Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(queries)),
    );
  })();

  // @ts-check

  const {
    Pseudom,
    Pseudom: {encodeEntity, encodeEntities},
  } = {Pseudom: Object.freeze(applyQueriesMixin(applyEntitiesMixin(applyEndowmentsMixin(class Pseudom {}))))};

  /// Helpers
  const InspectSymbol = Symbol.for('nodejs.util.inspect.custom');

  const Null = Object.freeze(Object.create(null));

  const raw = String.raw;

  const RegExpFlags = /^\/((?:g(?=[^g]*$)|i(?=[^i]*$)|m(?=[^m]*$)|s(?=[^s]*$)|u(?=[^u]*$)|y(?=[^y]*$))+)$|/;

  class SequenceExpression extends RegExp {}

  const {
    escape = (SequenceExpression.escape = /** @type {<T>(source: T) => string} */ ((() => {
      const {replace} = Symbol;
      return source => /[\\^$*+?.()|[\]{}]/g[replace](source, '\\$&');
    })())),
  } = SequenceExpression;

  /**
   * Create a sequence match expression from patterns.
   *
   * @type  {{(strings: TemplateStringsArray, ... patterns: pattern[]): sequence, (...patterns: pattern[]): sequence}}
   */
  const sequence = (...patterns) => (
    patterns.length > 1 &&
      (patterns.flags = RegExpFlags.exec(patterns[patterns.length - 1]).pop()) &&
      (patterns[patterns.length - 1] = ''),
    new SequenceExpression(Reflect.apply(raw, null, patterns.map(p => (p && p.source) || p || '')), patterns.flags || 'g')
  );

  class IdentifierExpression extends RegExp {}

  /**
   * Create a maybeIdentifier test (ie [<first>][<other>]*) expression.
   *
   * @type {{(first: pattern, other: pattern, flags?: string, boundary?: unknown): pattern.identifier}}
   */
  const identifier = (first, other = first, flags = 'u', boundary = /yg/.test(flags) && '\\b') =>
    new IdentifierExpression(`${boundary || '^'}[${first}][${other}]*${boundary || '$'}`, flags);

  /**
   * Create a sequence pattern from patterns.
   *
   * @param  {...Pattern} patterns
   */
  const all = (...patterns) => patterns.map(p => (p && p.exec ? p.source : p)).join('|');

  /// Symbols

  class Symbols extends Set {
    static from(...sources) {
      const Species = this || Symbols;
      const symbols = (sources.length && Species.split(...sources)) || [];
      return new Species(symbols);
    }

    static split(...sources) {
      const Species = this || Symbols;
      const symbols = [];
      // TODO: Replace with sources.flat() for non-legacy
      for (const source of [].concat(...sources)) {
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

  class Closure extends String {
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

  class Closures extends Map {
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
      // TODO: Replace with sources.flat() for non-legacy
      for (const source of [].concat(...sources)) {
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

  const previousTextFrom = (token, matcher) => {
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

  const indenter = (indenting, tabs = 2) => {
    let source = indenting;
    const indent = new RegExp(raw`(?:\t|${' '.repeat(tabs)})`, 'g');
    const space = indent.source;
    source = source.replace(/\\?(?=[\(\)\:\?\[\]])/g, '\\');
    const [, lead, tail] = /^(\s*.*?)(\s*?)$/.exec(source);
    return new RegExp(`^${lead.replace(indent, space)}(?:${tail.replace(indent, `${space}?`)})?`, 'm');
  };

  /** @typedef {string | RegExp} pattern */
  /** @typedef {SequenceExpression} sequence */
  /** @typedef {IdentifierExpression} pattern.identifier */

  const patterns = {
    /** Basic latin Keyword like symbol (inteded to be extended) */
    // maybeKeyword: /^[a-z]+$/i,
  };

  /** Entities used to construct patterns. */
  const entities = {
    es: {
      IdentifierStart: raw`_$\p{ID_Start}`,
      IdentifierPart: raw`_$\u200c\u200d\p{ID_Continue}\u034f`,
    },
  };

  /** Interoperability (for some browsers)  TODO: Simplify */
  (Ranges => {
    const transforms = [];

    if (!supports(raw`\p{ID_Start}`, 'u')) {
      const UnicodePropertyEscapes = /\\p{ *(\w+) *}/g;
      UnicodePropertyEscapes.replace = (m, propertyKey) => {
        if (propertyKey in Ranges) return Ranges[propertyKey].toString();
        throw RangeError(`Cannot rewrite unicode property "${propertyKey}"`);
      };
      transforms.push(expression => {
        let flags = expression && expression.flags;
        let source = expression && `${expression.source || expression || ''}`;
        source &&
          UnicodePropertyEscapes.test(source) &&
          (source = source.replace(UnicodePropertyEscapes, UnicodePropertyEscapes.replace));
        return (flags && new RegExp(source, flags)) || source;
      });
    }

    if (!transforms.length) return;

    for (const key in entities) {
      const sources = entities[key];
      const changes = {};
      for (const id in sources) {
        let source = sources[id];
        if (!source || typeof source !== 'string') continue;
        for (const transform of transforms) source = transform(source);
        !source || source === sources[id] || (changes[id] = source);
      }
      Object.assign(sources, changes);
    }

    // prettier-ignore
    function supports() {try {return !!RegExp(... arguments)} catch (e) { }}
  })({
    ID_Start: raw`a-zA-Z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
    ID_Continue: raw`a-zA-Z0-9\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7b9\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab65\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0eb9\u0ebb\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf2-\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f`,
  });

  /** Shared context state handler for token generator instances  */
  class Contextualizer {
    constructor(tokenizer) {
      // Local contextualizer state
      let definitions, context;

      // Tokenizer mode
      const {defaults = {}, mode = defaults.mode, initializeContext} = tokenizer;

      if (!mode) throw Error(`Contextualizer constructed without a mode`);

      const prime = next => (
        definitions !== next &&
          next &&
          ((context = mappings.get((definitions = next))) ||
            ((context = this.contextualize(definitions)),
            initializeContext && apply(initializeContext, tokenizer, [context]))),
        (next != null && context) || ((definitions = mode), (context = root))
      );

      Object.defineProperties(this, {
        mode: {value: mode, writable: false},
        prime: {value: prime, writable: false},
      });

      // Eagerly contextualize "root" definitions on first use
      if (!(context = mappings.get((definitions = mode)))) {
        const {
          // Parent goal
          syntax,
          matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
          quotes,
          punctuation = (mode.punctuation = {}),
          punctuators = (mode.punctuators = {aggregators: {}}),
          punctuators: {aggregators = (punctuators.aggregators = {})},
          patterns = (mode.patterns = {maybeKeyword: null}),
          patterns: {
            maybeKeyword = (patterns.maybeKeyword =
              (defaults && defaults.patterns && defaults.patterns.maybeKeyword) || undefined),
          },
          spans: {['(spans)']: spans} = (mode.spans = {}),
        } = mode;

        context = {syntax, goal: syntax, mode, punctuators, punctuation, aggregators, matcher, quotes, spans};

        initializeContext && apply(initializeContext, tokenizer, [context]);

        mappings.set(mode, context);
      }

      const root = context;
    }

    contextualize(definitions) {
      const mode = this.mode;

      const {
        // Parent goal
        syntax = (definitions.syntax = mode.syntax),

        // Lexical goal
        goal = (definitions.goal = syntax),

        // Assumes shared parent and unrelated production lexicons
        punctuators = (definitions.punctuators = goal === syntax ? mode.punctuators : {}),
        aggregators = (definitions.aggregate =
          (punctuators && punctuators.aggregators) || (punctuators.aggregators = {})),

        // Assumes specific overrides
        punctuation = definitions.punctuation || {},

        // Contextual identity
        punctuator,
        closer,

        // Contextual grammar
        spans,
        matcher = (definitions.matcher = mode.matcher),
        quotes = (definitions.quotes = mode.quotes),
        forming = (definitions.forming = goal === mode.syntax),
      } = definitions;

      const context = {
        mode,
        syntax,
        goal,
        punctuation,
        punctuator,
        punctuators,
        aggregators,
        closer,
        spans,
        matcher,
        quotes,
        forming,
      };

      mappings.set(definitions, context);
      return context;
    }

    /** @deprecate Historical convenience sometimes used cautiously */
    normalize({
      syntax,
      goal = syntax,
      quote,
      comment,
      closure,
      span,
      grouping = comment || closure || span || undefined,
      punctuator,
      spans = (grouping && grouping.spans) || undefined,
      matcher = (grouping && grouping.matcher) || undefined,
      quotes = (grouping && grouping.quotes) || undefined,
      punctuators = {aggregators: {}},
      punctuation,
      opener = quote || (grouping && grouping.opener) || undefined,
      closer = quote || (grouping && grouping.closer) || undefined,
      hinter,
      open = (grouping && grouping.open) || undefined,
      close = (grouping && grouping.close) || undefined,
    }) {
      return {
        syntax,
        goal,
        punctuator,
        spans,
        matcher,
        quotes,
        punctuators,
        punctuation,
        opener,
        closer,
        hinter,
        open,
        close,
      };
    }
  }

  Object.freeze(Object.freeze(Contextualizer.prototype).constructor);

  const mappings = new WeakMap();
  const {apply} = Reflect;

  /** Private context state handler for token generator instances */
  class Contexts {
    /** @param {Tokenizer} tokenizer */
    constructor(tokenizer) {
      ({
        syntax: this.syntax,
        syntax: this.goal,
        syntax: (this.hints = new Hints()).top,
        [Definitions]: this.definitions = (this.contextualizer.mode[Definitions] = {}),
      } = (this.contextualizer =
        // TODO: Undo if concurrent parsing shows side-effects
        tokenizer.contextualizer || (tokenizer.contextualizer = new Contextualizer(tokenizer))).mode);
      (this.stack = [(this.root = this.contextualizer.prime(null))]).hints = [(this.hint = this.hints.toString())];
    }

    /**
     * @param {Token} nextToken
     * @param {TokenizerState} state
     * @param {TokenizerContext} context
     */
    close(nextToken, state, context) {
      const childContext = context;
      let after, parentToken;
      const {stack, hints, syntax, contextualizer} = this;

      const childIndex = stack.length - 1;
      const childDefinitions = childIndex && stack[childIndex];

      // TODO: Handle childContext.closer !== childDefinitions.closer
      if (childDefinitions) {
        const {hinter, punctuator} = childDefinitions;
        stack.pop();
        stack.includes(childDefinitions) || hints.delete(hinter);
        (punctuator === 'opener' && (nextToken.punctuator = 'closer')) ||
          (punctuator && (nextToken.punctuator = punctuator));
        nextToken.type = 'punctuator';
        after = childDefinitions.close && childDefinitions.close(nextToken, state, childContext);
      }

      const parentIndex = stack.length - 1;
      const parentDefinitions = stack[parentIndex];
      const parentHint = stack.hints[parentIndex];

      // TODO: Verify coherent goal, context, and hints
      (parentDefinitions &&
        (this.hint = parentHint) &&
        (context = contextualizer.prime(parentDefinitions)) &&
        (this.goal = context.goal || syntax)) ||
        ((this.goal = (context = contextualizer.prime(null)).goal || syntax) && (this.hint = stack.hints[0] || syntax));
      parentToken = (nextToken.parent && nextToken.parent.parent) || undefined;

      return {context, after, parentToken};
    }

    /**
     * @param {Token} nextToken
     * @param {TokenizerState} state
     * @param {TokenizerContext} context
     */
    open(nextToken, state, context) {
      let childDefinitions, parentToken, after;
      let {punctuator, text} = nextToken;
      const parentContext = context;
      const {definitions, stack, hints, hint, syntax, contextualizer} = this;
      const hinter = punctuator ? `${syntax}-${punctuator}` : hint;
      const contextID = `${hinter},${text}`;
      const definedDefinitions = definitions[contextID];
      const {
        mode: {matchers, comments, spans, closures},
      } = parentContext;

      if (punctuator === 'span' && parentContext.spans) {
        const span = parentContext.spans.get(text);
        punctuator = nextToken.punctuator = 'span';
        childDefinitions =
          definedDefinitions ||
          contextualizer.normalize({
            syntax,
            goal: syntax,
            span,
            matcher: span.matcher || (matchers && matchers.span) || undefined,
            spans: (spans && spans[text]) || undefined,
            hinter,
            punctuator,
            punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
          });
      } else if (parentContext.punctuator !== 'quote') {
        if (punctuator === 'quote') {
          childDefinitions =
            definedDefinitions ||
            contextualizer.normalize({
              syntax,
              goal: punctuator,
              quote: text,
              matcher: (matchers && matchers.quote) || undefined,
              spans: (spans && spans[text]) || undefined,
              hinter,
              punctuator,
              punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
            });
        } else if (punctuator === 'comment') {
          const comment = comments.get(text);
          childDefinitions =
            definedDefinitions ||
            contextualizer.normalize({
              syntax,
              goal: punctuator,
              comment,
              matcher: comment.matcher || (matchers && matchers.comment) || undefined,
              hinter,
              punctuator,
              punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
            });
        } else if (punctuator === 'closure') {
          const closure = (definedDefinitions && definedDefinitions.closure) || closures.get(text);
          punctuator = nextToken.punctuator = 'opener';
          closure &&
            (childDefinitions =
              definedDefinitions ||
              contextualizer.normalize({
                syntax,
                goal: syntax,
                closure,
                matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                hinter,
                punctuator,
                punctuation: (definedDefinitions && definedDefinitions.punctuation) || {
                  ...((closure && closure.punctuation) || undefined),
                },
              }));
        }
      }

      if (childDefinitions) {
        (contextID && definitions[contextID]) || (definitions[contextID] = childDefinitions);
        const childIndex = stack.push(childDefinitions) - 1;
        hints.add(hinter);
        this.goal = (childDefinitions && childDefinitions.goal) || syntax;
        this.hint = stack.hints[childIndex] = `${hints.toString()} in-${this.goal}`;
        parentToken = nextToken;
        context = contextualizer.prime(childDefinitions);
        nextToken.type = 'punctuator';
        after = childDefinitions.open && childDefinitions.open(nextToken, state, context);
      }

      return {context, after, parentToken};
    }
  }

  Object.freeze(Object.freeze(Contexts.prototype).constructor);

  const Definitions = Symbol('[definitions]');

  const Hints = Object.freeze(
    Object.defineProperties(
      class Hints extends Set {
        toString() {
          return `${(this.root && ` ${this.root}`) || ''}${(this.top && ` ${this.top}`) || ''}${(this.size &&
          ` ${this.join(' ')}`) ||
          ''}`.trim();
        }
      }.prototype,
      {join: Object.getOwnPropertyDescriptor(Array.prototype, 'join')},
    ),
  ).constructor;

  /** @typedef {import('./types').Contextualizer} Contextualizer */
  /** @typedef {import('./types').Token} Token */
  /** @typedef {import('./types').Tokenizer} Tokenizer */
  /** @typedef {import('./types').TokenizerState} TokenizerState */
  /** @typedef {import('./types').TokenizerContext} TokenizerContext */

  const TOKENIZERS = 'tokenizers';
  const MAPPINGS = 'mappings';
  const MODES = 'modes';

  const none = {
    syntax: 'markup',
    matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/+|\/\*+|\*+\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
  };

  const define = (instance, property, value, options) => {
    if (!instance.hasOwnProperty(property))
      return (
        Object.defineProperty(instance, property, {
          value,
          writable: (options && options.writable === true) || false,
          configurable: (options && options.configurable === true) || false,
          enumerable: !options || options.enumerable === true,
        }),
        value
      );
  };

  /** The identity empty immutable iterable for debugging. */
  const EmptyTokenArray = (EmptyTokenArray =>
    Object.freeze(
      new (Object.freeze(Object.freeze(Object.setPrototypeOf(EmptyTokenArray.prototype, null)).constructor, null))(),
    ))(
    class EmptyTokenArray {
      *[Symbol.iterator]() {}
    },
  );

  /**
   * Returns the first occurance of a sequence in the string
   * starting from the index (or 0 where undefined), always
   * returning -1 or the index of the occurance.
   *
   * @see https://tc39.es/ecma262/#sec-string.prototype.indexof
   * @type {(string: string, sequence: string , index?: number) => number}
   */
  const indexOf = Function.call.bind(String.prototype.indexOf);

  /**
   * Returns the total number of `\n` sequences in the string.
   *
   * @type {(string: string) => number}
   */
  const countLineBreaks = text => {
    let lineBreaks = 0;
    for (let index = -1; (index = indexOf(text, '\n', index + 1)) !== -1; lineBreaks++);
    return lineBreaks;
  };

  const createBaselineTokenizer = () => {
    return class Tokenizer {
      *tokenize(sourceText) {
        let match, lastIndex;
        const matcher = RegExp(none.matcher);
        const string = String(sourceText || '');

        lastIndex = 0;
        while ((match = matcher.exec(string))) {
          const {0: text, index} = match;
          const pre = lastIndex < index && string.slice(lastIndex, index);
          lastIndex = matcher.lastIndex;
          pre && (yield {text: pre, lineBreaks: countLineBreaks(pre)});
          yield {text, lineBreaks: countLineBreaks(text)};
        }
      }
    };
  };

  /** @param {typeof import('./tokenizer.js')['Tokenizer']} [Tokenizer] */
  const createParser = (Tokenizer = createBaselineTokenizer()) =>
    class Parser {
      constructor(options) {
        if (options) {
          const {mode, tokenizer, url, modes} = options;
          if (mode) {
            this.register((this.mode = mode));
            tokenizer && this[TOKENIZERS].set(mode, tokenizer);
          }
          if (modes) for (const id in modes) this.register(modes[id]);
          url && (this.MODULE_URL = url);
        }
      }

      /**
       * @param source {string}
       * @param state {{sourceType?: string}}
       */
      tokenize(source, state = {}) {
        const {
          options: {
            sourceType,
            mode = (state.options.mode = (sourceType && this.get(sourceType)) || this.mode || none),
          } = (state.options = {}),
        } = state;
        let tokenizer = mode && this[TOKENIZERS].get(mode);
        if (!source || !mode) return EmptyTokenArray;
        if (!tokenizer) {
          if (typeof Tokenizer !== 'function') {
            throw TypeError(
              `Parse factory expected the first argument to be a Tokenizer constructor (not ${typeof Tokenizer}) — either define a tokenizer mapping for "${sourceType ||
              mode.syntax ||
              'markup'}" or pass the a constructor to the factory.`,
            );
          }
          this[TOKENIZERS].set(mode, (tokenizer = new Tokenizer(mode)));
        }
        state.parser = this;
        state.tokenize = (this.hasOwnProperty('tokenize') && this.tokenize) || (this.tokenize = this.tokenize.bind(this));
        return tokenizer.tokenize(source, state);
      }

      get [TOKENIZERS]() {
        return define(this, TOKENIZERS, new WeakMap());
      }
      get [MAPPINGS]() {
        return define(this, MAPPINGS, Object.create(null));
      }

      get [MODES]() {
        return define(this, MODES, Object.create(null));
      }

      get(id = 'default') {
        const {[MAPPINGS]: mappings, [MODES]: modes} = this;
        if (id in modes) return modes[id];
        let mapping = mappings[id];
        !mapping || mapping.syntax === id || (mapping = mappings[mapping.syntax]);
        if (mapping) {
          const {syntax, mode, factory, options} = mapping;
          if (mode) {
            return (modes[id] = mode);
          }
          if (factory) {
            if (options.requires && options.requires.length > 0) {
              const list = [];
              for (const id of options.requires) id in modes || this.get(id) || list.push(id);
              if (list.length) {
                list.length > 1 && list.push(list.splice(-2, 2).join(' and '));
                throw Error(`Cannot initialize "${syntax}" which requires the list mode(s): ${list.join(', ')}`);
              }
            }
            return (mapping.mode = modes[id] = factory(options, modes));
          }
        }
      }

      /** @param {ModeFactory | Parser.Mode} mode @param {Parser.Mode.Options} [options] */
      register(mode, options) {
        if (!this[MAPPINGS]) return;

        const {[MAPPINGS]: mappings, [MODES]: modes} = this;
        const factory = typeof mode === 'function' && mode;
        const {syntax, aliases = (options.aliases = []), preregister, tokenizer} = ({
          syntax: options.syntax = mode.syntax,
        } = options = {
          syntax: undefined,
          ...(factory ? factory.defaults : mode),
          ...options,
        });

        if (!syntax || typeof syntax !== 'string') {
          throw TypeError(`Cannot register "${syntax}" since it not valid string'`);
        }

        if (preregister) preregister(this);

        if (mappings[syntax]) {
          if (factory ? factory === mappings[syntax].factory : mode === modes[syntax]) return;
          throw ReferenceError(`Cannot register "${syntax}" since it is already registered`);
        }

        const ids = [syntax];

        if (aliases && aliases.length > 0) {
          for (const alias of aliases) {
            const mapping = mappings[alias];
            if (!alias || typeof alias !== 'string') {
              throw TypeError(`Cannot register "${syntax}" since it's alias "${alias}" not valid string'`);
            }

            if (alias in modes || (mapping && (mapping.syntax === alias || mapping.syntax[0] === alias[0]))) {
              continue;
            }

            if (mapping) {
              Object.defineProperty(mappings, alias, {writable: true, configurable: true});
              delete mappings[alias];
              ids.push(alias);
            }

            ids.push(alias);
          }
        }

        const mapping = factory ? {syntax, factory, options} : {syntax, mode, options};
        const descriptor = {value: mapping, writable: false, configurable: true};

        for (const id of ids) Object.defineProperty(mappings, id, descriptor);

        if (tokenizer) this[TOKENIZERS].set(mode, tokenizer);
      }

      unregister(id) {
        const {[MAPPINGS]: mappings, [MODES]: modes} = this;
        if (id in modes) {
          throw ReferenceError(`Cannot unregister "${id}" since it's already been bootstrapped for use.`);
        }
        Object.defineProperty(mappings, id, {writable: true, configurable: true});
        delete mappings[id];
      }

      /** @param {string} mode @param {string[]} requires */
      requires(mode, requires) {
        const missing = [];
        for (const mode of requires) {
          mode in this[MAPPINGS] || missing.push(`"${mode}"`);
        }
        if (!missing.length) return;
        throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
      }
    };

  /**
   * @typedef { ReturnType<createParser> } Parser
   * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Parser.Mode
   * @typedef { {[name: string]: Parser.Mode} } Parser.Modes
   * @typedef { {[name: string]: {syntax: string} } } Parser.Mappings
   * @typedef { {aliases?: string[], syntax: string} } Parser.Mode.Options
   * @typedef { (options: Parser.Mode.Options, modes: Parser.Modes) => Parser.Mode } ModeFactory
   */

  class TokenSynthesizer {
    constructor(context) {
      const {
        mode: {
          keywords,
          patterns: {
            maybeIdentifier,
            maybeKeyword,
            segments: {
              [SEGMENT]: matchSegment = context.mode.patterns.segments &&
                (context.mode.patterns.segments[SEGMENT] = createSegmenter(context.mode.patterns.segments)),
            } = (context.mode.patterns.segments = false),
          } = (context.mode.patterns = false),
        },
        punctuation = (context.punctuation = {}),
        punctuators,
        aggregators,
        forming = (context.forming = true),
        wording = (context.wording = keywords || maybeIdentifier ? true : false),
        [PUNCTUATOR]: matchPunctuator = (context[PUNCTUATOR] = createPunctuator(context)),
        [AGGREGATOR]: matchAggregator = (context[AGGREGATOR] = createAggregator(context)),
      } = context;

      this.create = next => {
        const {text, type, hint, previous, parent, last} = next;
        type === 'sequence'
          ? ((next.punctuator =
              punctuation[text] ||
              (previous &&
                (aggregators[text] || (!(text in aggregators) && (aggregators[text] = matchAggregator(text))))) ||
              punctuators[text] ||
              (!(text in punctuators) && (punctuators[text] = matchPunctuator(text))) ||
              undefined) &&
              (next.type = 'punctuator')) ||
            (matchSegment &&
              (next.type = matchSegment(text)) &&
              (next.hint = `${(hint && `${hint} `) || ''}${next.type}`)) ||
            (next.type = 'sequence')
          : type === 'whitespace'
          ? // ? (next.lineBreaks = text.match(LineEndings).length - 1)
            (next.lineBreaks = countLineBreaks(text))
          : forming && wording
          ? text &&
            (((!maybeKeyword || maybeKeyword.test(text)) &&
              keywords &&
              keywords.includes(text) &&
              (!last || last.punctuator !== 'nonbreaker' || (previous && previous.lineBreaks > 0)) &&
              (next.type = 'keyword')) ||
              (maybeIdentifier && maybeIdentifier.test(text) && (next.type = 'identifier')))
          : (next.type = 'text');

        previous && (previous.next = next) && (parent || (next.parent = previous.parent));

        return next;
      };
    }
  }

  Object.freeze(Object.freeze(TokenSynthesizer.prototype).constructor);

  const PUNCTUATOR = Symbol('[punctuator]');
  const AGGREGATOR = Symbol('[aggregator]');
  const SEGMENT = Symbol('[segment]');

  const createSegmenter = segments => {
    const sources = [];
    const names = [];
    for (const name of Object.getOwnPropertyNames(segments)) {
      const segment = segments[name];
      if (segment && segment.source && !/\\\d/.test(segment.source)) {
        names.push(name);
        sources.push(segment.source.replace(/\\?\((.)/g, (m, a) => (m[0] !== '\\' && a !== '?' && '(?:') || m));
      }
    }
    const length = names.length;
    if (!length) return false;
    const matcher = new RegExp(`(${sources.join('|)|(')}|)`, 'u');
    return text => {
      const match = matcher.exec(text);
      if (match[0]) for (let i = 1, n = length; n--; i++) if (match[i]) return names[i - 1];
    };
  };

  const createPunctuator = ({mode: {operators, nonbreakers, comments, closures, breakers}, quotes, spans}) => {
    return text =>
      (operators && operators.includes(text) && 'operator') ||
      (closures && closures.includes(text) && 'closure') ||
      (breakers && breakers.includes(text) && 'breaker') ||
      (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
      (comments && comments.includes(text) && 'comment') ||
      (quotes && quotes.includes(text) && 'quote') ||
      (spans && spans.includes(text) && 'span') ||
      false;
  };

  const createAggregator = ({mode: {assigners, combinators}}) => {
    return text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false;
  };

  /** Tokenizer for a single mode (language) */
  class Tokenizer {
    constructor(mode, defaults) {
      this.mode = mode;
      this.defaults = defaults || this.constructor.defaults || undefined;
    }

    initializeContext(context) {
      context.createToken || (context.createToken = new TokenSynthesizer(context).create);
      return context;
    }

    /** Token generator from source using tokenizer.mode (or defaults.mode) */
    *tokenize(source, state = {}) {
      let done, context;
      let previousToken, lastToken, parentToken;
      let {match, index = 0, flags} = state;
      const contexts = (state.contexts = new Contexts(this));
      const {tokenize = (state.tokenize = text => [{text}])} = state;
      const rootContext = (context = state.lastContext = contexts.root);
      const top = {type: 'top', text: '', offset: index};

      done = !(state.source = source);

      while (!done) {
        const {closer, matcher, createToken, forming = true} = context;

        // Current contextual hint (syntax or hint)
        const hint = contexts.hint;

        while (state.lastContext === (state.lastContext = context)) {
          let nextToken;

          const lastIndex = (state.index > -1 && state.index) || 0;

          matcher.lastIndex = lastIndex;
          match = state.match = matcher.exec(source);
          done = index === (index = state.index = matcher.lastIndex) || !match;

          if (done) break;

          // Current contextual match
          const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

          // Current quasi-contextual fragment
          const pre = source.slice(lastIndex, offset);
          pre &&
            ((nextToken = createToken({
              type: 'pre',
              text: pre,
              offset: lastIndex,
              previous: previousToken,
              parent: parentToken,
              hint,
              last: lastToken,
            })),
            yield (previousToken = nextToken));

          // Current contextual fragment
          const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
          nextToken = createToken({
            type,
            text,
            offset,
            previous: previousToken,
            parent: parentToken,
            hint,
            last: lastToken,
          });

          let after;

          // Current contextual punctuator (from sequence)
          const closing =
            closer && (closer.test ? closer.test(text) : closer === text || (whitespace && whitespace.includes(closer)));

          // Update context
          (closing && ({context, after, parentToken = top} = contexts.close(nextToken, state, context))) ||
            (nextToken.punctuator &&
              context.punctuator !== 'comment' &&
              ({context, after, parentToken = top} = contexts.open(nextToken, state, context)));

          // Current contextual tail token (yield from sequence)
          yield (previousToken = nextToken);

          // Next reference to last contextual sequence token
          nextToken && !whitespace && forming && (lastToken = nextToken);

          if (after) {
            let tokens, createToken, nextIndex;
            let hintTokenType, hintPrefix, hintSuffix;

            if (after.syntax) {
              const {syntax, offset, index} = after;
              let body = index > offset && source.slice(offset, index);
              if (body && body.length > 0) {
                (tokens = tokenize(`${body}`, {options: {sourceType: syntax}}, this.defaults)), (nextIndex = index);
                // Workaround for lost token for script/style tags in in-html
                // TODO: Investigate lost token in script/style tags in in-html
                tokens.lastOffset = body.length;
                hintSuffix = `${syntax}-in-${rootContext.syntax}`;
                createToken = token => ((token.hint = `${(token.hint && `${token.hint} `) || ''}${hintSuffix}`), token);
                // console.log({after, body, tokens, hintSuffix, createToken});
              }
            } else if (after.length) {
              hintTokenType = 'code';
              hintPrefix = contexts.hint ? `${contexts.hint} ` : '';
              createToken = token =>
                context.createToken(((token.hint = `${hintPrefix}${token.type || hintTokenType}`), token));
              (tokens = after).end > state.index && (nextIndex = after.end);
            }

            if (tokens) {
              for (const next of tokens) {
                // Workaround for lost token for script/style tags in in-html
                // TODO: Investigate lost token in script/style tags in in-html
                // tokens.lastOffset > 0 && console.log('next: %o', next, [tokens.lastOffset, next.offset]);

                if(next.offset > tokens.lastOffset) break;

                (previousToken && ((next.previous = previousToken).next = next),
                    createToken && createToken(next),
                    yield (previousToken = next));
              }
              tokens.return && tokens.return();
              nextIndex > state.index && (state.index = nextIndex);
            }
          }
        }
      }
      flags && flags.debug && console.info('[Tokenizer.tokenize‹state›]: %o', state);
    }
  }

  Object.freeze(Object.freeze(Tokenizer.prototype).constructor);

  const Parser = createParser(Tokenizer);

  /**
   * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
   * @typedef { {[name: string]: Mode} } Modes
   * @typedef { {[name: string]: {syntax: string} } } Mappings
   * @typedef { {aliases?: string[], syntax: string} } ModeOptions
   * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
   */

  new Parser({url: (document.currentScript && document.currentScript.src || new URL('tokenizer.browser.js', document.baseURI).href)});

  const css = Object.defineProperties(
    ({syntax} = css.defaults) => ({
      syntax,
      comments: Closures.from('/*…*/'),
      closures: Closures.from('{…} (…) […]'),
      quotes: Symbols.from(`' "`),
      keywords: Symbols.from(css.KEYWORDS),
      combinators: Symbols.from('--'),
      operators: Symbols.from('> . : , - + / *'),
      breakers: Symbols.from(';'),
      patterns: {
        maybeIdentifier: /^--\S+$/,
      },
      matcher: /(\n|\s+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\*|\*\/|\(|\)|\[|\]|"|'|\{|\}|,|;|\.|\b:\/\/\b|\+|\B-(?![a-z]*-)|\*|\/|>|:(?![-a-z:]))|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{4}|#[0-9a-fA-F]{3}|::?[a-z][a-z-]+|@[a-z][a-z-]+|[-\w]+|[^\s\n]/gi,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\*\/|`|"|'|\$\{)/g,
        comment: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w\+\.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      },
    }),
    {
      defaults: {value: {syntax: 'css'}},
    },
  );

  css.KEYWORDS = {
    ['(symbols)']:
      ':active additive-symbols ::after align-content align-items align-self all animation animation-delay animation-direction animation-duration animation-fill-mode animation-iteration-count animation-name animation-play-state animation-timing-function @annotation annotation attr ::backdrop backface-visibility background background-attachment background-blend-mode background-clip background-color background-image background-origin background-position background-repeat background-size ::before block-size blur border border-block border-block-color border-block-end border-block-end-color border-block-end-style border-block-end-width border-block-start border-block-start-color border-block-start-style border-block-start-width border-block-style border-block-width border-bottom border-bottom-color border-bottom-left-radius border-bottom-right-radius border-bottom-style border-bottom-width border-collapse border-color border-end-end-radius border-end-start-radius border-image border-image-outset border-image-repeat border-image-slice border-image-source border-image-width border-inline border-inline-color border-inline-end border-inline-end-color border-inline-end-style border-inline-end-width border-inline-start border-inline-start-color border-inline-start-style border-inline-start-width border-inline-style border-inline-width border-left border-left-color border-left-style border-left-width border-radius border-right border-right-color border-right-style border-right-width border-spacing border-start-end-radius border-start-start-radius border-style border-top border-top-color border-top-left-radius border-top-right-radius border-top-style border-top-width border-width bottom @bottom-center box-decoration-break box-shadow box-sizing break-after break-before break-inside brightness calc caption-side caret-color ch @character-variant character-variant @charset :checked circle clamp clear clip clip-path cm color color-adjust column-count column-fill column-gap column-rule column-rule-color column-rule-style column-rule-width column-span column-width columns conic-gradient content contrast counter-increment counter-reset counter-set @counter-style counters cross-fade cubic-bezier ::cue cursor :default deg :dir direction :disabled display dpcm dpi dppx drop-shadow element ellipse em :empty empty-cells :enabled env ex fallback filter :first :first-child ::first-letter ::first-line :first-of-type fit-content flex flex-basis flex-direction flex-flow flex-grow flex-shrink flex-wrap float :focus font @font-face font-family font-family font-feature-settings font-feature-settings @font-feature-values font-kerning font-language-override font-optical-sizing font-size font-size-adjust font-stretch font-stretch font-style font-style font-synthesis font-variant font-variant font-variant-alternates font-variant-caps font-variant-east-asian font-variant-ligatures font-variant-numeric font-variant-position font-variation-settings font-weight font-weight format fr :fullscreen gap grad grayscale grid grid-area grid-auto-columns grid-auto-flow grid-auto-rows grid-column grid-column-end grid-column-start grid-row grid-row-end grid-row-start grid-template grid-template-areas grid-template-columns grid-template-rows Hz hanging-punctuation height height @historical-forms :host :hover hsl hsla hue-rotate hyphens image image-orientation image-rendering image-set @import in :in-range :indeterminate inherit initial inline-size inset inset inset-block inset-block-end inset-block-start inset-inline inset-inline-end inset-inline-start :invalid invert isolation justify-content justify-items justify-self kHz @keyframes :lang :last-child :last-of-type leader :left left @left-bottom letter-spacing line-clamp line-break line-height linear-gradient :link list-style list-style-image list-style-position list-style-type local margin margin-block margin-block-end margin-block-start margin-bottom margin-inline margin-inline-end margin-inline-start margin-left margin-right margin-top ::marker mask mask-clip mask-composite mask-image mask-mode mask-origin mask-position mask-repeat mask-size mask-type matrix matrix3d max max-height max-height max-width max-width max-zoom @media min min-block-size min-height min-height min-inline-size min-width min-width min-zoom minmax mix-blend-mode mm ms @namespace negative :not :nth-child :nth-last-child :nth-last-of-type :nth-of-type object-fit object-position :only-child :only-of-type opacity opacity :optional order orientation @ornaments ornaments orphans :out-of-range outline outline-color outline-offset outline-style outline-width overflow overflow-wrap overflow-x overflow-y pad padding padding-block padding-block-end padding-block-start padding-bottom padding-inline padding-inline-end padding-inline-start padding-left padding-right padding-top @page page-break-after page-break-before page-break-inside paint pc perspective perspective perspective-origin place-content place-items place-self ::placeholder pointer-events polygon position prefix pt px quotes rad radial-gradient range :read-only :read-write rect rem repeat repeating-linear-gradient repeating-radial-gradient :required resize revert rgb rgba :right right @right-bottom :root rotate rotate rotate3d rotateX rotateY rotateZ row-gap saturate scale scale scale3d scaleX scaleY scaleZ :scope scroll-behavior scroll-margin scroll-margin-block scroll-margin-block-end scroll-margin-block-start scroll-margin-bottom scroll-margin-inline scroll-margin-inline-end scroll-margin-inline-start scroll-margin-left scroll-margin-right scroll-margin-top scroll-padding scroll-padding-block scroll-padding-block-end scroll-padding-block-start scroll-padding-bottom scroll-padding-inline scroll-padding-inline-end scroll-padding-inline-start scroll-padding-left scroll-padding-right scroll-padding-top scroll-snap-align scroll-snap-stop scroll-snap-type scrollbar-color scrollbar-width ::selection selector sepia shape-image-threshold shape-margin shape-outside skew skewX skewY ::slotted speak-as src steps @styleset styleset @stylistic stylistic suffix @supports @swash swash symbols symbols system tab-size table-layout :target target-counter target-counters target-text text-align text-align-last text-combine-upright text-decoration text-decoration-color text-decoration-line text-decoration-style text-decoration-thickness text-emphasis text-emphasis-color text-emphasis-position text-emphasis-style text-indent text-justify text-orientation text-overflow text-rendering text-shadow text-transform text-underline-offset text-underline-position top @top-center touch-action transform transform-box transform-origin transform-style transition transition-delay transition-duration transition-property transition-timing-function translate translate translate3d translateX translateY translateZ turn unicode-bidi unicode-range unset url user-zoom user-select user-drag -webkit-user-select -moz-user-select :valid var vertical-align vh @viewport visibility :visited vmax vmin vw white-space widows width width will-change word-break word-spacing word-wrap writing-mode z-index zoom -webkit-margin-start -webkit-margin-end -webkit-margin-before -webkit-margin-after -webkit-padding-start -webkit-padding-end -webkit-padding-before -webkit-padding-after -webkit-justify-items -webkit-justify-content -webkit-align-content -webkit-align-items -webkit-align-self -webkit-alt -webkit-animation -webkit-animation-delay -webkit-animation-direction -webkit-animation-duration -webkit-animation-fill-mode -webkit-animation-iteration-count -webkit-animation-name -webkit-animation-play-state -webkit-animation-timing-function -webkit-appearance -webkit-aspect-ratio -webkit-backdrop-filter -webkit-backface-visibility -webkit-backdrop-filter -webkit-backface-visibility -webkit-background-clip -webkit-background-composite -webkit-background-origin -webkit-background-size -webkit-border-after -webkit-border-after-color -webkit-border-after-style -webkit-border-after-width -webkit-border-before -webkit-border-before-color -webkit-border-before-style -webkit-border-before-width -webkit-border-bottom-left-radius -webkit-border-bottom-right-radius -webkit-border-end -webkit-border-end-color -webkit-border-end-style -webkit-border-end-width -webkit-border-fit -webkit-border-horizontal-spacing -webkit-border-image -webkit-border-radius -webkit-border-start -webkit-border-start-color -webkit-border-start-style -webkit-border-start-width -webkit-border-top-left-radius -webkit-border-top-right-radius -webkit-border-vertical-spacing -webkit-box-align -webkit-box-decoration-break -webkit-box-direction -webkit-box-flex -webkit-box-flex-group -webkit-box-lines -webkit-box-ordinal-group -webkit-box-orient -webkit-box-pack -webkit-box-reflect -webkit-box-shadow -webkit-box-sizing -webkit-clip-path -webkit-box-sizing -webkit-box-shadow -webkit-box-reflect -webkit-box-pack -webkit-box-reflect -webkit-box-shadow -webkit-box-sizing -webkit-clip-path -webkit-column-axis -webkit-column-break-after -webkit-column-break-before -webkit-column-break-inside -webkit-column-count -webkit-column-fill -webkit-column-gap -webkit-column-progression -webkit-column-rule -webkit-column-rule-color -webkit-column-rule-style -webkit-column-rule-width -webkit-column-span -webkit-column-width -webkit-columns -webkit-cursor-visibility -webkit-filter -webkit-flex -webkit-flex-basis -webkit-flex-direction -webkit-flex-flow -webkit-flex-grow -webkit-flex-shrink -webkit-flex-wrap -webkit-flex-shrink -webkit-flex-wrap -webkit-font-kerning -webkit-font-smoothing -webkit-hyphenate-character -webkit-hyphenate-limit-after -webkit-hyphenate-limit-before -webkit-hyphenate-limit-lines -webkit-hyphens -webkit-hyphenate-limit-lines -webkit-hyphenate-limit-before -webkit-hyphenate-limit-after -webkit-hyphenate-character -webkit-font-smoothing -webkit-hyphenate-character -webkit-hyphenate-limit-after -webkit-hyphenate-limit-before -webkit-hyphenate-limit-lines -webkit-hyphenate-limit-before -webkit-hyphenate-limit-after -webkit-hyphenate-character -webkit-hyphenate-limit-after -webkit-hyphenate-character -webkit-font-smoothing -webkit-font-kerning -webkit-flex-wrap -webkit-font-kerning -webkit-font-smoothing -webkit-hyphenate-character -webkit-hyphenate-limit-after -webkit-hyphenate-limit-before -webkit-hyphenate-limit-lines -webkit-hyphens -webkit-initial-letter -webkit-hyphens -webkit-hyphenate-limit-lines -webkit-hyphenate-limit-before -webkit-hyphenate-limit-after -webkit-hyphenate-character -webkit-font-smoothing -webkit-font-kerning -webkit-flex-wrap -webkit-flex-shrink -webkit-flex-grow -webkit-flex-flow -webkit-flex-direction -webkit-flex-flow -webkit-flex-grow -webkit-flex-shrink -webkit-flex-wrap -webkit-font-kerning -webkit-font-smoothing -webkit-hyphenate-character -webkit-hyphenate-limit-after -webkit-hyphenate-limit-before -webkit-hyphenate-limit-lines -webkit-hyphens -webkit-initial-letter -webkit-justify-content -webkit-justify-items -webkit-line-align -webkit-line-box-contain -webkit-line-align -webkit-line-box-contain -webkit-line-break -webkit-line-clamp -webkit-line-break -webkit-line-box-contain -webkit-line-align -webkit-line-align -webkit-line-align -webkit-line-align -webkit-line-align -webkit-line-align -webkit-text-size-adjust',
  };

  const html = Object.defineProperties(
    ({syntax} = html.defaults) => {
      const html = {
        syntax,
        keywords: Symbols.from('DOCTYPE doctype'),
        comments: Closures.from('<!--…-->'),
        closures: Closures.from('<?…?> <!…> <…/> </…> <…>'),
        quotes: [],
        patterns: {
          maybeKeyword: /^[a-z](\w*)$/i,
          closeTag: /<\/\w[^<>{}]*?>/g,
          // maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
        },
        matcher: /(\n|\s+)|("|'|=|&#x?[a-f0-9]+;|&[a-z]+;|\/?>|<\?|\?>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+))/gi,
        matchers: {
          quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
          comment: /(\n)|(-->)/g,
        },
      };

      const DOCTAGS = Symbols.from('SCRIPT STYLE');
      const TAG = /^[a-z]+$/i;
      // TODO: Check if custom/namespace tags ever need special close logic
      // const TAGLIKE = /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/i;

      const HTMLTagClosure = html.closures.get('<');

      HTMLTagClosure.patterns = html.patterns;

      HTMLTagClosure.close = (next, state, context) => {
        let parent = next && next.parent;
        // TODO: Fix parent broken when HTMLTagClosure.punctuation {'='}
        //       This is a temporary workaround (maybe)
        if (parent.text !== '<') {
          let previous = next.previous;
          while (previous && !(previous.text === '<' && previous.punctuator === 'opener')) previous = previous.previous;
          if (previous) next.parent = parent = previous;
        }
        const first = parent && parent.next;
        const tag = first && first.text && TAG.test(first.text) && first.text.toUpperCase();

        if (tag && DOCTAGS.includes(tag)) {
          let {source, index} = state;
          const $$matcher = html.patterns.closeTag;

          let match;
          $$matcher.lastIndex = index;

          // TODO: Check if `<script>`…`</SCRIPT>` is still valid!
          const $$closer = new RegExp(raw`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

          let syntax = (tag === 'STYLE' && 'css') || '';

          if (!syntax) {
            const openTag = source.slice(parent.offset, index);
            const match = /\stype=.*?\b(.+?)\b/.exec(openTag);
            syntax = tag === 'SCRIPT' && (!match || !match[1] || /^module$|javascript/i.test(match[1])) ? 'es' : '';
          }

          while ((match = $$matcher.exec(source))) {
            if ($$closer.test(match[0])) {
              if (syntax) {
                return {offset: index, index: match.index, syntax};
              } else {
                const offset = index;
                const text = source.slice(offset, match.index - 1);
                state.index = match.index;
                return [{text, offset, previous: next, parent}];
              }
            }
          }
        }
      };
      HTMLTagClosure.quotes = Symbols.from(`' "`);
      HTMLTagClosure.closer = /\/?>/;
      HTMLTagClosure.punctuation = {'=': 'assigner'};

      return html;
    },
    {
      defaults: {value: {syntax: 'html', aliases: ['htm']}},
    },
  );

  const markdown = Object.defineProperties(
    ({syntax} = defaults, {html}) => {
      const matcher = new RegExp(markdown.MATCHER.source, markdown.MATCHER.flags);

      const mode = {
        syntax,
        comments: Closures.from('<!--…-->'),
        quotes: [],
        operators: markdown.OPERATORS,
        closures: Closures.from(html.closures, markdown.CLOSURES),
        matcher: matcher,
        spans: Closures.from('``…`` `…`'),
        matchers: {comment: /(\n)|(-->)/g},
      };

      const open = (parent, state, grouper) => {
        const {source, index: start} = state;
        const fence = parent.text;
        const fencing = previousTextFrom(parent, '\n');
        const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
        let end = source.indexOf(`\n${fencing}`, start);
        const INDENT = (indenting && indenter(indenting)) || /^/m;
        const CLOSER = new RegExp(raw`^${INDENT.source.slice(1) || ''}${fence}`, 'mg');

        CLOSER.lastIndex = start;
        let closerMatch = CLOSER.exec(source);
        if (closerMatch && closerMatch.index >= start) {
          end = closerMatch.index;
        } else {
          const FENCE = new RegExp(raw`^[\>\|\s]*${fence}`, 'mg');
          FENCE.lastIndex = start;
          const fenceMatch = FENCE.exec(source);
          if (fenceMatch && fenceMatch.index >= start) {
            end = fenceMatch.index;
          } else return;
        }

        if (end > start) {
          let offset = start;
          let text, head, lines;

          const body = source.slice(start, end) || '';
          const tokens = [];
          tokens.end = end;
          {
            [head, ...lines] = body.split(/\r?(\n)\r?/g);
            if (head) {
              tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
            }
            for (const line of lines) {
              if (line === '\n') {
                text = line;
                tokens.push({text, type: 'whitespace', offset, parent}), (offset += text.length);
              } else {
                const [indent] = INDENT.exec(line) || '';
                const inset = (indent && indent.length) || 0;
                if (inset) {
                  for (const text of indent.split(/(\s+)/g)) {
                    if (!text) continue;
                    const type = (text.trim() && 'sequence') || 'whitespace';
                    tokens.push({text, type, offset, parent});
                    offset += text.length;
                  }
                  text = line.slice(inset) || '';
                } else {
                  text = line;
                }
                if (text) {
                  tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
                }
              }
            }
          }

          if (tokens.length) {
            const last = tokens[tokens.length - 1];
            last.text || tokens.pop();
            return tokens;
          }
        }
      };

      {
        const quotes = html.closures.get('<').quotes;
        for (const opener of ['```', '~~~']) {
          const FenceClosure = mode.closures.get(opener);
          if (FenceClosure) {
            FenceClosure.matcher = new RegExp(raw`/(\s*\n)|(${opener}(?=\s|$)|^(?:[\s>|]*\s)?\s*)|.*$`, 'gm');
            FenceClosure.quotes = quotes;
            FenceClosure.open = open;
          }
        }
      }

      return mode;
    },
    {
      defaults: {get: () => ({...markdown.DEFAULTS})},
    },
  );

   {
     {
      markdown.DEFAULTS = {syntax: 'markdown', aliases: ['md'], requires: ['html']};
    }

    markdown.BLOCK = '```…``` ~~~…~~~';
    markdown.INLINE = '[…] (…)'; // *…* **…** _…_ __…__ ~…~ ~~…~~
    markdown.CLOSURES = `${markdown.BLOCK} ${markdown.INLINE}`;

    // Partials are first character used in production forms (like `###`)
    //   which need to be properly typed by the tokenizer
    markdown.PARTIALS = Symbols.from(raw`< # >`);

    // Punctuation is used to define both ESCAPES and OPERATORS which
    //   requires the fine-grained intersection that excludes partials.
    markdown.PUNCTUATION = Symbols.from(raw`< # > ! " $ % & ' ( ) * + , - . / : ; = ? @ [ \ ] ^ _ ${'`'} { | } ~`);

    // Operators are productions and their escaped forms.
    markdown.OPERATORS = Symbols.from(
      raw`** * ~~ ~  __ _ ###### ##### #### ### ## # [ ] ( ) ${[...markdown.PUNCTUATION].map(s => `\\${s.repeat(2)} ${s.repeat(2)} \\${s}`).join(' ')}`,
    );

    markdown.MATCHER = sequence`${all(
    sequence`(${(markdown.WHITESPACE = /^\s+|\s+$|\n+/)})`,
    sequence`(${all(
      (markdown.ESCAPES = sequence`${all(
        ...[...markdown.PUNCTUATION].map(s => raw`\\${escape(s).repeat(2)}|\\${escape(s)}`),
      )}|\\.${'/gu'}`),
      (markdown.ENTITIES = /&#x?[a-f0-9]+;|&[a-z]+;/u),
      (markdown.INLINES = /((?:\b|\B)[*~]{1,2}|[*~]{1,2}(?:\b|\B)|\b_{1,2}|_{1,2}\b)/u),
      (markdown.RULES = /(?:[-]{2,}|[=]{2,})(?=\s*$)/u),
      (markdown.BLOCKS = /(?:\B#{1,6}|-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S)/u),
      (markdown.TYPOGRAPHS = /\B–(?= )|"|'|=/u),
      (markdown.TAGS = /\/>|<\?|\?>|<!--|-->|<[/!]?(?=[a-z]+:?[-a-z]*[a-z]|[a-z]+)/u),
      (markdown.BRACKETS = /<|>|\(|\)|\[|\]/u),
      (markdown.FENCES = /(?:\x60{3,}|\x7E{3,})(?=\b| |$)/u),
      (markdown.SPANS = /(``?(?![`\n]))[^\n]*?[^\\`\n]\4/),
    )})`,
    (markdown.INDICIES = /\b(?:[\da-zA-Z]+\.)+[\da-zA-Z]+\.?/u),
    (markdown.DECIMAL = /[-+]?\d+(?:,\d{3})*(?:\.\d+)?|[-+]?\d*\.\d+/u),
    (markdown.EXPONENTIAL = /\d+[eE]-?\d+|\d+\.\d+[eE]-?\d+/u),
    (markdown.FRAGMENTS = /\b[^\\\n\s\][)(><&`"*~]*[^\\\n\s\][)(><&`"*~_]\b|[^\\\n\s\][)(><&`"*~]+?(?=__?\b)/),
  )}${'/guim'}`;
  }

  const javascript = Object.defineProperties(
    ({syntax} = defaults) => ({
      syntax,
      comments: Closures.from(javascript.COMMENTS),
      quotes: Symbols.from(javascript.QUOTES),
      closures: Closures.from(javascript.CLOSURES),
      spans: {'`': Closures.from(javascript.SPANS['`'])},
      keywords: Symbols.from(javascript.KEYWORDS),
      assigners: Symbols.from(javascript.ASSIGNERS),
      combinators: Symbols.from(javascript.COMBINATORS),
      nonbreakers: Symbols.from(javascript.NONBREAKERS),
      operators: Symbols.from(javascript.OPERATORS),
      breakers: Symbols.from(javascript.BREAKERS),
      patterns: {
        ...patterns,
        maybeIdentifier: identifier(entities.es.IdentifierStart, entities.es.IdentifierPart),
        maybeKeyword: /^[a-z][a-zA-Z]+$/,
        segments: {
          regexp: /^\/(?![\n*+/?])[^\n]*[^\\\n]\//,
        },
      },
      matcher: sequence`(\n|\s+)|(${all(
      javascript.REGEXPS,
      javascript.COMMENTS,
      javascript.QUOTES,
      javascript.CLOSURES,
      ...javascript.PUNCTUATORS,
    )})`,
      matchers: {
        "'": /(\n)|(')|(\\.)/g,
        '"': /(\n)|(")|(\\.)/g,
        '`': /(\n)|(`|\$\{)|(\\.)/g,
        quote: /(\n)|(`|"|'|\$\{)|(\\.)/g,
        comment: /(\n)|(\*\/|\b(?:[a-z]+\:\/\/|\w[\w+.]*\w@[a-z]+)\S+|@[a-z]+)/gi,
      },
    }),
    {
      defaults: {get: () => ({...javascript.DEFAULTS})},
    },
  );

  javascript.DEFAULTS = {syntax: 'javascript', aliases: ['js', 'es', 'ecmascript']};

  javascript.REGEXPS = /\/(?=[^*/\n][^\n]*\/(?:[a-z]+\b|)(?:[ \t]+[^\n\s\(\[\{\w]|[.\[;,]|[ \t]*[)\]};,\n]|\n|$))(?:[^\\\/\n\t\[]+|\\[^\n]|\[(?:\\[^\n]|[^\\\n\t\]]+)*?\][+*]?\??)*\/(?:[a-z]+\b|)/g;

  javascript.COMMENTS = /\/\/|\/\*|\*\/|^\#\!.*\n|<!--/g;
  javascript.COMMENTS['(closures)'] = '//…\n /*…*/ <!--…\n';

  javascript.QUOTES = /`|"|'/g;
  javascript.QUOTES['(symbols)'] = `' " \``;

  javascript.CLOSURES = /\{|\}|\(|\)|\[|\]/g;
  javascript.CLOSURES['(closures)'] = '{…} (…) […]';

  javascript.SPANS = {'`': {['(closures)']: '${…}'}};

  javascript.KEYWORDS = {
    ['(symbols)']:
      // 'abstract enum interface package namespace declare type module public protected ' +
      'arguments as async await break case catch class export const continue private debugger default delete do else export extends finally for from function get if import in instanceof let new of return set static super switch this throw try typeof var void while with yield',
  };

  javascript.PUNCTUATORS = [
    /,|;|\.\.\.|\.|:|\?|=>/,
    /\+\+|\+=|\+|--|-=|-|\*\*=|\*\*|\*=|\*|\/=|\//,
    /&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~/,
    /<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>/,
    /!==|!=|!|===|==|=/,
  ];

  javascript.ASSIGNERS = {['(symbols)']: '= += -= *= /= **= %= &= |= <<= >>= >>>= ^= ~='};

  javascript.COMBINATORS = {['(symbols)']: '=== == + - * / ** % & && | || ! !== != > < >= <= => >> << >>> ^ ~'};
  javascript.NONBREAKERS = {['(symbols)']: '.'};
  javascript.OPERATORS = {['(symbols)']: '++ -- ... ? :'};
  javascript.BREAKERS = {['(symbols)']: ', ;'};

  const typescript = Object.defineProperties(
    ({syntax} = typescript.defaults, {javascript}) => ({
      ...javascript,
      keywords: Symbols.from(typescript.KEYWORDS),
    }),
    {
      defaults: {get: () => ({...typescript.DEFAULTS})},
    },
  );

   {
     {
      typescript.DEFAULTS = {syntax: 'typescript', aliases: ['ts'], requires: [javascript.defaults.syntax]};
    }
    typescript.KEYWORDS = {
      ['(symbols)']: `abstract enum interface namespace declare type module private public protected ${
      javascript.KEYWORDS['(symbols)']
    }`,
    };
  }

  const mjs = Object.defineProperties(
    ({syntax} = mjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
      syntax,
      keywords: Symbols.from('import export default'),
      quotes,
      closures,
      spans,
      matcher: javascript.extended.MJS,
      matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
    }),
    {
      defaults: {get: () => ({...mjs.DEFAULTS})},
    },
  );

  const cjs = Object.defineProperties(
    ({syntax} = cjs.defaults, {javascript: {quotes, closures, spans, matchers}}) => ({
      syntax,
      keywords: Symbols.from('import module exports require'),
      quotes,
      closures,
      spans,
      matcher: javascript.extended.CJS,
      matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
    }),
    {
      defaults: {get: () => ({...cjs.DEFAULTS})},
    },
  );

  const esx = Object.defineProperties(
    ({syntax} = esx.defaults, {javascript: {quotes, closures, spans, matchers}, mjs, cjs}) => ({
      syntax,
      keywords: Symbols.from(mjs.keywords, cjs.keywords),
      quotes,
      closures,
      spans,
      matcher: javascript.extended.ESX,
      matchers: {quote: matchers.quote, closure: javascript.extended.CLOSURE},
    }),
    {
      defaults: {get: () => ({...esx.DEFAULTS})},
    },
  );

  mjs.DEFAULTS = {syntax: 'mjs', aliases: ['esm'], requires: [javascript.defaults.syntax]};
  cjs.DEFAULTS = {syntax: 'cjs', requires: [javascript.defaults.syntax]};
  esx.DEFAULTS = {syntax: 'esx', requires: [javascript.defaults.syntax, 'cjs', 'mjs']};

  javascript.extended = {};
  // TODO: Undo $ matching once fixed
  javascript.extended.QUOTES = /`|"(?:[^\\"]+|\\.)*(?:"|$)|'(?:[^\\']+|\\.)*(?:'|$)/g;
  javascript.extended.COMMENTS = /\/\/.*(?:\n|$)|\/\*[^]*?(?:\*\/|$)|^\#\!.*\n|<!--/g;
  javascript.extended.STATEMENTS = all(
    javascript.extended.QUOTES,
    javascript.CLOSURES,
    javascript.REGEXPS,
    javascript.extended.COMMENTS,
  );
  javascript.extended.BLOCKLEVEL = sequence`(\n|\s+)|(${javascript.extended.STATEMENTS})`;
  javascript.extended.TOPLEVEL = sequence`(\n|\s+)|(${javascript.extended.STATEMENTS})`;
  javascript.extended.CLOSURE = sequence`(\n+)|(${javascript.extended.STATEMENTS})`;
  javascript.extended.MJS = sequence`${javascript.extended.TOPLEVEL}|\bexport\b|\bimport\b`;
  javascript.extended.CJS = sequence`${javascript.extended.BLOCKLEVEL}|\bexports\b|\bmodule.exports\b|\brequire\b|\bimport(?=\(|\.)`;
  javascript.extended.ESX = sequence`${javascript.extended.BLOCKLEVEL}|\bexports\b|\bimport\b|\bmodule.exports\b|\brequire\b`;

  const modes = /*#__PURE__*/Object.freeze({
    __proto__: null,
    css: css,
    html: html,
    markdown: markdown,
    javascript: javascript,
    typescript: typescript,
    mjs: mjs,
    cjs: cjs,
    esx: esx
  });

  const experimentalExtendedParser = (() => new Parser({url: (document.currentScript && document.currentScript.src || new URL('tokenizer.browser.js', document.baseURI).href), modes}))();

  //@ts-check

  class TokenizerAPI {
    /** @param {API.Options} [options] */
    constructor(options) {
      /** @type {API.Options} */
      const {
        parsers = [],
        tokenize = /** @type {API.tokenize} */ ((source, options = {}, flags) => {
          /** @type {{[name: string]: any} & TokenizerAPI.State} */
          const state = new TokenizerAPI.State({options, flags: {}});
          //@ts-ignore
          const variant = !options.variant ? 1 : parseInt(options.variant);
          const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
          this.lastVariant === (this.lastVariant = variant) ||
            variant <= parsers.length ||
            console.warn(
              '[tokenize‹parser›] Variant %O[%d] out of bounds — using default parser: %o',
              parsers,
              variant,
              parser.MODULE_URL || {parser},
            );
          options.tokenize = parser.tokenize;
          if (flags && (flags.length > 0 || flags.size > 0)) {
            typeof flags === 'string' || (flags = [...flags].join(' '));
            /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
            /\bdebug\b/i.test(flags) && (state.flags.debug = true);
          }

          let returned = UNSET;
          try {
            this.lastParser === (this.lastParser = parser) ||
              console.info('[tokenize‹parser›]: %o', parser.MODULE_URL || {parser});
            //@ts-ignore
            return (returned = parser.tokenize((this.lastSource = source), (this.lastState = state)));
          } finally {
            returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
          }
        }),

        warmup = (source, options, flags) => {
          const key = (options && JSON.stringify(options)) || '';
          let cache = (this.cache || (this.cache = new Map())).get(key);
          cache || this.cache.set(key, (cache = new Set()));
          if (!cache.has(source)) {
            cache.add(source);
            flags = `warmup ${(flags &&
            (flags.length > 0 || flags.size > 0) &&
            (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
            ''}`;
            const tokens = tokenize(source, options, flags);
            const snapshot = {...this};
            for (const item of tokens);
            console.log('[tokenize‹warmup›]: %o', snapshot);
          }
        },

        render,
      } = options;

      Object.defineProperties(this, {
        tokenize: {get: () => tokenize},
        warmup: {get: () => warmup},
        render: {get: () => render},
        parsers: {get: () => parsers},
      });
    }
  }

  Object.freeze(Object.setPrototypeOf(TokenizerAPI.prototype, null));

  TokenizerAPI.State = class State {
    constructor(...properties) {
      Object.assign(this, ...properties);
    }
  };

  Object.freeze(Object.setPrototypeOf(TokenizerAPI.State.prototype, null));

  const UNSET = Symbol('');

  /**
   * @typedef {import('./legacy/parser.js').Parser & {MODULE_URL?: string, tokenize?: API.tokenize}} Parser
   * @typedef {Partial<{variant?: number | string, fragment?: Fragment, [name: string]: any}>} Parser.Options
   */

  /**
   * @typedef {TokenizerAPI & {tokenize: API.tokenize, warmup: API.warmup, render: API.render, parsers: Parser[]}} API
   * @typedef {TokenizerAPI.State} API.State
   * @typedef {Partial<Pick<API, 'tokenize' | 'warmup' | 'render' | 'parsers'>>} API.Options
   * @typedef {<T extends {}>(source: string, options: Parser.Options, flags?: Flags) => IterableIterator<T>} API.tokenize
   * @typedef {(source: string, options: Parser.Options, flags?: Flags) => void} API.warmup
   * @typedef {(source: string, options: Parser.Options, flags?: Flags) => Promise<Fragment>} API.render
   */

  /**
   * @typedef {(string | Array<string> | Set<string>) & {length?: number, size?: number}} Flags
   * @typedef {DocumentFragment & {logs?: string[]}} Fragment
   */

  /** @param {Pick<typeof globalThis, 'document'|'DocumentFragment'|'Element'|'Object'|'Node'|'Text'>} endowments */
  const createNativeDOM = (endowments = globalThis) => {
    if (
      !(
        typeof endowments === 'object' &&
        typeof endowments.document === 'object' &&
        ['createElement', 'createTextNode', 'createDocumentFragment'].every(
          method => typeof endowments.document[method] === 'function',
        )
      )
    )
      return (endowments = undefined);

    const native = {};

    native.Object = endowments.Object || globalThis.Object;
    // dom.String = endowments.String || globalThis.String;
    // dom.Set = endowments.Set || globalThis.Set;
    // dom.Symbol = endowments.Symbol || globalThis.Symbol;
    native.document = endowments.document;

    /** @type {typeof endowments.DocumentFragment} */
    native.DocumentFragment = endowments.DocumentFragment || native.document.createDocumentFragment().constructor;

    /** @type {typeof endowments.Element} */
    native.Element =
      endowments.Element ||
      (() => {
        let prototype = native.document.createElement('span');
        while (
          prototype.constructor &&
          prototype.constructor.name.startsWith('HTML') &&
          prototype !== (prototype = native.Object.getPrototypeOf(prototype) || prototype)
        );
        return prototype.constructor.name === 'Element' ? prototype.constructor : undefined;
      })();

    /** @type {typeof endowments.Node} */
    native.Node =
      endowments.Node ||
      (native.Element &&
        (() => {
          let prototype = native.Object.getPrototypeOf(native.Element.prototype);
          return prototype.constructor.name === 'Node' ? prototype.constructor : undefined;
        })());

    /** @type {typeof endowments.Text} */
    native.Text = endowments.Text || native.document.createTextNode('').constructor;

    native.createElement = (tag, properties, ...children) => {
      const element = native.document.createElement(tag);
      properties && native.Object.assign(element, properties);
      if (!children.length) return element;
      if (element.append) {
        while (children.length > 500) element.append(...children.splice(0, 500));
        children.length && element.append(...children);
      } else if (element.appendChild) {
        for (const child of children) element.appendChild(child);
      }
      return element;
    };
    native.createText = (content = '') => native.document.createTextNode(content);
    native.createFragment = () => native.document.createDocumentFragment();

    endowments = undefined;

    return native.Object.freeze(/** @type {typeof native} */ (native.Object.setPrototypeOf(native, null)));
  };

  /** @param {Pick<typeof globalThis, 'Object'|'Set'|'String'|'Symbol'>} endowments */
  const createPseudoDOM = (endowments = globalThis) => {
    const pseudo = {};

    pseudo.Object = endowments.Object || globalThis.Object;
    pseudo.Set = endowments.Set || globalThis.Set;
    pseudo.String = endowments.String || globalThis.String;
    pseudo.Symbol = endowments.Symbol || globalThis.Symbol;

    Pseudom.checkPrimordialEndowments(pseudo, ...['Object', 'Set', 'String', 'Symbol']);

    pseudo.document = null;

    pseudo.CSSStyleDeclaration = class CSSStyleDeclaration extends pseudo.Object {
      get cssText() {
        const cssProperties = [];

        for (const [key, value] of pseudo.Object.entries(this))
          typeof key !== 'string' ||
            key !== key.trim() ||
            // NOTE: We only ever expect strings and numbers
            !(typeof value === 'string' ? value.trim() : typeof value === 'number' ? !isNaN(value) : null) ||
            cssProperties.push(`${key}: ${CSSStyleDeclaration.normalizeValue(value)}`);

        return cssProperties.join(';');
      }

      toString() {
        return this.cssText;
      }

      toJSON() {
        return this.toString();
      }

      static normalizeValue(value) {
        return value || value === 0 ? /\s*;*$/[pseudo.Symbol.replace](value, '') : '';
      }
    };

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.CSSStyleDeclaration).prototype);

    pseudo.DOMStringMap = class DOMStringMap extends pseudo.Object {};

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMStringMap).prototype);

    // TODO: Consider support for Element.classList
    //       For now we list the simplicity of Element.className
    pseudo.DOMTokenList = class DOMTokenList extends pseudo.Set {
      toString() {
        return [...this].join(' ');
      }

      toJSON() {
        return this.toString();
      }

      static normalizeString(string) {
        return string ? /[\n\t\s]+/g[pseudo.Symbol.replace](string, ' ').trim() : '';
      }

      static from(...list) {
        return new DOMTokenList(DOMTokenList.normalizeList(...list).split(' '));
      }

      static normalizeList(...list) {
        return list.length ? DOMTokenList.normalizeString(list.filter(Boolean).join(' ')) : '';
      }
    };

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMTokenList).prototype);

    pseudo.NodeList = class NodeList extends pseudo.Set {};

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.NodeList).prototype);

    pseudo.Node = class Node extends pseudo.Object {
      get childNodes() {
        return pseudo.Object.defineProperty(this, 'childNodes', {value: new pseudo.NodeList()}).childNodes;
      }

      get childElementCount() {
        return (this.hasOwnProperty('childNodes') && this.childNodes.size) || 0;
      }

      get textContent() {
        return (this.hasOwnProperty('childNodes') && this.childNodes.size && [...this.childNodes].join('')) || '';
      }

      set textContent(text) {
        this.hasOwnProperty('childNodes') && this.childNodes.size && this.childNodes.clear();
        text && this.appendChild(new pseudo.Text(text));
      }

      insertBefore(node, nextNode) {
        if (!this.childNodes.has(nextNode))
          throw ReferenceError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a child.`);
        if (!(node !== null && typeof node === 'object' && node instanceof Node))
          throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 1 is not a Node.`);
        if (!(nextNode !== null && typeof nextNode === 'object' && nextNode instanceof Node))
          throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a Node.`);
        node.parentNode == null || node.parentNode.removeChild(node);
        pseudo.Object.defineProperties(node, {
          parentNode: {value: this, writable: false, configurable: true},
          previousSibling: {value: nextNode.previousSibling || null, writable: false, configurable: true},
          nextSibling: {value: nextNode, writable: false, configurable: true},
        });
        !nextNode.previousSibling
          ? pseudo.Object.defineProperty(this, 'firstNode', {value: node, writable: false, configurable: true})
          : pseudo.Object.defineProperty(nextNode.previousSibling, 'nextSibling', {
              value: node,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperty(nextNode, 'previousSibling', {value: node, writable: false, configurable: true});
        const childNodes = [...this.childNodes];
        childNodes.splice(childNodes.indexOf(nextNode), 0, node);
        this.childNodes.clear();
        this.childNodes.add(...childNodes);
        return node;
      }

      appendChild(node) {
        if (!(node !== null && typeof node === 'object' && node instanceof Node))
          throw TypeError(`Failed to execute 'appendChild' on 'Node': 1 argument required, but only 0 present.`);
        node.parentNode == null || node.parentNode.removeChild(node);
        pseudo.Object.defineProperties(node, {
          parentNode: {value: this, writable: false, configurable: true},
          previousSibling: {value: this.lastChild || null, writable: false, configurable: true},
          nextSibling: {value: null, writable: false, configurable: true},
        });
        !node.previousSibling ||
          pseudo.Object.defineProperties(node.previousSibling, {
            nextSibling: {value: node, writable: false, configurable: true},
          });
        pseudo.Object.defineProperties(this, {
          firstChild: {value: this.firstChild || node, writable: false, configurable: true},
          lastChild: {value: node, writable: false, configurable: true},
        });
        this.childNodes.add(node);
        return node;
      }

      removeChild(node) {
        if (!(node && node.parentNode === this))
          throw TypeError(`Failed to execute 'removeChild' on 'Node': 1 argument required, but only 0 present.`);

        node.previousSibling
          ? pseudo.Object.defineProperty(node.previousSibling, 'nextSibling', {
              value: node.nextSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'firstChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        node.nextSibling
          ? pseudo.Object.defineProperty(node.nextSibling, 'previousSibling', {
              value: node.previousSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'lastChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperties(node, {
          parentNode: {value: null, writable: false, configurable: true},
          previousSibling: {value: null, writable: false, configurable: true},
          nextSibling: {value: null, writable: false, configurable: true},
        });
        this.childNodes.delete(node);
        return node;
      }
    };

    pseudo.Node.prototype.firstChild = /** @type {Node|null} */ (null);
    pseudo.Node.prototype.lastChild = /** @type {Node|null} */ (null);
    pseudo.Node.prototype.previousSibling = /** @type {Node|null} */ (null);
    pseudo.Node.prototype.nextSibling = /** @type {Node|null} */ (null);
    pseudo.Node.prototype.parentNode = /** @type {Node|null} */ (null);
    pseudo.Node.prototype.parentElement = /** @type {Node|null} */ (null);
    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Node).prototype);

    pseudo.HTMLCollection = class HTMLCollection extends pseudo.Set {
      get length() {
        return this.size;
      }
    };

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.HTMLCollection).prototype);

    pseudo.ParentNode = class ParentNode extends pseudo.Node {
      get children() {
        return pseudo.Object.defineProperty(this, 'children', {value: new pseudo.HTMLCollection()}).children;
      }

      get childElementCount() {
        return ('children' in this && this.children.length) || 0;
      }

      append(...nodes) {
        if (nodes.length)
          for (const node of nodes)
            node === '' || this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node));
      }

      prepend(...nodes) {
        if (nodes.length)
          for (const node of nodes)
            node === '' ||
              (this.childElementCount > 0
                ? this.insertBefore(typeof node === 'object' ? node : new pseudo.Text(node), this.firstChild)
                : this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node)));
      }

      insertBefore(node, nextNode) {
        super.insertBefore(node, nextNode);
        if (node instanceof pseudo.Element) {
          pseudo.Object.defineProperties(node, {
            parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
            previousElementSibling: {value: nextNode.previousElementSibling || null, writable: false, configurable: true},
            nextElementSibling: {value: nextNode, writable: false, configurable: true},
          });
          !nextNode.previousElementSibling
            ? pseudo.Object.defineProperty(this, 'firstElementChild', {value: node, writable: false, configurable: true})
            : pseudo.Object.defineProperty(nextNode.previousElementSibling, 'nextElementSibling', {
                value: node,
                writable: false,
                configurable: true,
              });
          pseudo.Object.defineProperty(nextNode, 'previousElementSibling', {
            value: node,
            writable: false,
            configurable: true,
          });
          const children = [...this.children];
          children.splice(children.indexOf(nextNode), 0, node);
          this.children.clear();
          this.children.add(...children);
        }
        return node;
      }

      appendChild(node) {
        super.appendChild(node);
        if (node instanceof pseudo.Element) {
          pseudo.Object.defineProperties(node, {
            parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
            previousElementSibling: {value: this.lastElementChild || null, writable: false, configurable: true},
            nextElementSibling: {value: null, writable: false, configurable: true},
          });
          !node.previousElementSibling ||
            pseudo.Object.defineProperty(node.previousElementSibling, 'previousElementSibling', {
              value: node,
              writable: false,
              configurable: true,
            });
          pseudo.Object.defineProperties(this, {
            firstElementChild: {value: this.firstElementChild || node, writable: false, configurable: true},
            lastElementChild: {value: node, writable: false, configurable: true},
          });
          this.children.add(node);
        }
        return node;
      }

      removeChild(node) {
        super.removeChild(node);
        if (node instanceof pseudo.Element) {
          node.previousElementSibling
            ? pseudo.Object.defineProperty(node.previousElementSibling, 'nextElementSibling', {
                value: node.nextElementSibling || null,
                writable: false,
                configurable: true,
              })
            : pseudo.Object.defineProperty(this, 'firstElementChild', {
                value: null,
                writable: false,
                configurable: true,
              });
          node.nextElementSibling
            ? pseudo.Object.defineProperty(node.nextElementSibling, 'previousElementSibling', {
                value: node.previousElementSibling || null,
                writable: false,
                configurable: true,
              })
            : pseudo.Object.defineProperty(this, 'lastElementChild', {
                value: null,
                writable: false,
                configurable: true,
              });
          pseudo.Object.defineProperties(node, {
            parentElement: {value: null, writable: false, configurable: true},
            previousElementSibling: {value: null, writable: false, configurable: true},
            nextElementSibling: {value: null, writable: false, configurable: true},
          });
          this.children.delete(node);
        }
        return node;
      }
    };

    pseudo.ParentNode.prototype.firstElementChild = /** @type {Element|null} */ (null);
    pseudo.ParentNode.prototype.lastElementChild = /** @type {Element|null} */ (null);
    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.ParentNode).prototype);

    pseudo.Element = class Element extends pseudo.Node {
      get style() {
        if (this && this !== this.constructor.prototype)
          return pseudo.Object.defineProperty(this, 'style', {
            value: new pseudo.CSSStyleDeclaration(),
            writable: false,
            configurable: true,
          }).style;
        throw Error(`Invalid invocation of Element.style getter/setter.`);
      }

      set style(value) {
        value == null || pseudo.Object.assign(this.style, {...value});
      }

      get dataset() {
        if (this && this !== this.constructor.prototype)
          return pseudo.Object.defineProperty(this, 'dataset', {
            value: new pseudo.DOMStringMap(),
            writable: false,
            configurable: true,
          }).dataset;
        throw Error(`Invalid invocation of Element.dataset getter/setter.`);
      }

      set dataset(value) {
        value == null || pseudo.Object.assign(this.dataset, {...value});
      }

      get innerHTML() {
        return this.textContent;
      }

      set innerHTML(text) {
        this.textContent = text;
      }

      get outerHTML() {
        let {className, tag, innerHTML, dataset} = this;

        className && (className = className.trim()) && (className = pseudo.DOMTokenList.normalizeString(className));

        const openTag = [tag];

        className && openTag.push(`class="${className}"`);

        if (this.hasOwnProperty('style')) openTag.push(`style=${JSON.stringify(this.style.cssText)}`);

        if (this.hasOwnProperty('dataset'))
          for (const [key, value] of pseudo.Object.entries(this.dataset))
            typeof key !== 'string' ||
              key !== key.trim() ||
              value == null ||
              typeof value === 'symbol' ||
              openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

        return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
      }

      toString() {
        return this.outerHTML;
      }

      toJSON() {
        return this.toString();
      }

      remove() {
        this.parentElement && this.parentElement.removeChild(this);
      }
    };

    pseudo.Object.defineProperties(pseudo.Element.prototype, {
      children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
      childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
      append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
      prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
      appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
      removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
      insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
      firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
      lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
    });

    pseudo.Element.prototype.previousElementSibling = /** @type {Element|null} */ (null);
    pseudo.Element.prototype.nextElementSibling = /** @type {Element|null} */ (null);
    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Element).prototype);

    pseudo.DocumentFragment = class DocumentFragment extends pseudo.Node {
      toString() {
        return this.textContent;
      }

      toJSON() {
        return (this.childElementCount && [...this.childNodes]) || [];
      }

      [pseudo.Symbol.iterator]() {
        return ((this.childElementCount && this.childNodes) || '')[pseudo.Symbol.iterator]();
      }
    };

    pseudo.Object.defineProperties(pseudo.DocumentFragment.prototype, {
      children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
      childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
      append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
      prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
      appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
      removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
      insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
      firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
      lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
    });

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DocumentFragment).prototype);

    /** @type {typeof globalThis.Text} */
    pseudo.Text = class Text extends pseudo.Node {
      constructor(textContent) {
        pseudo.Object.defineProperty(super(), 'textContent', {
          value: `${textContent}`,
          writable: false,
          configurable: true,
        });
      }
      toString() {
        return Pseudom.encodeEntities(this.textContent.toString());
      }
    };

    pseudo.Object.defineProperties(pseudo.Text.prototype, {
      textContent: {value: '', writable: false, configurable: true},
    });

    pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Text).prototype);

    pseudo.createElement = pseudo.Object.freeze((tag, properties, ...children) => {
      const element = new pseudo.Element();
      element.tag = tag;
      properties == null ||
        (({dataset: element.dataset, className: element.className, ...element.properties} = properties),
        element.className || (element.className = ''));
      children.length && element.append(...children);
      return element;
    });

    pseudo.createText = pseudo.Object.freeze((content = '') => new pseudo.Text(content));

    pseudo.createFragment = pseudo.Object.freeze(() => new pseudo.DocumentFragment());

    endowments = undefined;

    // console.log(pseudo);

    return pseudo.Object.freeze(pseudo);
  };

  const pseudo = createPseudoDOM(globalThis);
  const native =
    globalThis.document && globalThis.document.defaultView === globalThis && createNativeDOM(globalThis);

  /// <reference lib="esnext.asynciterable" />
  /**
   * @template T
   * @typedef {Promise<T> | T} async
   */

  /**
   * @template T
   * @typedef {{next(): async<IteratorResult<async<T>>>}} iterator
   */

  /**
   * @template T
   * @typedef {iterator<T> | {[Symbol.iterator](): iterator<T>}  | {[Symbol.asyncIterator](): iterator<T>}} iterable
   */

  /**
   * @template T, U
   * @param {iterable<T>} iterable
   * @param {(value: T) => U} ƒ
   */
  async function each(iterable, ƒ) {
    const iterator =
      (iterable && ('next' in iterable && typeof iterable.next === 'function' && iterable)) ||
      ((Symbol.asyncIterator in iterable && iterable[Symbol.asyncIterator]()) ||
        (Symbol.iterator in iterable && iterable[Symbol.iterator]()));
    try {
      if (iterator || typeof iterator.next === 'function') {
        let result, done;
        while (!done && (result = await iterator.next())) {
          await ƒ(await result.value);
          done = result.done;
        }
      }
    } finally {
      iterator &&
        iterable !== iterator &&
        'return' in iterator &&
        typeof iterator.return === 'function' &&
        iterator.return();
    }
  }

  //@ts-check

  /// IMPLEMENTATION

  class MarkupRenderer {
    constructor(options) {
      this.defaults = new.target.defaults || MarkupRenderer.defaults;

      Object.isFrozen(this.defaults) || Object.freeze((this.defaults = {...this.defaults}));

      this.options = {defaults: this.defaults, ...this.defaults, ...options};

      this.options.MARKUP_CLASS =
        /^\w+$|$/.exec(this.options.MARKUP_CLASS || this.defaults.MARKUP_CLASS)[0].toLowerCase() || 'markup';

      this.classes = {MARKUP_CLASS: this.options.MARKUP_CLASS, ...this.defaults.classes, ...this.options.classes};

      if (this.options.classes !== this.defaults.classes || this.options.MARKUP_CLASS !== this.defaults.MARKUP_CLASS) {
        const prefix = /^\w+(?=-|$)/;
        for (const [key, value] of Object.entries(this.classes)) {
          if (key === 'MARKUP_CLASS') continue;
          if (typeof key !== 'string') continue;
          if (!prefix.test(value) && key.includes('_'))
            throw Error(`Invalid MarkupRenderer class ‹{${key}: ${JSON.stringify(value)}›.`);
          this.classes[key] = /^\w+(?=-|$)/
            [Symbol.replace](
              value || this.defaults.classes[key] || key.toLowerCase().replace(/_/g, '-'),
              this.options.MARKUP_CLASS,
            )
            .toLowerCase();
        }
      }

      this.classes.MARKUP_SPACE = `whitespace ${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_WHITESPACE}`;
      this.classes.MARKUP_COMMENT = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ANNOTATION}`;
      this.classes.MARKUP_KEYWORD = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_ENTITY}`;
      this.classes.MARKUP_IDENTIFIER = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_IDENTITY}`;
      this.classes.MARKUP_LITERAL = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-literal`;
      this.classes.MARKUP_SPAN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-span`;
      this.classes.MARKUP_STRING = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-string`;
      this.classes.MARKUP_PATTERN = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-pattern`;
      this.classes.MARKUP_PUNCTUATOR = `${this.classes.MARKUP_TOKEN} ${this.classes.MARKUP_CLASS}-punctuator`;

      this.elements = {...this.defaults.elements, ...this.options.elements};

      this.options.classes = Object.freeze(this.classes);

      this.dom = this.options.dom || (this.options.dom = new.target.dom || MarkupRenderer.dom);

      Object.freeze(this.options);

      this.renderers = {
        line: new.target.factory(
          this.elements.LINE,
          {markupHint: '', markupClass: this.classes.MARKUP_LINE},
          this.options,
        ),
        fault: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `fault`, markupClass: this.classes.MARKUP_FAULT},
          this.options,
        ),
        text: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `text`, markupClass: this.classes.MARKUP_TOKEN},
          this.options,
        ),
        sequence: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `sequence`, markupClass: this.classes.MARKUP_TOKEN},
          this.options,
        ),

        whitespace: this.dom.Text,

        inset: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `inset`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
          this.options,
        ),

        break: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `break`, markupClass: `whitespace ${this.classes.MARKUP_SPACE}`},
          this.options,
        ),

        comment: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `comment`, markupClass: this.classes.MARKUP_COMMENT},
          this.options,
        ),

        keyword: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `keyword`, markupClass: this.classes.MARKUP_KEYWORD},
          this.options,
        ),
        identifier: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `identifier`, markupClass: this.classes.MARKUP_IDENTIFIER},
          this.options,
        ),

        literal: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `literal`, markupClass: this.classes.MARKUP_LITERAL},
          this.options,
        ),
        number: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `number`, markupClass: `literal ${this.classes.MARKUP_LITERAL}`},
          this.options,
        ),
        string: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `string`, markupClass: this.classes.MARKUP_STRING},
          this.options,
        ),
        quote: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `quote`, markupClass: `string ${this.classes.MARKUP_STRING}`},
          this.options,
        ),
        pattern: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `pattern`, markupClass: this.classes.MARKUP_PATTERN},
          this.options,
        ),

        punctuator: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `punctuator`, markupClass: `${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        operator: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `operator`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        assigner: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `assigner`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        combinator: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {
            markupHint: `combinator`,
            markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`,
          },
          this.options,
        ),
        delimiter: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `delimiter`, markupClass: `punctuator operator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        punctuation: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `punctuation`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        breaker: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `breaker`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        opener: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `opener`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        closer: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `closer`, markupClass: `punctuator ${this.classes.MARKUP_PUNCTUATOR}`},
          this.options,
        ),
        span: new.target.factory(
          this.elements.MARKUP_TOKEN,
          {markupHint: `span`, markupClass: `${this.classes.MARKUP_SPAN}`},
          this.options,
        ),
      };
    }

    async render(tokens, fragment) {
      let logs, template, first, elements;
      try {
        fragment || (fragment = MarkupRenderer.dom.Fragment());
        logs = fragment.logs; // || (fragment.logs = []);
        elements = this.renderer(tokens);
        if ((first = await elements.next()) && 'value' in first) {
          template = MarkupRenderer.dom.Template();
          if (!MarkupRenderer.dom.native && template && 'textContent' in fragment) {
            logs && logs.push(`render method = 'text' in template`);
            const body = [first.value];
            first.done || (await each(elements, element => element && body.push(element)));
            template.innerHTML = body.join('');
            fragment.appendChild(template.content);
          } else if ('push' in fragment) {
            logs && logs.push(`render method = 'push' in fragment`);
            fragment.push(first.value);
            first.done || (await each(elements, element => element && fragment.push(element)));
          } else if ('append' in fragment) {
            logs && logs.push(`render method = 'append' in fragment`);
            fragment.append(first.value);
            first.done || (await each(elements, element => element && fragment.append(element)));
          }
        }
        return fragment;
      } finally {
        template && (template.innerHTML = '');
        template = fragment = logs = elements = first = null;
      }
    }

    *renderer(tokens) {
      let renderedLine, LineInset, normalizedLineInset, normalizedLineText, lineBreak, insetHint;
      let type, text, punctuator, hint, lineInset, lineBreaks, renderer;
      const {
        renderers,
        options: {REFLOW: reflows},
      } = this;
      const Lines = /^/gm;
      const Tabs = /\t+/g;
      const createLine = reflows
        ? () => (renderedLine = renderers.line())
        : () => (renderedLine = renderers.line('', 'no-reflow'));
      const emit = (renderer, text, type, hint) => {
        text == null && (text = '');
        (renderedLine || createLine()).appendChild(renderer(text, hint || type));
        if (type === 'inset') {
          renderedLine.style['--markup-line-inset-spaces'] =
            text.length - (renderedLine.style['--markup-line-inset-tabs'] = text.length - text.replace(Tabs, '').length);
          renderedLine.dataset['markup-line-inset'] = text;
        }
      };
      const emitInset = (text, hint) => emit(renderers.inset, text, 'inset', hint);
      const emitBreak = hint => emit(renderers.break, '\n', 'break', hint);

      for (const token of tokens) {
        if (!token || !token.text) continue;

        ({type = 'text', text, punctuator, hint, lineInset, lineBreaks} = token);

        renderer =
          (punctuator &&
            (renderers[punctuator] || (type && renderers[type]) || renderers.punctuator || renderers.operator)) ||
          (type && (renderers[type] || (type !== 'whitespace' && type !== 'break' && renderers.text))) ||
          MarkupRenderer.dom.Text;

        // Normlize inset for { type != 'inset', inset = /\s+/ }
        if (reflows && lineBreaks && type !== 'break') {
          LineInset = void (lineInset = lineInset || '');
          insetHint = `${hint || ''} in-${type || ''}`;
          for (const normlizedline of text.split(Lines)) {
            (normalizedLineInset = normlizedline.startsWith(lineInset)
              ? normlizedline.slice(0, lineInset.length)
              : normlizedline.match(LineInset || (LineInset = RegExp(`^${lineInset.replace(/./g, '$&?')}|`)))[0]) &&
              emitInset(normalizedLineInset, insetHint);

            (normalizedLineText = normalizedLineInset
              ? normlizedline.slice(normalizedLineInset.length)
              : normlizedline) &&
              ((normalizedLineText === '\n'
                ? ((lineBreak = normalizedLineText), (normalizedLineText = ''))
                : normalizedLineText.endsWith('\n')
                ? ((lineBreak = '\n'),
                  (normalizedLineText = normalizedLineText.slice(0, normalizedLineText.endsWith('\r\n') ? -2 : -1)))
                : !(lineBreak = '')) && emit(renderer, normalizedLineText, type, hint),
              lineBreak && (emitBreak(), renderedLine && (renderedLine = void (yield renderedLine))));
          }
        } else {
          // TODO: See if pseudom children can be optimized for WBR/BR clones
          emit(renderer, text, type, hint);
          type === 'break'
            ? renderedLine && (renderedLine = void (yield renderedLine))
            : type === 'whitespace' ||
              //@ts-ignore
              renderedLine.appendChild(MarkupRenderer.dom.Element('wbr'));
        }
      }
      renderedLine && (yield renderedLine);
    }

    /**
     * @template {{markupHint: string}} T
     * @param {string} tagName
     * @param {T & Partial<HTMLElement>} properties
     * @param {MarkupRenderer['options']} [options]
     * @param {typeof MarkupRenderer['dom']} [dom]
     */
    static factory(tagName, properties, options, dom) {
      let defaults = /** @type {MarkupRenderer['options']} */ ((this &&
        Object.prototype.isPrototypeOf.call(MarkupRenderer, this) &&
        this.defaults) ||
        MarkupRenderer.defaults);
      let markupClass = defaults.MARKUP_CLASS;
      let markupHint = '';
      ({
        0: tagName = 'span',
        2: options = defaults,
        3: dom = options.dom || MarkupRenderer.dom,
      } = /** @type {*} */ (arguments));

      //@ts-ignore
      ({markupClass = options.MARKUP_CLASS || markupClass, markupHint = '', ...properties} = /** @type {*} */ ({
        ...properties,
      }));

      properties.className = `${markupHint ? `${markupClass} ${markupHint}` : markupClass} ${
      options.MARKUP_CLASS || defaults.MARKUP_CLASS
    }`;

      return new (this.Factory || MarkupRenderer.Factory)({tagName, options, markupHint, markupClass, properties, dom})
        .render;
    }
  }

  {
    const defaults = {};

    /** Specifies the intended mode for rendering a token @type {'html'} */
    defaults.MODE = 'html';
    /** Tag name of the element to use for rendering a token. */
    defaults.SPAN = 'span';
    /** Tag name of the element to use for grouping tokens in a single line. */
    defaults.LINE = 'span';
    /** The bare class name for all rendered markup nodes. */
    defaults.MARKUP_CLASS = 'markup';
    /** Enable renderer-side unpacking { inset } || { breaks > 0 } tokens */
    defaults.REFLOW = true;

    defaults.elements = {
      MARKUP_LINE: 'span',
      MARKUP_TOKEN: 'span',
    };

    defaults.classes = {
      /** The bare class name for all rendered markup nodes. */
      MARKUP_CLASS: 'markup',
      /** The prefixed class name for rendered markup lines. */
      MARKUP_LINE: 'markup-line',
      /** The prefixed class name for rendered markup tokens. */
      MARKUP_TOKEN: 'markup-token',
      /** The prefixed class name for rendered markup tokens. */
      MARKUP_FAULT: 'markup-fault',
      /** The prefixed class name for rendered markup whitespace tokens. */
      MARKUP_WHITESPACE: 'markup-whitespace',
      /** The prefixed class name for rendered markup punctuation tokens. */
      MARKUP_PUNCTUATION: 'markup-punctuation',
      /** The prefixed class name for rendered markup annotation tokens. */
      MARKUP_ANNOTATION: 'markup-annotation',
      /** The prefixed class name for rendered markup entity tokens. */
      MARKUP_ENTITY: 'markup-entity',
      /** The prefixed class name for rendered markup identity tokens. */
      MARKUP_IDENTITY: 'markup-identity',
      /** The prefixed class name for rendered markup atoms. */
      MARKUP_ATOM: 'markup-atom',
    };

    MarkupRenderer.defaults = defaults;

    Object.freeze(defaults);
  }

  MarkupRenderer.Factory = class Factory {
    /** @param {{tagName: string, markupHint: string, markupClass: string, properties: Partial<HTMLElement>, options: MarkupRenderer['options'], dom: typeof MarkupRenderer['dom']}} configuration */
    constructor({tagName, markupHint, markupClass, properties, options, dom}) {
      this.tagName = tagName;
      this.properties = Object.freeze({...properties});
      this.markupHint = markupHint || '';
      this.markupClass = markupClass || MarkupRenderer.defaults.MARKUP_CLASS;
      this.options = options;
      this.dom = dom;
      this.render = this.render.bind(this);
      Object.freeze(this);
    }

    render(content, hint) {
      let element, hintSeparator;

      element =
        (typeof content === 'string' && (content = this.dom.Text(content))) || content != null
          ? this.dom.Element(this.tagName, this.properties, content)
          : this.dom.Element(this.tagName, this.properties);

      typeof hint === 'string' && hint !== '' && (hintSeparator = hint.indexOf('\n\n')) !== -1
        ? ((element.dataset = {
            'markup-hint': `${this.markupHint}${this.dom.escape(hint.slice(hintSeparator))}`,
          }),
          hintSeparator === 0 || (element.className = `${element.className} ${hint.slice(0, hintSeparator)}`))
        : (hint && (element.className = `${element.className} ${hint}`),
          (element.dataset = {'markup-hint': hint || this.markupHint || element.className}));

      return element;
    }
  };

  MarkupRenderer.dom = (() => {
    /** Uses lightweight proxy objects that can be serialized into HTML text */
    const HTML_MODE = MarkupRenderer.defaults.MODE === 'html';
    const supported = !!native;
    const native$1 = !HTML_MODE && supported;
    const implementation = native$1 ? native : pseudo;
    const {createElement: Element, createText: Text, createFragment: Fragment} = implementation;
    const Template = template =>
      !supported || Template.supported === false
        ? false
        : Template.supported === true
        ? document.createElement('template')
        : (Template.supported = !!(
            (template = document.createElement('template')) && 'HTMLTemplateElement' === (template.constructor || '').name
          )) && template;
    const escape = /** @type {(source: string) => string} */ (((replace, replacement) => string =>
      replace(string, replacement))(
      RegExp.prototype[Symbol.replace].bind(/[\0-\x1F"\\]/g),
      m => `&#x${m.charCodeAt(0).toString(16)};`,
    ));

    Template.supported = undefined;

    return Object.freeze({supported, native: native$1, implementation, escape, Element, Text, Fragment, Template});
  })();

  /// INTERFACE

  const markupDOM = new MarkupRenderer();

  /** @type {{experimentalExtendedAPI: import('../lib/api').API}} */
  const {
    experimentalExtendedAPI,
    experimentalExtendedAPI: {parsers, render, tokenize, warmup},
  } = {
    //@ts-ignore
    experimentalExtendedAPI: new TokenizerAPI({
      parsers: [experimentalExtendedParser],
      render: (source, options, flags) => {
        const fragment = options && options.fragment;
        const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

        debugging &&
          console.info('render: %o', {api: experimentalExtendedAPI, source, options, flags, fragment, debugging});
        fragment && (fragment.logs = debugging ? [] : undefined);

        return markupDOM.render(tokenize(source, options, flags), fragment);
      },
    }),
  };

  exports.default = experimentalExtendedAPI;
  exports.encodeEntities = encodeEntities;
  exports.encodeEntity = encodeEntity;
  exports.entities = entities;
  exports.parsers = parsers;
  exports.render = render;
  exports.tokenize = tokenize;
  exports.warmup = warmup;

  return exports;

}({}));
//# sourceMappingURL=tokenizer.browser.js.map
