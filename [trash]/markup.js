import extended from './packages/@smotaal/tokenizer/tokenizer.extended.js';
import experimental from './packages/@smotaal/tokenizer/tokenizer.experimental.extended.js';
import markup, {parsers} from './lib/markup.js';

parsers.splice(0, parsers.length, extended, ...parsers, experimental);

export default markup;
