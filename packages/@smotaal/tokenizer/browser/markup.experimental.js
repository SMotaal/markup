export * from './markup.js';
import experimentalParser from '../tokenizer.experimental.extended.js';
import {parsers} from './markup.js';

parsers.unshift(experimentalParser);
