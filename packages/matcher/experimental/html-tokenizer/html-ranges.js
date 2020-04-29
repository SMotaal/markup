import {Ranges} from '../common/helpers.js';

export const HTMLRanges = Ranges({
  NullCharacter: range => range`\0`,
  DecimalDigit: range => range`0-9`,
  ControlCharacter: (range, {NullCharacter}) => range`${NullCharacter}-\x1f`,
  HexLetter: range => range`A-Fa-f`,
  HexDigit: (range, {DecimalDigit, HexLetter}) => range`${DecimalDigit}${HexLetter}`,
});
