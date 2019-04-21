import {Hash} from './helpers.js';

const options = {
  specifiers: [
    '',
    'alias',
    '~/path/to/asset.ext',
    '/path/to/asset.ext',
    'https://sub.domain.tld/path/to/file.ext',
    'unpkg:package',
    'unpkg:package/path/to/file.ext',
    'unpkg:@scope/package',
    'unpkg:@scope/package/path/to/file.ext',
  ],
  [MODE]: ['es'],
  [CYCLES]: [0, 1, 10],
  [REPEATS]: [0, 1, 10],
  [VARIANT]: [1, 2],
  [DEBUG]: [''],
};

{
  const {specifiers, ...mappings} = options;
  const fragments = new Set();
  const matches = {};
  const results = {specifiers, fragments, matches};

  fragments: {
    const entries = Object.entries((mappings = {...mappings}));
    for (const [symbol, values] of entries) {
      if (!symbol || typeof symbol !== 'string' || !values.length) continue;
      const parameters = new Set();
      for (const value of values) parameters.add(`${symbol}${value || ''}`);
      for (const prefix of ['', ...fragments]) {
        for (const parameter of parameters) {
          fragments.add(`${prefix}${parameter}`);
        }
      }
      fragments[symbol] = parameters;
    }
  }

  specs: {
    for (const specifier of specifiers) {
      const matches = {};
      for (const fragment of fragments) {
        const hash = `${HASH}${specifier}${fragment}`;
        matches[hash] = Hash.parse(hash);
      }
    }
    console.group(import.meta.url);
    console.log(results);
    console.table(matches);
    console.groupEnd();
  }
}
