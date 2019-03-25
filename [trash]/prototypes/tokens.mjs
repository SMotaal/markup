export class Position {
  constructor(queue) {
    Object.defineProperties(this, {
      previous: {value: undefined, writable: true, enumerable: false},
      next: {value: undefined, writable: true, enumerable: false},
      index: {value: -1, writable: true, enumerable: true},
      queue: {value: queue, writable: true, enumerable: false},
    });
    // this.queue = this.next = this.previous = undefined;
    // this.index = -1;
    queue && this.insert(queue);
  }

  remove() {
    if (this.queue) {
      const {previous, next, index = queue.indexOf(this)} = this;
      previous && (previous.next = next);
      next && (next.previous = previous);
      index > -1 && this.queue.splice(index, 1);
    }
    this.queue = this.next = this.previous = undefined;
    this.index = -1;
  }

  insert(queue, index = queue.length) {
    this.remove();
    const previous = (this.previous = index > 0 ? queue[index - 1] : undefined);
    previous && (previous.next = this);
    const next = (this.next = index < queue.length ? queue[index] : undefined);
    next ? queue.splice(index, 0, (next.previous = this)) : queue.push(this);
    this.index = index;
  }

  before(position) {
    const queue = this.queue || ((this.index = 0), (this.queue = [this]));
    position.insert(queue, this.index);
  }

  after(position) {
    const queue = this.queue || ((this.index = 0), (this.queue = [this]));
    position.insert(queue, this.index + 1);
  }
}

export class Positions extends Array {
  next() {
    return new Position(this);
  }
}

export class Tokens {
  constructor(source) {
    this.source = source;
    this.positions = new Positions();
  }

  push(token) {
    if (!token || !token.text) return;
    const {index: offset, text: {length}, group} = token;
    const position = this.positions.next();
    position.offset = offset;
    position.length = length;
    position.group = group;
    // this.positions.next().token = token;
  }

  *[Symbol.iterator]() {
    // for (const position of this.positions) yield position.token;
    for (const position of this.positions) yield position;
  }
}

// function Symbolic(classifier) {
//   // const species = new.target || Symbolic;
//   // const key = `[${classifier || (classifier = species.name || 'Symbolic')}]`;
//   // const index = (Symbolic[key] = Symbolic[key] || 0 + 1);
//   // const identifier = `${classifier} #${index}`;
//   // return Symbol(identifier);
//   return Symbol(
//     `${classifier || (new.target && new.target.name) || 'Symbolic'} #${(Symbolic.count = Symbolic.count + 1 || 1)}`,
//   );
// }
