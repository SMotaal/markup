import * as pseudo from './lib/pseudo.js';
import * as dom from './lib/native.js';

export const native = dom.document && dom;
export const {createElement, createText, createFragment} = native || pseudo;
export {pseudo};
