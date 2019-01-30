export * from './tokenizer.mjs';

import {Parser} from './tokenizer.mjs';
import {modes} from './extensions/extensions.mjs';

const parser = new Parser();
for (const id in modes) parser.register(modes[id]);

export {modes};

export default parser;
