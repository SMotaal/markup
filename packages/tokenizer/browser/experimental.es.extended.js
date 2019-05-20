export * from './lib/helpers.js';

import {createParser} from '../lib/core.js';
import {Tokenizer} from '../lib/experimental/tokenizer.js';
import {TokenizerAPI} from '../lib/api.js';
import markupDOM from '../extensions/dom.js';
import experimentalES from '../../../experimental/es/playground.js';
import {modes} from '../extensions/extensions.js';

export {modes};

// export const Parser = createParser(Tokenizer);

/** @type {{experimentalESExtendedAPI: import('../lib/api').API}} */
const {
  experimentalESExtendedAPI: experimentalESExtendedAPI,
  experimentalESExtendedAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  experimentalESExtendedAPI: new TokenizerAPI({
    parsers: [new (createParser(Tokenizer))({url: import.meta.url, modes})],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging &&
        console.info('render: %o', {api: experimentalESExtendedAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

// Integrate experimental ECMAScript mapping it to the
//   "es" mode and "ecmascript" alias, but leaving the
//   normal JavaScript intact for both "js" and its
//   "javascript" alias.

export const overrides = Object.freeze(experimentalES(experimentalESExtendedAPI));

export default experimentalESExtendedAPI;
export {parsers, tokenize, render, warmup};
