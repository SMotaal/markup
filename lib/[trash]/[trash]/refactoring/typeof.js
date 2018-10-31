const TypeOf = type =>
  TypeOf[type] ||
  (TypeOf[type] = Object.defineProperties(
    Object.setPrototypeOf(unknown => type === typeof unknown, null),
    Object.getOwnPropertyDescriptors(
      Object.freeze({
        boolean: type === 'boolean',
        number: type === 'number',
        bigint: type === 'bigint',
        string: type === 'string',
        symbol: type === 'symbol',
        object: type === 'object',
        function: type === 'function',
        undefined: type === 'undefined',
      }),
    ),
  ));

const isFunction = TypeOf('function');
const isObject = TypeOf('object');

