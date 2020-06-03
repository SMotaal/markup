// @ts-check
import {applyEntitiesMixin} from './lib/entities.js';
import {applyEndowmentsMixin} from './lib/endowments.js';
import {applyQueriesMixin} from './lib/queries.js';

export const {
  Pseudom,
  Pseudom: {encodeEntity, encodeEntities},
} = {Pseudom: Object.freeze(applyQueriesMixin(applyEntitiesMixin(applyEndowmentsMixin(class Pseudom {}))))};
