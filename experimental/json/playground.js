import {mode as json} from './mode.js';
import {mode as es} from '../es/mode.js';

/**
 * @param {import('/markup/packages/tokenizer/lib/api').API} markup
 */
export default ((
  sourceURL = '../../package.json',
  sourceType = 'json',
  resolveSourceType = (defaultType, {sourceType, resourceType, options}) => {
    if (!sourceType && resourceType === 'json') return 'json';
    // if (resourceType) return resourceType;
  },
) => async markup => {
  markup.parsers[0].register(json);
  markup.parsers[0].register(es);
  return {sourceURL, sourceType, resolveSourceType};
})();
