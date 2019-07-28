//@ts-check

import {matcher} from './jessie-matcher.js';
import {createMatcherMode} from '../../lib/token-matcher.js';
import {initializeState, finalizeState, createToken} from '../common/helpers.js';

export const mode = createMatcherMode(matcher, {
  syntax: 'jessie',
  aliases: ['jess'],
  initializeState,
  finalizeState,
  createToken,
});
