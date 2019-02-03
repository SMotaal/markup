export * from './tokenizer.js';

import {Parser} from './tokenizer.js';
import {modes} from './extensions/extensions.js';

const parser = new Parser();
for (const id in modes) parser.register(modes[id]);

export {modes};

export default parser;
