import * as extensions from '../extensions/extensions.mjs';
import * as dom from '../extensions/dom.mjs';
import {Parser} from '../lib/parser.mjs';

const parser = new Parser();
export const {modes, mappings} = parser;
for (const id in extensions.modes) parser.register(extensions.modes[id]);

export default parser;
