let initialized;
const isBrowser =
  typeof self !== 'undefined' && self.self === self && self.location && self.location.href;
const DefaultSource =
  'https://raw.githubusercontent.com/WebKit/webkit/master/Source/JavaScriptCore/ucd/PropList.txt';
// const isLocal = !browser || /^((127|0)\.0\.0|localhost)(:|$)/.test(self.location.hostname);

/**
 * Unicode properties generated from:
 *  https://www.unicode.org/Public/UCD/latest/ucd/PropList.txt
 *
 * Using the following replacements:
 *   /^(?:[#].*| *)$\n?/ -> ""
 *   /^(\w+)(?:\.\.(\w+)|).*(\S+) # (\w+).*$\n?/ -> "$4 $3 $1 $2;"
 *   /\b0+(?=\w)/ -> ""
 *
 *   // /^(\w+)(?:\.\.(\w+)|).*# (\w+).*$\n?/ -> "$3 $1 $2;"
 */
export const Unicode = {
  initialize: async () => (await (initialized || (initialized = initialize())), Unicode),
};

const {fromCodePoint, raw} = String;
const U = raw`\u`;
const X = raw`\x`;
const u = hex => `${U}${`${hex}`.toUpperCase().padStart(4, '0')}`;
// const s = hex => String.fromCodePoint(parseInt(hex, 16));
// ;`${U}${`${hex}`.toLowerCase().padStart(4, '0')}`;

export class UnicodeRange {
  constructor(start, end, properties) {
    end || (end = start);
    let string = '';
    const first = parseInt(start, 16);
    const last = parseInt(end, 16);
    const length = last - first + 1;
    for (let i = 0, v = first, n = length; n--; string += fromCodePoint(v++));
    Object.assign(this, properties, {string, first, last, start, end, length});
  }

  includes(value) {
    this.string.includes(value);
  }

  toString() {
    const {start, end} = this;
    return !start ? '' : !end || end === start ? u(start) : `${u(start)}-${u(end)}`;
  }

  // test(string) {
  //   return (this.pattern || (this.pattern = new RegExp(raw`^[${this.toString()}]+$`))).test(string);
  // }
}

export class UnicodeRanges extends Array {
  includes(value) {
    for (const range of this) if (range.includes(value)) return true;
    return false;
  }

  toString() {
    return this.join('');
  }

  // test(string) {
  //   return (this.pattern || (this.pattern = new RegExp(raw`[${this.toString()}]+$`))).test(string);
  // }

  static merge(include, exclude) {
    const ranges = new UnicodeRanges();
    if (!include || !include.length) return ranges;
    if (!exclude || !exclude.length) {
      ranges.push(...include.flat());
    } else {
      const filter = (ranges.filter = new RegExp(`[${exclude.join('')}]`, 'u'));
      const filtered = (ranges.filtered = []);
      for (const range of include.flat()) // [].concat(...include)
        range.string && (filter.test(range.string) ? filtered.push(range) : ranges.push(range));
    }
    return ranges;
  }
}

export const GeneralCategories = {
  Lu: 'Uppercase_Letter', // an uppercase letter
  Ll: 'Lowercase_Letter', // a lowercase letter
  Lt: 'Titlecase_Letter', // a digraphic character, with first part uppercase
  LC: 'Cased_Letter', // Lu | Ll | Lt
  Lm: 'Modifier_Letter', // a modifier letter
  Lo: 'Other_Letter', // other letters, including syllables and ideographs
  L: 'Letter', // Lu | Ll | Lt | Lm | Lo
  Mn: 'Nonspacing_Mark', // a nonspacing combining mark (zero advance width)
  Mc: 'Spacing_Mark', // a spacing combining mark (positive advance width)
  Me: 'Enclosing_Mark', // an enclosing combining mark
  M: 'Mark', // Mn | Mc | Me
  Nd: 'Decimal_Number', // a decimal digit
  Nl: 'Letter_Number', // a letterlike numeric character
  No: 'Other_Number', // a numeric character of other type
  N: 'Number', // Nd | Nl | No
  Pc: 'Connector_Punctuation', // a connecting punctuation mark, like a tie
  Pd: 'Dash_Punctuation', // a dash or hyphen punctuation mark
  Ps: 'Open_Punctuation', // an opening punctuation mark (of a pair)
  Pe: 'Close_Punctuation', // a closing punctuation mark (of a pair)
  Pi: 'Initial_Punctuation', // an initial quotation mark
  Pf: 'Final_Punctuation', // a final quotation mark
  Po: 'Other_Punctuation', // a punctuation mark of other type
  P: 'Punctuation', // Pc | Pd | Ps | Pe | Pi | Pf | Po
  Sm: 'Math_Symbol', // a symbol of mathematical use
  Sc: 'Currency_Symbol', // a currency sign
  Sk: 'Modifier_Symbol', // a non-letterlike modifier symbol
  So: 'Other_Symbol', // a symbol of other type
  S: 'Symbol', // Sm | Sc | Sk | So
  Zs: 'Space_Separator', // a space character (of various non-zero widths)
  Zl: 'Line_Separator', // U+2028 LINE SEPARATOR only
  Zp: 'Paragraph_Separator', // U+2029 PARAGRAPH SEPARATOR only
  Z: 'Separator', // Zs | Zl | Zp
  Cc: 'Control', // a C0 or C1 control code
  Cf: 'Format', // a format control character
  Cs: 'Surrogate', // a surrogate code point
  Co: 'Private_Use', // a private-use character
  Cn: 'Unassigned', // a reserved unassigned code point or a noncharacter
  C: 'Other', // Cc | Cf | Cs | Co | Cn
};

async function load(source = './resources/ucd/PropList.txt') {
  // DefaultSource
  const text = await (await fetch(new URL(source, import.meta.url))).text();
  ``;
  const table = text
    .replace(/^(?:[#].*| *)$\n?/gm, '')
    .replace(/^(\w+)(?:\.\.(\w+)|).*; (\S+) # (\w\w?).*$\n?/gm, '$4 $3 $1 $2\n');

  for (const entry of table.split('\n')) {
    const [categoryKey, propertyKey, start, end = start] = entry.split(' ');
    if (!propertyKey) continue;
    const property = Unicode[propertyKey] || (Unicode[propertyKey] = new UnicodeRanges());
    const range = new UnicodeRange(start, end);
    property.push(range);

    const categoryAlias = GeneralCategories[categoryKey] || categoryKey;

    (
      Unicode[categoryKey] || (Unicode[categoryKey] = Unicode[categoryAlias] = new UnicodeRanges())
    ).push(range);

    if (categoryKey.length === 1) continue;

    const categoryGroup = categoryKey[0];
    const categoryGroupAlias = GeneralCategories[categoryGroup] || categoryGroup;
    (
      Unicode[categoryGroup] ||
      (Unicode[categoryGroup] = Unicode[categoryGroupAlias] = new UnicodeRanges())
    ).push(range);
  }
}

async function initialize() {
  await load();
  const {
    L,
    Nl,
    Mn,
    Mc,
    Nd,
    Pc,
    Other_ID_Start,
    Other_ID_Continue,
    Pattern_Syntax,
    Pattern_White_Space,
    ID_Exclude = [Pattern_Syntax, Pattern_White_Space],
    ID_Start = (Unicode.ID_Start = UnicodeRanges.merge([L, Nl, Other_ID_Start], ID_Exclude)),
    ID_Continue = (Unicode.ID_Continue = UnicodeRanges.merge(
      [ID_Start, Mn, Mc, Nd, Pc, Other_ID_Continue],
      ID_Exclude,
    )),
  } = Unicode;
}

// const merge = (include, exclude) => {
//   const ranges = new UnicodeRanges();
//   if (!include || !include.length) return ranges;
//   if (!exclude || !exclude.length) {
//     ranges.push(...include.flat());
//   } else {
//     const filter = (ranges.filter = new RegExp(`[${exclude.join('')}]`, 'u'));
//     const filtered = (ranges.filtered = []);
//     for (const range of include.flat())
//       range.string && (filter.test(range.string) ? filtered.push(range) : ranges.push(range));
//   }
//   return ranges;
// };

// const ID_Exclude = [Pattern_Syntax, Pattern_White_Space];

// Unicode.ID_Start = merge([L, Nl, Other_ID_Start], ID_Exclude);
// Unicode.ID_Continue = merge([Unicode.ID_Start, Mn, Mc, Nd, Pc, Other_ID_Continue], ID_Exclude);

// [
//   [
//     ['Letter', 'L', [
//       ['Uppercase'], ['Lowercase'], ['Titlecase'],
//       ['Modifier'], ['Other'],
//     ]],
//     [['Cased', 'C'], ['Uppercase'], ['Lowercase'], ['Titlecase']],
//     ['Modifier'],
//     ['Other'],
//   ],
//   [['Number', 'N'], [['Decimal'], ['Letter'], ['Other']]],
//   [['Mark', 'M'], [['Nonespacing'], ['Spacing'], ['Enclosing']]],
//   [
//     ['Punctuation', 'P'],
//     [['Connector'], ['Dash'], ['Open'], ['Close'], ['Initial'], ['Final'], ['Other']],
//   ],
//   [['Symbol', 'S'], [['Math'], ['Currency'], ['Modifier'], ['Other']]],
// ];
