var Transformer = class Transformer {
  constructor(tokens) {
    this.tokens = tokens;
  }
  static initialize(tokens) {
    const instance = new this.constructor();
  }
  static get [Symbol.species]() {
    return (typeof this === 'object' && this.constructor) || this;
  }
  static get [Symbol.toStringTag]() {
    return this.name || (this[Symbol.species] && this[Symbol.species].name) || 'Transformer';
  }
};

{
  const {create, setPrototypeOf, getPrototypeOf, getOwnPropertyDescriptors} = Object;

  const Class = Transformer;
  const prototype = Class.prototype;
  {
    const Constructable = create(
      null,
      (({name, toString}) => ({name, toString}))(getOwnPropertyDescriptors(Class)),
    );
    setPrototypeOf(Class, Constructable);
    setPrototypeOf(prototype, {}, Class);
  }
  {
    const results = {Class, prototype};
    const tests = function() {
      with (new Proxy(results, {has: () => true})) {
        const {Class, prototype} = this.results;
        this.tests = function*() {
          constructed = yield () => new Class(A++);
          initialized = yield () => Class.initialize(A++);
          subinitialized = yield () => constructed.initialize(A++);
          reinitialized = yield () => initialized.initialize(A++);
        };
        const {next} = this.tests.prototype.next;
        this.tests.prototype = {}.constructor.create(this.tests.prototype, {
          next: {
            value() {
              return (
                (({done: this.done, value: this.current} = super.next(result)),
                (this.result = undefined)),
                this.done
              );
            },
          },
        });
      }
      return this.tests();
    }.call({results});
    for (const test of tests) {
      try {
        tests.result = test(results);
      } catch (exception) {
        tests.result = exception;
      }
    }
    console.log(results);
  }
}
