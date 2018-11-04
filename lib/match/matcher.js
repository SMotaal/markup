export class Matcher {
  constructor(source, flags) {
    const defaults = new.target.defaults || Matcher.defaults;
    this.expression = new RegExp(source || defaults.source, flags || defaults.flags);
  }

  get source() {
    return (this.expression && this.expression.source) || '';
  }

  set source(source) {
    const current = this.expression;
    const defaults = this.constructor.defaults || Matcher.defaults;
    if (!current) {
      this.expression = new RegExp(source || defaults.source, defaults.flags);
    } else if (current.source !== source || (source = defaults.source)) {
      (this.expression = new RegExp(source, current ? current.flags : defaults.flags)).lastIndex =
        current.lastIndex;
    }
  }

  get flags() {
    return (this.expression && this.expression.flags) || '';
  }

  set flags(flags) {
    const current = this.expression;
    const defaults = this.constructor.defaults || Matcher.defaults;
    if (!current) {
      this.expression = new RegExp(defaults.source, flags || defaults.flags);
    } else if (current.flags !== (flags = defaults.flags)) {
      (this.expression = new RegExp(current ? current.source : defaults.source, flags)).lastIndex =
        current.lastIndex;
    }
  }

  get lastIndex() {
    return (this.expression && this.expression.lastIndex) || null;
  }

  set lastIndex(lastIndex) {
    this.expression && (this.expression.lastIndex = lastIndex);
  }

  exec() {
    if (this.expression) return this.expression.exec(... arguments);
  }

  [Symbol.replace]() {
    if (this.expression) return this.expression[Symbol.replace](... arguments);
  }

  [Symbol.search]() {
    if (this.expression) return this.expression[Symbol.search](... arguments);
  }

  [Symbol.match]() {
    if (this.expression) return this.expression[Symbol.match](... arguments);
  }
}

Matcher.defaults = {source: '.', flags: 'y'};
