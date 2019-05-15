import {Tokenizer} from './tokenizer.js';
import {createParser} from '../core.js';

export {TOKENIZERS, MAPPINGS, MODES} from '../core.js';

export const Parser = createParser(Tokenizer);

/**
 * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
 * @typedef { {[name: string]: Mode} } Modes
 * @typedef { {[name: string]: {syntax: string} } } Mappings
 * @typedef { {aliases?: string[], syntax: string} } ModeOptions
 * @typedef { (options: ModeOptions, modes: Modes) => Mode } ModeFactory
 */
