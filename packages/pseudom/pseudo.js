import {encodeEntities} from './helpers.js';

/** @param {Pick<globalThis, 'Object'|'Set'|'String'|'Symbol'>} endowments */
export const createPseudoDOM = (endowments = globalThis) => {
  const dom = {};

  dom.Object = endowments.Object || globalThis.Object;
  dom.Set = endowments.Set || globalThis.Set;
  dom.String = endowments.String || globalThis.String;
  dom.Symbol = endowments.Symbol || globalThis.Symbol;
  dom.document = null;

  dom.Node = class Node extends dom.Object {
    get children() {
      return dom.Object.defineProperty(this, 'children', {value: new dom.Set()}).children;
    }
    get childElementCount() {
      return (this.hasOwnProperty('children') && this.children.size) || 0;
    }
    get textContent() {
      return (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || '';
    }
    set textContent(text) {
      this.hasOwnProperty('children') && this.children.size && this.children.clear();
      text && this.children.add(new dom.String(text));
    }
    appendChild(element) {
      return element && this.children.add(element), element;
    }
    append(...elements) {
      if (elements.length) for (const element of elements) element && this.children.add(element);
    }
    removeChild(element) {
      element && this.hasOwnProperty('children') && this.children.size && this.children.delete(element);
      return element;
    }
    remove(...elements) {
      if (elements.length && this.hasOwnProperty('children') && this.children.size)
        for (const element of elements) element && this.children.delete(element);
    }
  };

  dom.Element = class Element extends dom.Node {
    get innerHTML() {
      return this.textContent;
    }
    set innerHTML(text) {
      this.textContent = text;
    }
    get outerHTML() {
      let classList;
      let {className, tag, innerHTML, dataset} = this;

      className &&
        (className = className.trim()) &&
        ({
          [className]: classList = (className &&
            (Element.classLists[className] = [...new dom.Set(className.split(/\s+/g))].join(' '))) ||
            '',
        } = Element.classLists || (Element.classLists = dom.Object.create(null)));

      const openTag = [tag];

      classList && openTag.push(`class="${classList}"`);

      if (dataset)
        for (const [key, value] of dom.Object.entries(dataset))
          value == null || !key.trim || openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

      return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
    }

    toString() {
      return this.outerHTML;
    }
    toJSON() {
      return this.toString();
    }
  };

  dom.DocumentFragment = class DocumentFragment extends dom.Node {
    toString() {
      return this.textContent;
    }
    toJSON() {
      return (this.childElementCount && [...this.children]) || [];
    }
    [dom.Symbol.iterator]() {
      return ((this.childElementCount && this.children) || '')[dom.Symbol.iterator]();
    }
  };

  /** @type {typeof globalThis.Text} */
  dom.Text = class Text extends dom.String {
    toString() {
      return encodeEntities(super.toString());
    }
  };

  dom.createElement = (tag, properties, ...children) => {
    const element = new dom.Element();
    element.tag = tag;
    properties == null ||
      (({dataset: element.dataset, className: element.className, ...element.properties} = properties),
      element.className || (element.className = ''));
    children.length && dom.Object.defineProperty(element, 'children', {value: new dom.Set(children)});
    return element;
  };
  dom.createText = (content = '') => new dom.Text(content);
  dom.createFragment = () => new dom.DocumentFragment();

  endowments = undefined;

  return dom.Object.freeze(dom.Object.setPrototypeOf(dom, null));
};
