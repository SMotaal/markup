// @ts-check
export const applyEntitiesMixin = (() => {
  const entities = Object.freeze({
    extractCodePoint: Object.freeze(
      /** @type {(source: any, index: number) => number} */
      (Function.call.bind(''.charCodeAt)),
    ),
    replaceEntities: Object.freeze(
      /** @type {(source: any, replacer: string|Function) => string} */
      (RegExp.prototype[Symbol.replace].bind(/[\u00A0-\u9999<>\&]/g)),
    ),
    encodeEntities: Object.freeze(
      /** @type {(source: any) => string} */
      source => entities.replaceEntities(source, entities.encodeEntity),
    ),
    encodeEntity: Object.freeze(
      /** @type {(source: any) => string} */
      source => `&#${entities.extractCodePoint(source, 0)};`,
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof entities}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(entities)),
  );
})();
