// @ts-check
export const applyEndowmentsMixin = (() => {
  const endowments = Object.freeze({
    fixClassInheritance: Object.freeze(
      /**
       * @template T, U
       * @param {(new () => T & U)} Class
       * @param {(new () => U) | null | undefined} Super
       * @param {Pick<typeof globalThis, 'Object'>} endowments
       */
      (Class, Super, endowments = globalThis) => {
        endowments.Object.setPrototypeOf(
          Class.prototype,
          Super === null ? null : Super ? Super.prototype : endowments.Object.prototype,
        );

        endowments.Object.setPrototypeOf(Class, Super == null ? endowments.Object : Super);

        return Class;
      },
    ),
    checkPrimordialEndowments: Object.freeze(
      /**
       * @template {Pick<typeof globalThis, 'Object' | U>} T
       * @template {keyof typeof globalThis} U
       * @param {{[k in keyof T]?: T[k] & {__proto__: object}}} endowments
       * @param {U[]} primordials
       */
      (endowments, ...primordials) => {
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
      },
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof endowments}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(endowments)),
  );
})();
