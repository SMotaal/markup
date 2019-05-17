import {mode} from './mode.js';

/**
 * @param {import('/markup/packages/tokenizer/lib/api').API} markup
 */
export default ((
  sourceURL = './matcher.js',
  sourceType = 'es',
  resolveSourceType = (defaultType, {sourceType, resourceType, options}) => {
    // console.log({defaultType, sourceType, resourceType});
    if (resourceType === 'javascript' && !sourceType) return 'es';
  },
) => async markup => {
  markup.parsers[0].register(mode);
  return {sourceURL, sourceType, resolveSourceType};
})();
