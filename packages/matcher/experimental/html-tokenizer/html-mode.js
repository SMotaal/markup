//@ts-check

import {matcher} from './html-matcher.js';
import {TokenMatcher} from '../../lib/token-matcher.js';
import {initializeState, finalizeState, createToken} from '../common/helpers.js';

export const mode = TokenMatcher.createMode(matcher, {
  syntax: 'html',
  aliases: ['html'],
  preregister: parser => {
    parser.unregister('html');
  },
  initializeState,
  finalizeState,
  createToken,
});
