import {mode as JSONMode} from '../../packages/matcher/experimental/json-tokenizer/json-mode.js';
import {mode as ECMAScriptMode} from '../../packages/matcher/experimental/es-tokenizer/es-mode.js';

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

/*

Comparing with JSON.parse in the console:
  ((text) => {console.time('parse');for (let i = 33; i--; JSON.parse(text));console.timeEnd('parse');})($0.innerText);

*/

// const dumpExample = async () => console.log('example: %O', await (await fetch('./example')).json());
