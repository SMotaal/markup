import {mode as HTMLMode} from '../../packages/matcher/experimental/html-tokenizer/html-mode.js';
import {mode as ECMAScriptMode} from '../es/es-mode.js';

ECMAScriptMode.USE_CONSTRUCTS = true;

/** @param {import('/markup/packages/tokenizer/lib/api').API} markup */
export default ((
  sourceURL = `${new URL('./example', import.meta.url)}`,
  sourceType = 'html',
  resolveSourceType = (defaultType, {sourceType, resourceType, options, ...rest}) => {
    console.log({options, sourceType, resourceType});
    if (!sourceType && resourceType === 'javascript') return 'es';
    if (!sourceType && (resourceType === 'html' || resourceType === 'octet')) return 'html';
    return defaultType;
  },
) => async markup => {
  markup.parsers[0].register(HTMLMode);
  markup.parsers[0].register(ECMAScriptMode);
  return {sourceURL, sourceType, resolveSourceType};
})();
