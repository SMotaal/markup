const {assign, defineProperty} = Object;

export const document = void null;

export class Node {
  get children() {
    return defineProperty(this, 'children', {value: new Set()}).children;
  }
  get childElementCount() {
    return (this.hasOwnProperty('children') && this.children.size) || 0;
  }
  get textContent() {
    return (this.hasOwnProperty('children') && this.children.size && [...this.children].join('')) || '';
  }
  set textContent(text) {
    this.hasOwnProperty('children') && this.children.size && this.children.clear();
    text && this.children.add(new String(text));
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
}

export class Element extends Node {
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
          (Element.classLists[className] = [...new Set(className.split(/\s+/g))].join(' '))) ||
          '',
      } = Element.classLists || (Element.classLists = Object.create(null)));

    const openTag = [tag];

    classList && openTag.push(`class="${classList}"`);

    if (dataset)
      for (const [key, value] of Object.entries(dataset))
        value == null || !key.trim || openTag.push(`data-${key}=${JSON.stringify(`${value}`)}`);

    return `<${openTag.join(' ')}>${innerHTML || ''}</${tag}>`;
  }

  toString() {
    return this.outerHTML;
  }
  toJSON() {
    return this.toString();
  }
}

export class DocumentFragment extends Node {
  toString() {
    return this.textContent;
  }
  toJSON() {
    return (this.childElementCount && [...this.children]) || [];
  }
  [Symbol.iterator]() {
    return ((this.childElementCount && this.children) || '')[Symbol.iterator]();
  }
}

export class Text extends String {
  toString() {
    return encodeEntities(super.toString());
  }
}

export const createElement = (tag, properties, ...children) => {
  const element = assign(new Element(), {
    tag,
    className: (properties && properties.className) || '',
    properties,
  });
  children.length && defineProperty(element, 'children', {value: new Set(children)});
  return element;
};

export const createText = (content = '') => new Text(content);
export const encodeEntity = entity => `&#${entity.charCodeAt(0)};`;
export const encodeEntities = string => string.replace(/[\u00A0-\u9999<>\&]/gim, encodeEntity);
export const createFragment = () => new DocumentFragment();
