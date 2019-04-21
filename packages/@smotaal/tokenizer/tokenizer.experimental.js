export * from './lib/experimental/parser.js';
export * from './lib/experimental/tokenizer.js';

import {Parser} from './lib/experimental/parser.js';

const parser = Object.assign(new Parser(), {MODULE_URL: import.meta.url});

export default parser;
