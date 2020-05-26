//@ts-check

import {matcher} from './jessie-matcher.js';
import {TokenMatcher} from '../../lib/token-matcher.js';

export const mode = TokenMatcher.createMode(matcher, {
  syntax: 'jessie',
  aliases: ['jess'],
  createToken: TokenMatcher.createToken,
});
