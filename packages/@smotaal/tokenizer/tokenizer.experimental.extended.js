export * from './tokenizer.experimental.js';
import {Parser} from './tokenizer.experimental.js';
import {modes} from './extensions/extensions.js';

const parser = Object.assign(new Parser(), {MODULE_URL: import.meta.url});
for (const id in modes) parser.register(modes[id]);

export {modes};
export default parser;
