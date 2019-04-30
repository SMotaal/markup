export * from './tokenizer.experimental.js';
import {Parser} from './tokenizer.experimental.js';
import {modes} from './extensions/extensions.js';

export {modes};
export default (() => {
  const experimentalExtendedParser = Object.assign(new Parser(), {MODULE_URL: import.meta.url});
  for (const id in modes) experimentalExtendedParser.register(modes[id]);
  return experimentalExtendedParser;
})();
