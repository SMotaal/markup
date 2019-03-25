import {Token} from './token.mjs';
import {UnknownKind, TextKind} from './token-kind.mjs';

export class Matcher extends RegExp {
  constructor(source = '(.*?)', flags = source && source.flags, groups = source && source.groups) {
    super(source, !flags ? 'g' : flags.includes('g') || flags.includes('y') ? flags : `g${flags}`);
    Object.defineProperties(this, {
      groups: {value: source.groups || Object.freeze(groups || [])},
    });
  }

  *tokenize(source, index = 0) {
    let match, lastIndex, nextIndex, token;
    this.lastIndex = index = (index > 0 && index) || 0;
    const state = Object.create(null, {
      source: {value: source, enumerable: false},
      index: {value: index, writable: true, enumerable: true},
      match: {value: undefined, writable: true, enumerable: false},
    });
    const groups = this.groups;
    const groupCount = groups.length;
    while (true) {
      match = match = this.exec(source);
      if (!match || !match[0]) return;
      const [, text, sequence, ...args] = (state.match = match);
      lastIndex = match.index;
      nextIndex = this.lastIndex;
      match.text = text;
      match.sequence = sequence;
      let group = UnknownKind;
      if (sequence) for (let i = 0, n = groupCount; (!args[i] && n--) || !(group = groups[i]); i++);
      match.group = group;
      if (text) {
        const nextIndex = (state.index = lastIndex + text.length);
        yield (token = new Token(text, TextKind, lastIndex, match, state));
        if (state.index !== nextIndex) {
          this.lastIndex = state.index;
          continue;
        }
        lastIndex = nextIndex;
      }
      if (sequence) {
        state.index = nextIndex;
        yield (token = new Token(sequence, group, lastIndex, match, state));
        state.index === nextIndex || (this.lastIndex = state.index);
      }
    }
  }

  debug(source, map) {
    let output = '';
    for (const token of this.tokenize(source)) {
      const {text, group, index} = token;
      if (!text) continue;
      const tag = (map && map[group || UnknownKind]) || map[TextKind];
      let slice = source.slice(index, index + text.length);
      slice = slice === text ? '' : `≢${slice}`;
      output += group !== TextKind ? `⟪${tag}${text}${slice}⟫` : `❲${text}${slice}❳`;
    }
    return output;
  }
}
