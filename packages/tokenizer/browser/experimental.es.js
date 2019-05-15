import {createParser} from '../lib/core.js';
import {TokenizerAPI} from '../lib/api.js';
import markupDOM from '../extensions/dom.js';
import experimentalES from '../../../experimental/es/playground.js';

/** @type {{experimentalESAPI: import('../lib/api').API}} */
const {
  experimentalESAPI: experimentalESAPI,
  experimentalESAPI: {parsers, render, tokenize, warmup},
} = {
  //@ts-ignore
  experimentalESAPI: new TokenizerAPI({
    parsers: [new (createParser())({url: import.meta.url})],
    render: (source, options, flags) => {
      const fragment = options && options.fragment;
      const debugging = flags && /\bdebug\b/i.test(typeof flags === 'string' ? flags : [...flags].join(' '));

      debugging && console.info('render: %o', {api: experimentalESAPI, source, options, flags, fragment, debugging});
      fragment && (fragment.logs = debugging ? [] : undefined);

      return markupDOM.render(tokenize(source, options, flags), fragment);
    },
  }),
};

// Integrate experimental ECMAScript mapping it to the
//   "es" mode and "ecmascript" alias, but leaving the
//   normal JavaScript intact for both "js" and its
//   "javascript" alias.

export const overrides = Object.freeze(experimentalES(experimentalESAPI));

export default experimentalESAPI;
export {parsers, tokenize, render, warmup};
