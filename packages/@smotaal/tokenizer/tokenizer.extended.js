export * from './tokenizer.js';
import {Parser} from './tokenizer.js';
import {modes} from './extensions/extensions.js';

export {modes};
export default (() => {
  const extendedParser = Object.assign(new Parser(), {MODULE_URL: import.meta.url});
  for (const id in modes) extendedParser.register(modes[id]);
  return extendedParser;
})();
