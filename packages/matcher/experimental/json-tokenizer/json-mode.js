//@ts-check

import {matcher} from './json-matcher.js';
import {initializeState, finalizeState, createToken} from '../common/helpers.js';
import {createMatcherMode} from '../../lib/token-matcher.js';
import {countLineBreaks} from '../../../tokenizer/lib/core.js';

// TODO: Refactor out unneeded ECMAScript facets

export const mode = createMatcherMode(matcher, {
  syntax: 'json',
  aliases: ['json'],
  initializeState,
  finalizeState,
  createToken,
});

/** @typedef {import('../common/types').Match} Match */
/** @typedef {import('../common/types').Groups} Groups */
/** @typedef {import('../common/types').Contexts} Contexts */
/** @typedef {import('../common/types').State} State */
