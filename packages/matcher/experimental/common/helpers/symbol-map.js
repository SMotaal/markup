// @ts-check

/**
 * @typedef {Readonly<{symbol: symbol, description: string}>} Definition
 * @extends {Map<string|symbol, Definition>}
 */
export class SymbolMap extends Map {
  /**
   * @param {*} description
   * @param {symbol} [symbol]
   * @returns {symbol}
   */
  define(description, symbol) {
    /** @type {Definition} */ let definition;

    description = ((arguments.length > 0 && typeof description !== 'symbol') || undefined) && String(description);

    if (description === undefined) {
      throw new TypeError(
        `Symbols.define invoked with a description (${
          description != null ? typeof arguments[0] : arguments[0]
        }) that is not non-coercible to a valid key.`,
      );
    }

    definition = super.get(description);

    if (symbol != null) {
      if (typeof symbol !== 'symbol') {
        throw new TypeError(
          `Symbols.define invoked with an invalid symbol (${symbol == null ? arguments[1] : typeof arguments[1]}).`,
        );
      }

      if (!definition) {
        definition = super.get(symbol);
      } else if (definition.symbol !== symbol) {
        throw new ReferenceError('Symbols.define invoked with a description argument that is not unique.');
      }

      if (definition && definition.description !== description) {
        throw new ReferenceError('Symbols.define invoked with a symbol argument that is not unique.');
      }
    }

    if (!definition) {
      definition = Object.freeze({symbol: symbol || Symbol(description), description: description});
      super.set(definition.symbol, definition);
      super.set(definition.description, definition);
    }

    return definition.symbol;
  }

  /** @param {symbol | string} key @returns {string} */
  describe(key) {
    return (super.get(key) || SymbolMap.undefined).description;
  }
}

Object.defineProperty(SymbolMap, 'undefined', {value: Object.freeze(Object.create(null)), writable: false});

Object.defineProperties(
  Object.setPrototypeOf(
    SymbolMap.prototype,
    Object.create(Object.prototype, {
      get: Object.getOwnPropertyDescriptor(Map.prototype, 'get'),
      has: Object.getOwnPropertyDescriptor(Map.prototype, 'has'),
      set: Object.getOwnPropertyDescriptor(Map.prototype, 'set'),
    }),
  ),
  {get: {writable: false}, set: {writable: false}},
);
