export * from './lib/helpers.js';
import extendedParser from '../tokenizer.extended.js';
import {TokenizerAPI} from '../lib/api.js';
import markupDOM from '../extensions/dom.js';

/** @type {{extendedAPI: import('../lib/api').API}} */
const {
  extendedAPI,
  extendedAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  extendedAPI: new TokenizerAPI({
    parsers: [extendedParser],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging && console.info('render: %o', {api: extendedAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

export default extendedAPI;
export {parsers, tokenize, render, warmup};
