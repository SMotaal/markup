import * as pseudo from './lib/pseudo.js';
import * as dom from './lib/native.js';
export {encodeEntity, encodeEntities} from './lib/pseudo.js';

// TEST: Trace for ESM testing
typeof process === 'object' && console.info('[ESM]: %o', import.meta.url);

export const native = dom.document && dom;
export const {createElement, createText, createFragment} = native || pseudo;
export {pseudo};
