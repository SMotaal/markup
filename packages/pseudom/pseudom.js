import * as pseudo from './pseudo.js';
import * as dom from './native.js';
export {encodeEntity, encodeEntities} from './pseudo.js';

// TEST: Trace for ESM testing
typeof process === 'object' && console.info('[ESM]: %o', import.meta.url);

export const native = dom.document && dom;
export const {createElement, createText, createFragment} = native || pseudo;
export {pseudo};
