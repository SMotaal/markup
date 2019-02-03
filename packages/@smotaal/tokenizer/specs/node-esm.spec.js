#!/usr/bin/env node

import * as extended from '../extended.js';
import * as tokenizer from '../tokenizer.js';

export {extended, tokenizer};

if (typeof process === 'object' && process && process.argv && import.meta.url.endsWith(process.argv[1]))
  console.log({tokenizer, extended});
