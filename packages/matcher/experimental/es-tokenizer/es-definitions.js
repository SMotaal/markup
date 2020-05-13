//@ts-check
import {generateDefinitions, defineSymbol, Keywords, Construct, Ranges} from '../common/helpers.js';

export const {
  ECMAScriptGoal,
  ECMAScriptCommentGoal,
  ECMAScriptRegExpGoal,
  ECMAScriptRegExpClassGoal,
  ECMAScriptStringGoal,
  ECMAScriptTemplateLiteralGoal,
  ECMAScriptDefinitions,
} = (() => {
  // Avoids TypeScript "always …" style errors
  const DEBUG_CONSTRUCTS = Boolean(false);

  const identities = {
    UnicodeIDStart: 'ECMAScript.UnicodeIDStart',
    UnicodeIDContinue: 'ECMAScript.UnicodeIDContinue',
    HexDigits: 'ECMAScript.HexDigits',
    CodePoint: 'ECMAScript.CodePoint',
    ControlEscape: 'ECMAScript.ControlEscape',
    ContextualWord: 'ECMAScript.ContextualWord',
    RestrictedWord: 'ECMAScript.RestrictedWord',
    FutureReservedWord: 'ECMAScript.FutureReservedWord',
    Keyword: 'ECMAScript.Keyword',
  };

  const goals = {};
  const symbols = {};

  const ECMAScriptGoal = (goals[(symbols.ECMAScriptGoal = defineSymbol('ECMAScriptGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '(', '[', "'", '"', '`', '/', '/*', '//'],
    // TODO: Properly fault on invalid closer
    closers: ['}', ')', ']'],
    /** @type {ECMAScript.Keywords} */
    // @ts-ignore
    keywords: Keywords({
      // TODO: Let's make those constructs (this.new.target borks)
      // [identities.MetaProperty]: 'new.target import.meta',
      [identities.Keyword]: [
        ...['await', 'break', 'case', 'catch', 'class', 'const', 'continue'],
        ...['debugger', 'default', 'delete', 'do', 'else', 'export', 'extends'],
        ...['finally', 'for', 'function', 'if', 'import', 'in', 'instanceof'],
        ...['let', 'new', 'return', 'super', 'switch', 'this', 'throw', 'try'],
        ...['typeof', 'var', 'void', 'while', 'with', 'yield'],
      ],
      [identities.RestrictedWord]: ['interface', 'implements', 'package', 'private', 'protected', 'public'],
      [identities.FutureReservedWord]: ['enum'],
      // NOTE: This is purposely not aligned with the spec
      [identities.ContextualWord]: ['arguments', 'async', 'as', 'from', 'of', 'static', 'get', 'set'],
    }),

    punctuation: {
      '=>': 'combinator',
      '?': 'delimiter',
      ':': 'delimiter',
      ',': 'delimiter',
      ';': 'breaker',
      '"': 'quote',
      "'": 'quote',
      '`': 'quote',
    },

    fallthrough: 'fault',

    ranges: Ranges({
      NullCharacter: range => range`\0`,
      BinaryDigit: range => range`01`,
      DecimalDigit: range => range`0-9`,
      ControlLetter: range => range`A-Za-z`,
      HexLetter: range => range`A-Fa-f`,
      HexDigit: (range, {DecimalDigit, HexLetter}) => range`${DecimalDigit}${HexLetter}`,
      GraveAccent: range => range`${'`'}`,
      ZeroWidthNonJoiner: range => range`\u200c`,
      ZeroWidthJoiner: range => range`\u200d`,
      ZeroWidthNoBreakSpace: range => range`\ufeff`,
      CombiningGraphemeJoiner: range => range`\u034f`,
      Whitespace: (range, {ZeroWidthNoBreakSpace}) => range`\s${ZeroWidthNoBreakSpace}`,
      IdentifierStart: (range, {UnicodeIDStart}) => range`_$${UnicodeIDStart}`,
      IdentifierPart: (range, {UnicodeIDContinue, ZeroWidthNonJoiner, ZeroWidthJoiner, CombiningGraphemeJoiner}) =>
        range`$${UnicodeIDContinue}${ZeroWidthNonJoiner}${ZeroWidthJoiner}${CombiningGraphemeJoiner}`,
      UnicodeIDStart: range =>
        range`\p{ID_Start}` ||
        range`A-Za-z\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e-\u066f\u0671-\u06d3\u06d5\u06e5-\u06e6\u06ee-\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4-\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc-\u09dd\u09df-\u09e1\u09f0-\u09f1\u09fc\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0-\u0ae1\u0af9\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3d\u0b5c-\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60-\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0-\u0ce1\u0cf1-\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32-\u0e33\u0e40-\u0e46\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2-\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065-\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae-\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5-\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a-\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd-\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5-\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
      UnicodeIDContinue: range =>
        range`\p{ID_Continue}` ||
        range`0-9A-Z_a-z\xaa\xb5\xb7\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0300-\u0374\u0376-\u0377\u037a-\u037d\u037f\u0386-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u0483-\u0487\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u0591-\u05bd\u05bf\u05c1-\u05c2\u05c4-\u05c5\u05c7\u05d0-\u05ea\u05ef-\u05f2\u0610-\u061a\u0620-\u0669\u066e-\u06d3\u06d5-\u06dc\u06df-\u06e8\u06ea-\u06fc\u06ff\u0710-\u074a\u074d-\u07b1\u07c0-\u07f5\u07fa\u07fd\u0800-\u082d\u0840-\u085b\u0860-\u086a\u08a0-\u08b4\u08b6-\u08bd\u08d3-\u08e1\u08e3-\u0963\u0966-\u096f\u0971-\u0983\u0985-\u098c\u098f-\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bc-\u09c4\u09c7-\u09c8\u09cb-\u09ce\u09d7\u09dc-\u09dd\u09df-\u09e3\u09e6-\u09f1\u09fc\u09fe\u0a01-\u0a03\u0a05-\u0a0a\u0a0f-\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32-\u0a33\u0a35-\u0a36\u0a38-\u0a39\u0a3c\u0a3e-\u0a42\u0a47-\u0a48\u0a4b-\u0a4d\u0a51\u0a59-\u0a5c\u0a5e\u0a66-\u0a75\u0a81-\u0a83\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2-\u0ab3\u0ab5-\u0ab9\u0abc-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ad0\u0ae0-\u0ae3\u0ae6-\u0aef\u0af9-\u0aff\u0b01-\u0b03\u0b05-\u0b0c\u0b0f-\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32-\u0b33\u0b35-\u0b39\u0b3c-\u0b44\u0b47-\u0b48\u0b4b-\u0b4d\u0b56-\u0b57\u0b5c-\u0b5d\u0b5f-\u0b63\u0b66-\u0b6f\u0b71\u0b82-\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99-\u0b9a\u0b9c\u0b9e-\u0b9f\u0ba3-\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd0\u0bd7\u0be6-\u0bef\u0c00-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55-\u0c56\u0c58-\u0c5a\u0c60-\u0c63\u0c66-\u0c6f\u0c80-\u0c83\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbc-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5-\u0cd6\u0cde\u0ce0-\u0ce3\u0ce6-\u0cef\u0cf1-\u0cf2\u0d00-\u0d03\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d44\u0d46-\u0d48\u0d4a-\u0d4e\u0d54-\u0d57\u0d5f-\u0d63\u0d66-\u0d6f\u0d7a-\u0d7f\u0d82-\u0d83\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2-\u0df3\u0e01-\u0e3a\u0e40-\u0e4e\u0e50-\u0e59\u0e81-\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0ebd\u0ec0-\u0ec4\u0ec6\u0ec8-\u0ecd\u0ed0-\u0ed9\u0edc-\u0edf\u0f00\u0f18-\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e-\u0f47\u0f49-\u0f6c\u0f71-\u0f84\u0f86-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1049\u1050-\u109d\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u135d-\u135f\u1369-\u1371\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176c\u176e-\u1770\u1772-\u1773\u1780-\u17d3\u17d7\u17dc-\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1820-\u1878\u1880-\u18aa\u18b0-\u18f5\u1900-\u191e\u1920-\u192b\u1930-\u193b\u1946-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u19d0-\u19da\u1a00-\u1a1b\u1a20-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1aa7\u1ab0-\u1abd\u1b00-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1bf3\u1c00-\u1c37\u1c40-\u1c49\u1c4d-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1cd0-\u1cd2\u1cd4-\u1cfa\u1d00-\u1df9\u1dfb-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u203f-\u2040\u2054\u2071\u207f\u2090-\u209c\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d7f-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2de0-\u2dff\u3005-\u3007\u3021-\u302f\u3031-\u3035\u3038-\u303c\u3041-\u3096\u3099-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fef\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua62b\ua640-\ua66f\ua674-\ua67d\ua67f-\ua6f1\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7c6\ua7f7-\ua827\ua840-\ua873\ua880-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f7\ua8fb\ua8fd-\ua92d\ua930-\ua953\ua960-\ua97c\ua980-\ua9c0\ua9cf-\ua9d9\ua9e0-\ua9fe\uaa00-\uaa36\uaa40-\uaa4d\uaa50-\uaa59\uaa60-\uaa76\uaa7a-\uaac2\uaadb-\uaadd\uaae0-\uaaef\uaaf2-\uaaf6\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab67\uab70-\uabea\uabec-\uabed\uabf0-\uabf9\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40-\ufb41\ufb43-\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe00-\ufe0f\ufe20-\ufe2f\ufe33-\ufe34\ufe4d-\ufe4f\ufe70-\ufe74\ufe76-\ufefc\uff10-\uff19\uff21-\uff3a\uff3f\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc`,
    }),
  });

  const ECMAScriptCommentGoal = (goals[(symbols.ECMAScriptCommentGoal = defineSymbol('ECMAScriptCommentGoal'))] = {
    type: 'comment',
    flatten: true,
    fold: true,
    spans: {
      // SINLE-LINE COMMENT
      //
      //    This faults when match[1] === ''
      //    It forwards until ‹\n›
      '//': /.*?(?=\n|($))/g,
      //
      //    Alternative: '\n' ie indexOf(…, lastIndex)
      //
      // MULTI-LINE COMMENT
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹*/›
      '/*': /[^]*?(?=\*\/|($))/g,
      //
      //   Alternative: '*/' ie indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptRegExpGoal = (goals[(symbols.ECMAScriptRegExpGoal = defineSymbol('ECMAScriptRegExpGoal'))] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: ['(', '{', '['],
    closers: [],
    opener: '/',
    closer: '/',
    punctuators: ['+', '*', '?', '|', '^', '.', '?=', '?:', '?!'],
    punctuation: {
      '[': 'combinator',
      ']': 'combinator',
      '(': 'combinator',
      ')': 'combinator',
      '{': 'combinator',
      '}': 'combinator',
      '\n': 'fault',
    },
    spans: {
      // This faults when match[1] === ''
      //   It forwards thru ‹•\d•,•}› ‹•,•\d•}› or ‹•\d•}› only
      '{': /\s*(?:\d+\s*,\s*\d+|\d+\s*,|\d+|,\s*\d+)\s*}|()/g,
    },
  });

  const ECMAScriptRegExpClassGoal = (goals[
    (symbols.ECMAScriptRegExpClassGoal = defineSymbol('ECMAScriptRegExpClassGoal'))
  ] = {
    type: 'pattern',
    flatten: undefined,
    fold: undefined,
    openers: [],
    closers: [']'],
    opener: '[',
    closer: ']',
    punctuators: ['\\', '^', '-'],
    punctuation: {
      '[': 'pattern',
      ']': 'combinator',
      '(': 'pattern',
      ')': 'pattern',
      '{': 'pattern',
      '}': 'pattern',
      '\n': 'fault',
    },
  });

  ECMAScriptRegExpGoal.openers['['] = {
    goal: symbols.ECMAScriptRegExpClassGoal,
    parentGoal: symbols.ECMAScriptRegExpGoal,
  };

  const ECMAScriptStringGoal = (goals[(symbols.ECMAScriptStringGoal = defineSymbol('ECMAScriptStringGoal'))] = {
    type: 'quote',
    flatten: true,
    fold: true,
    spans: {
      // SINGLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹'›
      "'": /(?:[^'\\\n]+?(?=\\[^]|')|\\[^])*?(?='|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
      //
      // DOUBLE-QUOTE
      //
      //   This faults when match[1] === '\n' or ''
      //   It forwards until ‹"›
      '"': /(?:[^"\\\n]+?(?=\\[^]|")|\\[^])*?(?="|($|\n))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
    punctuation: {
      '\n': 'fault',
    },
  });

  const ECMAScriptTemplateLiteralGoal = (goals[
    (symbols.ECMAScriptTemplateLiteralGoal = defineSymbol('ECMAScriptTemplateLiteralGoal'))
  ] = {
    type: 'quote',
    flatten: true,
    fold: false,
    openers: ['${'],
    opener: '`',
    closer: '`',
    punctuation: {
      '${': 'opener',
    },
    spans: {
      // GRAVE/BACKTIC QUOTE
      //
      //   This faults when match[1] === ''
      //   It forwards until ‹\n› ‹`› or ‹${›
      '`': /(?:[^`$\\\n]+?(?=\n|\\.|`|\$\{)|\\.)*?(?=\n|`|\$\{|($))/g,
      //
      //   We cannot use indexOf(…, lastIndex)
    },
  });

  {
    const operativeKeywords = new Set('await delete typeof void yield'.split(' '));
    const declarativeKeywords = new Set('export import default async function class const let var'.split(' '));
    const constructiveKeywords = new Set(
      'await async function class await delete typeof void yield this new'.split(' '),
    );

    /**
     * Determines if the capture is a valid keyword, identifier or undefined
     * based on matcher state (ie lastAtom, context, intent) and subset
     * of ECMAScript keyword rules of significant.
     *
     * TODO: Refactor or extensively test captureKeyword
     * TODO: Document subset of ECMAScript keyword rules of significant
     *
     * @param {string} text - Matched by /\b(‹text›)\b(?=[^\s$_:]|\s+[^:]|$)
     * @param {State} state
     * @param {string} [intent]
     */
    const captureKeyword = (text, {lastAtom: pre, lineIndex, context}, intent) => {
      //                              (a) WILL BE ‹fault› UNLESS  …
      switch (intent || (intent = context.intent)) {
        //  DESTRUCTURING INTENT  (ie Variable/Class/Function declarations)
        case 'destructuring':
        //  DECLARATION INTENT  (ie Variable/Class/Function declarations)
        case 'declaration':
          return (
            //                        (b)   WILL BE ‹idenfitier›
            //                              AFTER ‹.›  (as ‹operator›)
            (pre !== undefined && pre.text === '.' && 'identifier') ||
            //                        (c)   WILL BE ‹keyword›
            //                              IF DECLARATIVE AND …
            (declarativeKeywords.has(text) &&
              //                      (c1)  NOT AFTER ‹keyword› …
              (pre === undefined ||
                pre.type !== 'keyword' ||
                //                          UNLESS IS DIFFERENT
                (pre.text !== text &&
                  //                        AND NOT ‹export› NOR ‹import›
                  !(text === 'export' || text === 'import') &&
                  //                  (c2)  FOLLOWS ‹export› OR ‹default›
                  (pre.text === 'export' ||
                    pre.text === 'default' ||
                    //                (c3)  IS ‹function› AFTER ‹async›
                    (pre.text === 'async' && text === 'function')))) &&
              'keyword')
          );
        default:
          return (
            //                        (b)   WILL BE ‹idenfitier› …
            (((pre !== undefined &&
              //                      (b1)  AFTER ‹.›  (as ‹operator›)
              pre.text === '.') ||
              //                      (b2)  OR ‹await› (not as ‹keyword›)
              (text === 'await' && context.awaits === false) ||
              //                      (b3)  OR ‹yield› (not as ‹keyword›)
              (text === 'yield' && context.yields === false)) &&
              'identifier') ||
            //                        (c)   WILL BE ‹keyword› …
            ((pre === undefined ||
              //                      (c1)  NOT AFTER ‹keyword›
              pre.type !== 'keyword' ||
              //                      (c2)  UNLESS OPERATIVE
              operativeKeywords.has(pre.text) ||
              //                      (c3)  OR ‹if› AFTER ‹else›
              (text === 'if' && pre.text === 'else') ||
              //                      (c4)  OR ‹default› AFTER ‹export›
              (text === 'default' && pre.text === 'export') ||
              //                      (c5)  NOT AFTER ‹async›
              //                            EXCEPT ‹function›
              ((pre.text !== 'async' || text === 'function') &&
                //                    (c6)  AND NOT AFTER ‹class›
                //                          EXCEPT ‹extends›
                (pre.text !== 'class' || text === 'extends') &&
                //                    (c7)  AND NOT AFTER ‹for›
                //                          EXCEPT ‹await› (as ‹keyword›)
                (pre.text !== 'for' || text === 'await') &&
                //                    (c6)  NOT AFTER ‹return›
                //                          AND IS DIFFERENT
                //                          AND IS NOT ‹return›
                (pre.text !== 'return'
                  ? pre.text !== text
                  : text !== 'return'
                  ? //                (c7)  OR AFTER ‹return›
                    //                      AND IS CONSTRUCTIVE
                    constructiveKeywords.has(text)
                  : //                (c8)  OR AFTER ‹return›
                    //                      AND IS ‹return›
                    //                      WHEN ON NEXT LINE
                    pre.lineNumber < 1 + lineIndex))) &&
              'keyword')
          );
      }
    };

    const EmptyConstruct = Object.freeze(new Construct());
    const initializeContext = context => {
      if (context.state['USE_CONSTRUCTS'] !== true) return;
      context.parentContext == null || context.parentContext.currentConstruct == null
        ? (context.currentConstruct == null && (context.currentConstruct = EmptyConstruct),
          (context.parentConstruct = context.openingConstruct = EmptyConstruct))
        : (context.currentConstruct == null && (context.currentConstruct = new Construct()),
          (context.parentConstruct = context.parentContext.currentConstruct),
          context.parentContext.goal === ECMAScriptGoal && context.parentConstruct.add(context.group.description),
          (context.openingConstruct = context.parentConstruct.clone()),
          DEBUG_CONSTRUCTS === true && console.log(context));
    };

    goals[symbols.ECMAScriptRegExpGoal].initializeContext = goals[
      symbols.ECMAScriptStringGoal
    ].initializeContext = goals[symbols.ECMAScriptTemplateLiteralGoal].initializeContext = initializeContext;

    /** @param {Context} context */
    goals[symbols.ECMAScriptGoal].initializeContext = context => {
      context.captureKeyword = captureKeyword;
      context.state['USE_CONSTRUCTS'] === true && initializeContext(context);
    };
  }

  return {
    ECMAScriptGoal,
    ECMAScriptCommentGoal,
    ECMAScriptRegExpGoal,
    ECMAScriptRegExpClassGoal,
    ECMAScriptStringGoal,
    ECMAScriptTemplateLiteralGoal,
    ECMAScriptDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}'},
        ['(']: {opener: '(', closer: ')'},
        ['[']: {opener: '[', closer: ']'},
        ['//']: {
          opener: '//',
          closer: '\n',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/*']: {
          opener: '/*',
          closer: '*/',
          goal: symbols.ECMAScriptCommentGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹comment›',
        },
        ['/']: {
          opener: '/',
          closer: '/',
          goal: symbols.ECMAScriptRegExpGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹pattern›',
        },
        ["'"]: {
          opener: "'",
          closer: "'",
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['"']: {
          opener: '"',
          closer: '"',
          goal: symbols.ECMAScriptStringGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹string›',
        },
        ['`']: {
          opener: '`',
          closer: '`',
          goal: symbols.ECMAScriptTemplateLiteralGoal,
          parentGoal: symbols.ECMAScriptGoal,
          description: '‹template›',
        },
        ['${']: {
          opener: '${',
          closer: '}',
          goal: symbols.ECMAScriptGoal,
          parentGoal: symbols.ECMAScriptTemplateLiteralGoal,
          description: '‹span›',
        },
      },
    }),
  };
})();

/** @typedef {import('./types').State} State */
/** @typedef {import('./types').Context} Context */

/**
 * @typedef {'await'|'break'|'case'|'catch'|'class'|'const'|'continue'|'debugger'|'default'|'delete'|'do'|'else'|'export'|'extends'|'finally'|'for'|'function'|'if'|'import'|'in'|'instanceof'|'new'|'return'|'super'|'switch'|'this'|'throw'|'try'|'typeof'|'var'|'void'|'while'|'with'|'yield'} ECMAScript.Keyword
 * @typedef {'interface'|'implements'|'package'|'private'|'protected'|'public'} ECMAScript.RestrictedWord
 * @typedef {'enum'} ECMAScript.FutureReservedWord
 * @typedef {'arguments'|'async'|'as'|'from'|'of'|'static'} ECMAScript.ContextualKeyword
 * @typedef {Record<ECMAScript.Keyword|ECMAScript.RestrictedWord|ECMAScript.FutureReservedWord|ECMAScript.ContextualKeyword, symbol>} ECMAScript.Keywords
 */
