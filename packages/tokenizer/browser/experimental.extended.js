export * from './helpers.js';
import experimentalExtendedParser from '../tokenizer.experimental.extended.js';
import {TokenizerAPI} from '../lib/api.js';
import markupDOM from '../extensions/dom.js';

/** @type {{experimentalExtendedAPI: import('../lib/api').API}} */
const {
  experimentalExtendedAPI,
  experimentalExtendedAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  experimentalExtendedAPI: new TokenizerAPI({
    parsers: [experimentalExtendedParser],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging &&
        console.info('render: %o', {api: experimentalExtendedAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

export default experimentalExtendedAPI;
export {parsers, tokenize, render, warmup};
