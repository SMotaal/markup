export * from './tokenizer.experimental.js';
import {Parser} from './tokenizer.experimental.js';
import {modes} from './extensions/extensions.js';

export {modes};
export default (() => new Parser({url: import.meta.url, modes}))();
