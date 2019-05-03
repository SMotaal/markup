export * from './tokenizer.js';
import {Parser} from './tokenizer.js';
import {modes} from './extensions/extensions.js';

export {modes};
export default new Parser({url: import.meta.url, modes});
