import {Pseudom} from './helpers.js';

/** @param {Pick<typeof globalThis, 'Object'|'Set'|'String'|'Symbol'>} endowments */
export const createPseudoDOM = (endowments = globalThis) => {
  const pseudo = {};

  pseudo.Object = endowments.Object || globalThis.Object;
  pseudo.Set = endowments.Set || globalThis.Set;
  pseudo.String = endowments.String || globalThis.String;
  pseudo.Symbol = endowments.Symbol || globalThis.Symbol;

  Pseudom.checkPrimordialEndowments(pseudo, ...['Object', 'Set', 'String', 'Symbol']);

  pseudo.document = null;

  pseudo.CSSStyleDeclaration = class CSSStyleDeclaration extends pseudo.Object {
    get cssText() {
      const cssProperties = [];

      for (const [key, value] of pseudo.Object.entries(this))
        typeof key !== 'string' ||
          key !== key.trim() ||
          // NOTE: We only ever expect strings and numbers
          !(typeof value === 'string' ? value.trim() : typeof value === 'number' ? !isNaN(value) : null) ||
          cssProperties.push(`${key}: ${CSSStyleDeclaration.normalizeValue(value)}`);

      return cssProperties.join(';');
    }

    toString() {
      return this.cssText;
    }

    toJSON() {
      return this.toString();
    }

    static normalizeValue(value) {
      return value || value === 0 ? /\s*;*$/[pseudo.Symbol.replace](value, '') : '';
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.CSSStyleDeclaration).prototype);

  pseudo.DOMStringMap = class DOMStringMap extends pseudo.Object {};

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMStringMap).prototype);

  // TODO: Consider support for Element.classList
  //       For now we list the simplicity of Element.className
  pseudo.DOMTokenList = class DOMTokenList extends pseudo.Set {
    toString() {
      return [...this].join(' ');
    }

    toJSON() {
      return this.toString();
    }

    static normalizeString(string) {
      return string ? /[\n\t\s]+/g[pseudo.Symbol.replace](string, ' ').trim() : '';
    }

    static from(...list) {
      return new DOMTokenList(DOMTokenList.normalizeList(...list).split(' '));
    }

    static normalizeList(...list) {
      return list.length ? DOMTokenList.normalizeString(list.filter(Boolean).join(' ')) : '';
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMTokenList).prototype);

  pseudo.NodeList = class NodeList extends pseudo.Set {};

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.NodeList).prototype);

  pseudo.Node = class Node extends pseudo.Object {
    get childNodes() {
      return pseudo.Object.defineProperty(this, 'childNodes', {value: new pseudo.NodeList()}).childNodes;
    }

    get childElementCount() {
      return (this.hasOwnProperty('childNodes') && this.childNodes.size) || 0;
    }

    get textContent() {
      return (this.hasOwnProperty('childNodes') && this.childNodes.size && [...this.childNodes].join('')) || '';
    }

    set textContent(text) {
      this.hasOwnProperty('childNodes') && this.childNodes.size && this.childNodes.clear();
      text && this.appendChild(new pseudo.Text(text));
    }

    insertBefore(node, nextNode) {
      if (!this.childNodes.has(nextNode))
        throw ReferenceError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a child.`);
      if (!(node !== null && typeof node === 'object' && node instanceof Node))
        throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 1 is not a Node.`);
      if (!(nextNode !== null && typeof nextNode === 'object' && nextNode instanceof Node))
        throw TypeError(`Failed to execute 'insertBefore' on 'Node': argument 2 is not a Node.`);
      node.parentNode == null || node.parentNode.removeChild(node);
      pseudo.Object.defineProperties(node, {
        parentNode: {value: this, writable: false, configurable: true},
        previousSibling: {value: nextNode.previousSibling || null, writable: false, configurable: true},
        nextSibling: {value: nextNode, writable: false, configurable: true},
      });
      !nextNode.previousSibling
        ? pseudo.Object.defineProperty(this, 'firstNode', {value: node, writable: false, configurable: true})
        : pseudo.Object.defineProperty(nextNode.previousSibling, 'nextSibling', {
            value: node,
            writable: false,
            configurable: true,
          });
      pseudo.Object.defineProperty(nextNode, 'previousSibling', {value: node, writable: false, configurable: true});
      const childNodes = [...this.childNodes];
      childNodes.splice(childNodes.indexOf(nextNode), 0, node);
      this.childNodes.clear();
      this.childNodes.add(...childNodes);
      return node;
    }

    appendChild(node) {
      if (!(node !== null && typeof node === 'object' && node instanceof Node))
        throw TypeError(`Failed to execute 'appendChild' on 'Node': 1 argument required, but only 0 present.`);
      node.parentNode == null || node.parentNode.removeChild(node);
      pseudo.Object.defineProperties(node, {
        parentNode: {value: this, writable: false, configurable: true},
        previousSibling: {value: this.lastChild || null, writable: false, configurable: true},
        nextSibling: {value: null, writable: false, configurable: true},
      });
      !node.previousSibling ||
        pseudo.Object.defineProperties(node.previousSibling, {
          nextSibling: {value: node, writable: false, configurable: true},
        });
      pseudo.Object.defineProperties(this, {
        firstChild: {value: this.firstChild || node, writable: false, configurable: true},
        lastChild: {value: node, writable: false, configurable: true},
      });
      this.childNodes.add(node);
      return node;
    }

    removeChild(node) {
      if (!(node && node.parentNode === this))
        throw TypeError(`Failed to execute 'removeChild' on 'Node': 1 argument required, but only 0 present.`);

      node.previousSibling
        ? pseudo.Object.defineProperty(node.previousSibling, 'nextSibling', {
            value: node.nextSibling || null,
            writable: false,
            configurable: true,
          })
        : pseudo.Object.defineProperty(this, 'firstChild', {
            value: null,
            writable: false,
            configurable: true,
          });
      node.nextSibling
        ? pseudo.Object.defineProperty(node.nextSibling, 'previousSibling', {
            value: node.previousSibling || null,
            writable: false,
            configurable: true,
          })
        : pseudo.Object.defineProperty(this, 'lastChild', {
            value: null,
            writable: false,
            configurable: true,
          });
      pseudo.Object.defineProperties(node, {
        parentNode: {value: null, writable: false, configurable: true},
        previousSibling: {value: null, writable: false, configurable: true},
        nextSibling: {value: null, writable: false, configurable: true},
      });
      this.childNodes.delete(node);
      return node;
    }
  };

  pseudo.Node.prototype.firstChild = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.lastChild = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.previousSibling = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.nextSibling = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.parentNode = /** @type {Node|null} */ (null);
  pseudo.Node.prototype.parentElement = /** @type {Node|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Node).prototype);

  pseudo.HTMLCollection = class HTMLCollection extends pseudo.Set {
    get length() {
      return this.size;
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.HTMLCollection).prototype);

  pseudo.ParentNode = class ParentNode extends pseudo.Node {
    get children() {
      return pseudo.Object.defineProperty(this, 'children', {value: new pseudo.HTMLCollection()}).children;
    }

    get childElementCount() {
      return ('children' in this && this.children.length) || 0;
    }

    append(...nodes) {
      if (nodes.length)
        for (const node of nodes)
          node === '' || this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node));
    }

    prepend(...nodes) {
      if (nodes.length)
        for (const node of nodes)
          node === '' ||
            (this.childElementCount > 0
              ? this.insertBefore(typeof node === 'object' ? node : new pseudo.Text(node), this.firstChild)
              : this.appendChild(typeof node === 'object' ? node : new pseudo.Text(node)));
    }

    insertBefore(node, nextNode) {
      super.insertBefore(node, nextNode);
      if (node instanceof pseudo.Element) {
        pseudo.Object.defineProperties(node, {
          parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
          previousElementSibling: {value: nextNode.previousElementSibling || null, writable: false, configurable: true},
          nextElementSibling: {value: nextNode, writable: false, configurable: true},
        });
        !nextNode.previousElementSibling
          ? pseudo.Object.defineProperty(this, 'firstElementChild', {value: node, writable: false, configurable: true})
          : pseudo.Object.defineProperty(nextNode.previousElementSibling, 'nextElementSibling', {
              value: node,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperty(nextNode, 'previousElementSibling', {
          value: node,
          writable: false,
          configurable: true,
        });
        const children = [...this.children];
        children.splice(children.indexOf(nextNode), 0, node);
        this.children.clear();
        this.children.add(...children);
      }
      return node;
    }

    appendChild(node) {
      super.appendChild(node);
      if (node instanceof pseudo.Element) {
        pseudo.Object.defineProperties(node, {
          parentElement: {value: this instanceof pseudo.Element ? this : null, writable: false, configurable: true},
          previousElementSibling: {value: this.lastElementChild || null, writable: false, configurable: true},
          nextElementSibling: {value: null, writable: false, configurable: true},
        });
        !node.previousElementSibling ||
          pseudo.Object.defineProperty(node.previousElementSibling, 'previousElementSibling', {
            value: node,
            writable: false,
            configurable: true,
          });
        pseudo.Object.defineProperties(this, {
          firstElementChild: {value: this.firstElementChild || node, writable: false, configurable: true},
          lastElementChild: {value: node, writable: false, configurable: true},
        });
        this.children.add(node);
      }
      return node;
    }

    removeChild(node) {
      super.removeChild(node);
      if (node instanceof pseudo.Element) {
        node.previousElementSibling
          ? pseudo.Object.defineProperty(node.previousElementSibling, 'nextElementSibling', {
              value: node.nextElementSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'firstElementChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        node.nextElementSibling
          ? pseudo.Object.defineProperty(node.nextElementSibling, 'previousElementSibling', {
              value: node.previousElementSibling || null,
              writable: false,
              configurable: true,
            })
          : pseudo.Object.defineProperty(this, 'lastElementChild', {
              value: null,
              writable: false,
              configurable: true,
            });
        pseudo.Object.defineProperties(node, {
          parentElement: {value: null, writable: false, configurable: true},
          previousElementSibling: {value: null, writable: false, configurable: true},
          nextElementSibling: {value: null, writable: false, configurable: true},
        });
        this.children.delete(node);
      }
      return node;
    }
  };

  pseudo.ParentNode.prototype.firstElementChild = /** @type {Element|null} */ (null);
  pseudo.ParentNode.prototype.lastElementChild = /** @type {Element|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.ParentNode).prototype);

  pseudo.Element = class Element extends pseudo.Node {
    get style() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'style', {
          value: new pseudo.CSSStyleDeclaration(),
          writable: false,
          configurable: true,
        }).style;
      throw Error(`Invalid invocation of Element.style getter/setter.`);
    }

    set style(value) {
      value == null || pseudo.Object.assign(this.style, {...value});
    }

    get dataset() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'dataset', {
          value: new pseudo.DOMStringMap(),
          writable: false,
          configurable: true,
        }).dataset;
      throw Error(`Invalid invocation of Element.dataset getter/setter.`);
    }

    set dataset(value) {
      value == null || pseudo.Object.assign(this.dataset, {...value});
    }

    get innerHTML() {
      return this.textContent;
    }

    set innerHTML(text) {
      this.textContent = text;
    }

    get outerHTML() {
      let classList;
      let {className, tag, innerHTML, dataset} = this;

      className && (className = className.trim()) && (className = pseudo.DOMTokenList.normalizeString(className));

      const openTag = [tag];

      className && openTag.push(`class="${className}"`);

      if (this.hasOwnProperty('style')) openTag.push(`style=${JSON.stringify(this.style.cssText)}`);

      if (this.hasOwnProperty('dataset'))
        for (const [key, value] of pseudo.Object.entries(this.dataset))
          typeof key !== 'string' ||
            key !== key.trim() ||
            value == null ||
            typeof value === 'symbol' ||
            openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

      return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
    }

    toString() {
      return this.outerHTML;
    }

    toJSON() {
      return this.toString();
    }

    remove() {
      this.parentElement && this.parentElement.removeChild(this);
    }
  };

  pseudo.Object.defineProperties(pseudo.Element.prototype, {
    children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
    childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
    append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
    prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
    appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
    removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
    insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
    firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
    lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
  });

  pseudo.Element.prototype.previousElementSibling = /** @type {Element|null} */ (null);
  pseudo.Element.prototype.nextElementSibling = /** @type {Element|null} */ (null);
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Element).prototype);

  pseudo.DocumentFragment = class DocumentFragment extends pseudo.Node {
    toString() {
      return this.textContent;
    }

    toJSON() {
      return (this.childElementCount && [...this.childNodes]) || [];
    }

    [pseudo.Symbol.iterator]() {
      return ((this.childElementCount && this.childNodes) || '')[pseudo.Symbol.iterator]();
    }
  };

  pseudo.Object.defineProperties(pseudo.DocumentFragment.prototype, {
    children: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'children'),
    childElementCount: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'childElementCount'),
    append: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'append'),
    prepend: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'prepend'),
    appendChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'appendChild'),
    removeChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'removeChild'),
    insertBefore: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'insertBefore'),
    firstElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'firstElementChild'),
    lastElementChild: pseudo.Object.getOwnPropertyDescriptor(pseudo.ParentNode.prototype, 'lastElementChild'),
  });

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DocumentFragment).prototype);

  /** @type {typeof globalThis.Text} */
  pseudo.Text = class Text extends pseudo.Node {
    constructor(textContent) {
      pseudo.Object.defineProperty(super(), 'textContent', {
        value: `${textContent}`,
        writable: false,
        configurable: true,
      });
    }
    toString() {
      return Pseudom.encodeEntities(this.textContent.toString());
    }
  };

  pseudo.Object.defineProperties(pseudo.Text.prototype, {
    textContent: {value: '', writable: false, configurable: true},
  });

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Text).prototype);

  pseudo.createElement = pseudo.Object.freeze((tag, properties, ...children) => {
    const element = new pseudo.Element();
    element.tag = tag;
    properties == null ||
      (({dataset: element.dataset, className: element.className, ...element.properties} = properties),
      element.className || (element.className = ''));
    children.length && element.append(...children);
    return element;
  });

  pseudo.createText = pseudo.Object.freeze((content = '') => new pseudo.Text(content));

  pseudo.createFragment = pseudo.Object.freeze(() => new pseudo.DocumentFragment());

  endowments = undefined;

  // console.log(pseudo);

  return pseudo.Object.freeze(pseudo);
};
