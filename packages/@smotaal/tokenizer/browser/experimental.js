export * from './helpers.js';
import experimentalParser from '../tokenizer.experimental.js';
import {TokenizerAPI} from '../lib/api.js';
import markupDOM from '../extensions/dom.js';

/** @type {{experimentalAPI: import('../lib/api').API}} */
const {
  experimentalAPI: experimentalAPI,
  experimentalAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  experimentalAPI: new TokenizerAPI({
    parsers: [experimentalParser],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging && console.info('render: %o', {api: experimentalAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

export default experimentalAPI;
export {parsers, tokenize, render, warmup};
