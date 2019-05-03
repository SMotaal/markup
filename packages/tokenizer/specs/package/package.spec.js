#!/usr/bin/env node --experimental-modules

import * as extended from '@smotaal/tokenizer/tokenizer.extended.js';
import * as tokenizer from '@smotaal/tokenizer/tokenizer.js';

export {extended, tokenizer};

if (typeof process === 'object' && process && process.argv && import.meta.url.endsWith(process.argv[1]))
  console.log({tokenizer, extended});
