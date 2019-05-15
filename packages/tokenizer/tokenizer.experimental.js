export * from './lib/experimental/parser.js';
export * from './lib/experimental/tokenizer.js';
import {Parser} from './lib/experimental/parser.js';

export default new Parser({url: import.meta.url});
