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

  pseudo.DOMNodeList = class DOMNodeList extends pseudo.Set {};

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DOMNodeList).prototype);

  pseudo.Node = class Node extends pseudo.Object {
    get children() {
      return pseudo.Object.defineProperty(this, 'children', {value: new pseudo.DOMNodeList()}).children;
    }

    get childElementCount() {
      return (this.hasOwnProperty('children') && this.children.size) || 0;
    }

    get textContent() {
      return (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || '';
    }

    set textContent(text) {
      this.hasOwnProperty('children') && this.children.size && this.children.clear();
      text && this.children.add(new pseudo.Text(text));
    }

    appendChild(element) {
      return element && this.children.add(element), element;
    }

    removeChild(element) {
      element && this.hasOwnProperty('children') && this.children.size && this.children.delete(element);
      return element;
    }

    remove() {
      //   if (elements.length && this.hasOwnProperty('children') && this.children.size)
      //     for (const element of elements) element && this.children.delete(element);
      throw `Unsupported: Compositional nodes cannot be directly removed!`;
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Node).prototype);

  pseudo.Element = class Element extends pseudo.Node {
    get style() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'style', {value: new pseudo.CSSStyleDeclaration(), writable: false})
          .style;
      throw Error(`Invalid invocation of Element.style getter/setter.`);
    }

    set style(value) {
      value == null || pseudo.Object.assign(this.style, {...value});
    }

    get dataset() {
      if (this && this !== this.constructor.prototype)
        return pseudo.Object.defineProperty(this, 'dataset', {value: new pseudo.DOMStringMap(), writable: false})
          .dataset;
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

    append(...elements) {
      if (elements.length)
        for (const element of elements)
          element === '' || this.children.add(typeof element === 'object' ? element : new pseudo.Text(element));
    }

    toString() {
      return this.outerHTML;
    }

    toJSON() {
      return this.toString();
    }
  };

  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.Element).prototype);

  pseudo.DocumentFragment = class DocumentFragment extends pseudo.Node {
    toString() {
      return this.textContent;
    }

    toJSON() {
      return (this.childElementCount && [...this.children]) || [];
    }

    [pseudo.Symbol.iterator]() {
      return ((this.childElementCount && this.children) || '')[pseudo.Symbol.iterator]();
    }
  };

  pseudo.DocumentFragment.prototype.append = pseudo.Element.prototype.append;
  pseudo.Object.freeze(pseudo.Object.freeze(pseudo.DocumentFragment).prototype);

  /** @type {typeof globalThis.Text} */
  pseudo.Text = class Text extends pseudo.String {
    toString() {
      return Pseudom.encodeEntities(super.toString());
    }
  };

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
