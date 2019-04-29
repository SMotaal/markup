export * from './lib/parser.js';
export * from './lib/tokenizer.js';
import {Parser} from './lib/parser.js';

export default Object.assign(new Parser(), {MODULE_URL: import.meta.url});
