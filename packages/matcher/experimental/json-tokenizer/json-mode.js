﻿//@ts-check

import {matcher} from './json-matcher.js';
import {TokenMatcher} from '../../lib/token-matcher.js';

export const mode = TokenMatcher.createMode(matcher, {
  syntax: 'json',
  aliases: ['json'],
  createToken: TokenMatcher.createToken,
});
