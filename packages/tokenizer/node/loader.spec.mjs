#!/usr/bin/env node --experimental-modules --loader @smotaal/tokenizer/node/loader.mjs

import * as extended from './tokenizer.extended.js';
import * as tokenizer from './tokenizer.js';

export {extended, tokenizer};

if (typeof process === 'object' && process && process.argv && import.meta.url.endsWith(process.argv[1]))
  console.log({tokenizer, extended});
