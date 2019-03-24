export const {document, Element, Node, Text, DocumentFragment} =
  'object' === typeof self && (self || 0).window === self && self;

export const {createElement, createText, createFragment} = {
  createElement: (tag, properties, ...children) => {
    const element = document.createElement(tag);
    properties && Object.assign(element, properties);
    if (!children.length) return element;
    if (element.append) {
      while (children.length > 500) element.append(...children.splice(0, 500));
      children.length && element.append(...children);
    } else if (element.appendChild) {
      for (const child of children) element.appendChild(child);
    }
    return element;
  },

  createText: (content = '') => document.createTextNode(content),

  createFragment: () => document.createDocumentFragment(),
};
