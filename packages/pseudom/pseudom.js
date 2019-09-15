import {createNativeDOM} from './native.js';
import {createPseudoDOM} from './pseudo.js';

export {encodeEntity, encodeEntities} from './helpers.js';

export const pseudo = createPseudoDOM(globalThis);
export const native =
  globalThis.document && globalThis.document.defaultView === globalThis && createNativeDOM(globalThis);
export const {createElement, createText, createFragment} = native || pseudo;
