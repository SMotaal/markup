export * from './lib/legacy/parser.js';
export * from './lib/legacy/tokenizer.js';
import {Parser} from './lib/legacy/parser.js';

export default new Parser({url: import.meta.url});
