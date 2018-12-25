import {Parser, extensions} from '../extended.mjs';

const parser = new Parser();
export const {modes, mappings} = parser;
for (const id in extensions.modes) parser.register(extensions.modes[id]);

export default parser;
