/** @param {Pick<globalThis, 'document'|'DocumentFragment'|'Element'|'Object'|'Node'|'Text'>} endowments */
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

  const dom = {};

  dom.Object = endowments.Object || globalThis.Object;
  // dom.String = endowments.String || globalThis.String;
  // dom.Set = endowments.Set || globalThis.Set;
  // dom.Symbol = endowments.Symbol || globalThis.Symbol;
  dom.document = endowments.document;

  /** @type {typeof endowments.DocumentFragment} */
  dom.DocumentFragment = endowments.DocumentFragment || dom.document.createDocumentFragment().constructor;

  /** @type {typeof endowments.Element} */
  dom.Element =
    endowments.Element ||
    (() => {
      let prototype = dom.document.createElement('span');
      while (
        prototype.constructor &&
        prototype.constructor.name.startsWith('HTML') &&
        prototype !== (prototype = dom.Object.getPrototypeOf(prototype) || prototype)
      );
      return prototype.constructor.name === 'Element' ? prototype.constructor : undefined;
    })();

  /** @type {typeof endowments.Node} */
  dom.Node =
    endowments.Node ||
    (dom.Element &&
      (() => {
        let prototype = dom.Object.getPrototypeOf(dom.Element.prototype);
        return prototype.constructor.name === 'Node' ? prototype.constructor : undefined;
      })());

  /** @type {typeof endowments.Text} */
  dom.Text = endowments.Text || dom.document.createTextNode('').constructor;

  dom.createElement = (tag, properties, ...children) => {
    const element = dom.document.createElement(tag);
    properties && dom.Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  };
  dom.createText = (content = '') => dom.document.createTextNode(content);
  dom.createFragment = () => dom.document.createDocumentFragment();

  endowments = undefined;

  return dom.Object.freeze(dom.Object.setPrototypeOf(dom, null));
};
