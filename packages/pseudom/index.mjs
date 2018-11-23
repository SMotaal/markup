import * as pseudo from './lib/pseudo.mjs';
import * as dom from './lib/native.mjs';

export const native = dom.document && dom;
export const {createElement, createText, createFragment} = native || pseudo;
export {pseudo};
