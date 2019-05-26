//@ts-check

import {matcher} from './matcher.js';
import {initializeState, finalizeState, createToken} from './helpers.js';
import {createMatcherMode} from '../matcher/helpers.js';

export const mode = createMatcherMode(matcher, {
  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  initializeState,
  finalizeState,
  createToken,
});
