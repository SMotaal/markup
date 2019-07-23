//@ts-check

const RegExpClass = /^(?:\[(?=.*?\]$)|)((?:\\.|[^\\\n\[\]]*)*)\]?$/;

export class RegExpRange extends RegExp {
  constructor(source, flags) {
    /** @type {string} */
    let range;

    range =
      source && typeof source === 'object' && source instanceof RegExp
        ? (flags === undefined && (flags = source.flags), source.source)
        : (typeof source === 'string' ? source : (source = `${source || ''}`)).trim() &&
          (source = RegExpClass[Symbol.replace](source, '[$1]'));

    if (!range || !RegExpClass.test(range)) {
      throw TypeError(`Invalid Regular Expression class range: ${range}`);
    }

    typeof flags === 'string' || (flags = `${flags || ''}` || '');

    flags.includes('u') || !(source.includes('\\p{') || source.includes('\\u')) || (flags += 'u');

    super(source, flags);

    Object.defineProperty(this, 'range', {value: range.slice(1, -1), enumerable: true, writable: false});
  }

  toString() {
    return this.range;
  }

  static define(strings, ...values) {
    return new (this || RegExpRange)(String.raw(strings, ...values));
  }
}
