export class Token {
  constructor(text, group, index, match, state) {
    Object.defineProperties(this, {
      text: {value: text, writable: false, enumerable: true},
      group: {value: group, writable: false, enumerable: true},
      index: {value: index, writable: false, enumerable: true},
      match: {value: match, writable: false, enumerable: false},
      state: {value: state, writable: false, enumerable: false},
    });
  }
}
