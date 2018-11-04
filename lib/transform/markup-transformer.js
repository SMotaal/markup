(function() {
  class Transformer {
    constructor(tokens) {
      Object.defineProperties(this, {
        tokens: {value: tokens},
        [Symbol.species]: {value: new.target},
      });
    }
    static initialize(tokens) {
      return new this[Symbol.species](tokens);
    }
    static get [Symbol.species]() {
      return this;
    }
    static get [Symbol.toStringTag]() {
      return this[Symbol.species].name;
    }
    static [Symbol.toPrimitive](hint) {
      return hint === 'string' && `[transformer ${this[Symbol.toStringTag]}]`;
    }
    static toString() {
      return this[Symbol.species][Symbol.toPrimitive]('string');
    }
    static get arguments() {}
    static get caller() {}
  }

  Object.setPrototypeOf(Transformer.prototype, Transformer);

  console.log(
    function() {
      const tests = (() => {
        with (new Proxy(this, {has: () => true})) {
          const {Class} = this;
          let i = 0;
          return function*() {
            constructed = yield () => new Class(i++);
            initialized = yield () => Class.initialize(i++);
            reinitialized = yield () => initialized.initialize(i++);
            ClassToString = yield () => `${Class}`;
            classToString = yield () => `${constructed}`;
            Extended = yield () => class Extended extends Class {};
            extended = yield () => new Extended(i++);
            ExtendedToString = yield () => `${Extended}`;
            extendedToString = yield () => `${extended}`;
            subinitialized = yield () => Extended.initialize(i++);
          };
        }
      })()();
      let result;
      while (!(result = tests.next(result)).done) {
        try {
          result = result.value();
        } catch (exception) {
          result = exception;
        }
      }
      return this;
    }.call({Class: Transformer}),
  );
})()
