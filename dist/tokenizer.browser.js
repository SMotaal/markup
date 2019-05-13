import experimentalExtendedAPI from './tokenizer/tokenizer.browser.experimental.js';
import experimentalES from '../experimental/es/playground.js';

experimentalES(experimentalExtendedAPI);

export default experimentalExtendedAPI;
export {parsers, tokenize, render, warmup, entities, encodeEntities} from './tokenizer/tokenizer.browser.experimental.js';
