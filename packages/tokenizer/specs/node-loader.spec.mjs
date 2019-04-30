#!/usr/bin/env node --experimental-modules --loader @smotaal/tokenizer/node/loader.mjs

import * as loader from '../node/loader.mjs';
import {tokenizer, extended} from './node-esm.spec.js';

export {tokenizer, extended, loader};

if (typeof process === 'object' && process && process.argv && import.meta.url.endsWith(process.argv[1]))
  console.log({tokenizer, extended, loader});
