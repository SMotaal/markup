// Experimental Markup Implementation
import markup, {versions} from './lib/markup.js';

// @SMotaal/tokenizer Implementation
// import * as smotaalTokenizerParser from './packages/tokenizer/lib/parser.mjs';
import smotaalTokenizerParser from './packages/@smotaal/tokenizer/extended.js';

versions.push(smotaalTokenizerParser);

export default markup;
