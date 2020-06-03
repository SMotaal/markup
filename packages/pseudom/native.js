/** @param {Pick<typeof globalThis, 'document'|'DocumentFragment'|'Element'|'Object'|'Node'|'Text'>} endowments */
export const createNativeDOM = (endowments = globalThis) => {
  if (
    !(
      typeof endowments === 'object' &&
      typeof endowments.document === 'object' &&
      ['createElement', 'createTextNode', 'createDocumentFragment'].every(
        method => typeof endowments.document[method] === 'function',
      )
    )
  )
    return (endowments = undefined);

  const native = {};

  native.Object = endowments.Object || globalThis.Object;
  // dom.String = endowments.String || globalThis.String;
  // dom.Set = endowments.Set || globalThis.Set;
  // dom.Symbol = endowments.Symbol || globalThis.Symbol;
  native.document = endowments.document;

  /** @type {typeof endowments.DocumentFragment} */
  native.DocumentFragment = endowments.DocumentFragment || native.document.createDocumentFragment().constructor;

  /** @type {typeof endowments.Element} */
  native.Element =
    endowments.Element ||
    (() => {
      let prototype = native.document.createElement('span');
      while (
        prototype.constructor &&
        prototype.constructor.name.startsWith('HTML') &&
        prototype !== (prototype = native.Object.getPrototypeOf(prototype) || prototype)
      );
      return prototype.constructor.name === 'Element' ? prototype.constructor : undefined;
    })();

  /** @type {typeof endowments.Node} */
  native.Node =
    endowments.Node ||
    (native.Element &&
      (() => {
        let prototype = native.Object.getPrototypeOf(native.Element.prototype);
        return prototype.constructor.name === 'Node' ? prototype.constructor : undefined;
      })());

  /** @type {typeof endowments.Text} */
  native.Text = endowments.Text || native.document.createTextNode('').constructor;

  native.createElement = (tag, properties, ...children) => {
    const element = native.document.createElement(tag);
    properties && native.Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  };
  native.createText = (content = '') => native.document.createTextNode(content);
  native.createFragment = () => native.document.createDocumentFragment();

  endowments = undefined;

  return native.Object.freeze(/** @type {typeof native} */ (native.Object.setPrototypeOf(native, null)));
};
