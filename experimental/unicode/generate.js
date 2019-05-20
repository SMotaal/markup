(console.clear(),
function() {
  'use strict';
  const escape = (code, value) =>
    (value = String.fromCharCode(code)).trim() && /\w/.test(value)
      ? value
      : code < 0xff
      ? `\\x${code.toString(16).padStart(2, '0')}`
      : `\\u${code.toString(16).padStart(4, '0')}`;

  class RegExpRange extends RegExp {
    static fromBuffer({buffer, flags}) {
      let first, last;
      const ranges = [];
      const bytes = new Int8Array(buffer);
      for (let n = 0xff0000, v = -2, c, b = 0, i = 0; n--; ++b === 8 && (i++, (b = 0))) {
        v + 1 === ((c = bytes[i] & (0b1 << b) ? (v = i * 8 + b) : undefined), v)
          ? (last = c)
          : (last === undefined || ranges.push(`${first !== last ? `${escape(first)}-` : ''}${escape(last)}`),
            (first = last = c));
      }
      const instance = new (this || RegExpRange)(
        `[${ranges.length ? ranges.filter(Boolean).join('') : ''}]`,
        flags || undefined,
      );
      instance.ranges = ranges;
      instance.buffer = buffer;
      return instance;
    }
    static define({start, end, range, flags}) {
      let buffer, bytes;

      typeof start === 'string'
        ? (start = start.codePointAt(0))
        : (start <= 0x10ffff && (start = 0 + start) > 0) || (start = 0);
      typeof end === 'string'
        ? (end = end.codePointAt(0))
        : end < start
        ? ([start, end] = [end > 0 || 0, start])
        : end <= 0x10ffff || (end = start < 0xffff ? 0xffff : 0x10fff);

      bytes = new Int8Array((buffer = new ArrayBuffer(0x11000 / 8)));

      for (
        let c = start, n = 1 + end - start, b = start % 8, i = Math.floor(start / 8);
        n--;
        (!range || range.test(String.fromCharCode(c++))) && (bytes[i] |= 0b1 << b), ++b === 8 && (i++, (b = 0))
      );

      const instance = RegExpRange.fromBuffer({
        buffer,
        flags: (flags === undefined && range && range.flags) || flags || undefined,
      });

      instance.start = start;
      instance.end = end;

      return instance;
    }
  }
  const results = [...arguments].map(v => (v ? RegExpRange.define(v) : undefined));
  typeof copy === 'function' && copy(results);
  return results;
})(
  {start: '0', end: '9'},
  {start: '1', range: /[0-46-9]/},
  {range: /[0-46-9]/},
  {range: /\w/},
  {range: /\w/u},
  'mozPaintCount' in globalThis || {range: new RegExp(String.raw`\p{ID_Start}`, 'u')},
  'mozPaintCount' in globalThis || {range: new RegExp(String.raw`\p{ID_Continue}`, 'u')},
  // 'mozPaintCount' in globalThis || {range: new RegExp(String.raw`[\p{ID_Start}\p{ID_Continue}]`, 'u')},
  // 'mozPaintCount' in globalThis || {range: new RegExp(String.raw`\p{XID_Continue}`, 'u')},
);
