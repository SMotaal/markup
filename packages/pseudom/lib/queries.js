// @ts-check
export const applyQueriesMixin = (() => {
  const queries = Object.freeze({
    querySelector: Object.freeze(
      /**
       * @param {Element | DocumentFragment} scope
       * @param {string} selector
       */
      (scope, selector) => {},
    ),
    querySelectorAll: Object.freeze(
      /**
       * @param {Element | DocumentFragment} scope
       * @param {string} selector
       */
      (scope, selector) => {},
    ),
  });

  return Object.freeze(
    /**
     * @template {{}} T
     * @param {T} Pseudom
     * @return {T & typeof queries}
     */
    Pseudom => Object.defineProperties(Pseudom, Object.getOwnPropertyDescriptors(queries)),
  );
})();
