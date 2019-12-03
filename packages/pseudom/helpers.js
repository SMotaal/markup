// @ts-check

export const {
  Pseudom,
  Pseudom: {encodeEntity, encodeEntities},
} = (() => {
  class Pseudom {
    /** @param {*} source*/
    static encodeEntities(source) {
      return /[\u00A0-\u9999<>\&]/g[Symbol.replace](source, Pseudom.encodeEntity);
    }

    /** @param {*} source*/
    static encodeEntity(source) {
      return `&#${Pseudom.extractCodePoint(source, 0)};`;
    }
  }

  Object.freeze(Pseudom.encodeEntities);
  Object.freeze(Pseudom.encodeEntity);

  Pseudom.extractCodePoint = Object.freeze(
    /** @type {(source: any, index: number) => number} */ (Function.call.bind(''.charCodeAt)),
  );

  /**
   * @template T, U
   * @param {(new () => T & U)} Class
   * @param {(new () => U) | null | undefined} Super
   * @param {Pick<typeof globalThis, 'Object'>} endowments
   */
  Pseudom.fixClassInheritance = (Class, Super, endowments = globalThis) => {
    endowments.Object.setPrototypeOf(
      Class.prototype,
      Super === null ? null : Super ? Super.prototype : endowments.Object.prototype,
    );

    endowments.Object.setPrototypeOf(Class, Super == null ? endowments.Object : Super);

    return Class;
  };

  Pseudom.checkPrimordialEndowments = Object.freeze((endowments, ...primordials) => {
    for (const endowment of `Object,${primordials}`.replace(/^,Object|(,\w+)(?=.*?\1)/g, '').split(',')) {
      if (
        endowment === 'Object'
          ? !(
              typeof endowments[endowment] === 'function' &&
              typeof endowments[endowment].prototype === 'object' &&
              endowments[endowment].prototype !== null &&
              endowments[endowment].__proto__ &&
              endowments[endowment].__proto__.__proto__ === endowments.Object.prototype
            )
          : endowment in endowments &&
            !(
              typeof endowments[endowment] === 'function' &&
              endowments[endowment].prototype != null &&
              // typeof endowments[endowment].prototype === 'object' &&
              endowments[endowment].__proto__ === endowments.Object.__proto__ &&
              endowments[endowment].prototype.__proto__ === endowments.Object.prototype
            )
      )
        throw `Error: createPseudoDOM invoked with an invalid ‹${endowment}› endowment.`;
    }
  });

  Object.freeze(Pseudom);

  return {Pseudom};
})();
