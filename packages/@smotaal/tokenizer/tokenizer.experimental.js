export * from './lib/experimental/parser.js';
export * from './lib/experimental/tokenizer.js';
import {Parser} from './lib/experimental/parser.js';

export default Object.assign(new Parser(), {MODULE_URL: import.meta.url});
