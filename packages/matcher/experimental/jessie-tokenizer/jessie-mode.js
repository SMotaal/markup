//@ts-check

import {matcher} from './jessie-matcher.js';
import {TokenMatcher} from '../../lib/token-matcher.js';
import {createToken} from '../common/helpers.js';

export const mode = TokenMatcher.createMode(matcher, {
  syntax: 'jessie',
  aliases: ['jess'],
  createToken,
});
