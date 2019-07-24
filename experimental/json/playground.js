import {mode as JSONMode} from '../../packages/matcher/experimental/json-tokenizer/json-mode.js';
import {mode as ECMAScriptMode} from '../es/mode.js';

ECMAScriptMode.USE_CONSTRUCTS = true;

/**
 * @param {import('/markup/packages/tokenizer/lib/api').API} markup
 */
export default ((
  sourceURL = `${new URL('./example', import.meta.url)}`,
  sourceType = 'json',
  resolveSourceType = (defaultType, {sourceType, resourceType, options, ...rest}) => {
    console.log({options, sourceType, resourceType});
    if (!sourceType && resourceType === 'javascript') return 'es';
    if (!sourceType && (resourceType === 'json' || resourceType === 'octet')) return 'json';
    return defaultType;
  },
) => async markup => {
  markup.parsers[0].register(JSONMode);
  markup.parsers[0].register(ECMAScriptMode);
  return {sourceURL, sourceType, resolveSourceType};
})();
