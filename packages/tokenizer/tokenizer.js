export * from './lib/parser.js';
export * from './lib/tokenizer.js';
import {Parser} from './lib/parser.js';

export default new Parser({url: import.meta.url});
