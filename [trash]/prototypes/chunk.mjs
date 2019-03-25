export class Chunk {
  constructor(text, chunks) {
    Object.defineProperties(this, {
      // index: {value: -1, writable: true, enumerable: true},
      offset: {value: 0, writable: true, enumerable: true},
      size: {value: 0, writable: true, enumerable: true},
      text: {value: undefined, writable: true, enumerable: false},
      previous: {value: undefined, writable: true, enumerable: false},
      next: {value: undefined, writable: true, enumerable: false},
      chunks: {value: chunks, writable: true, enumerable: false},
    });
    chunks && this.insert(chunks);
    typeof text === 'string' && this.replace(text);
  }

  replace(text) {
    if (typeof text !== 'string') throw TypeError(`Chunk.update() invoked with ${typeof text} instead of string`);
    if (text === this.text) return;
    this.text = text;
    this.reallocate(-this.size || 0 + (this.size = text.length));
  }

  reallocate(offset) {
    if (!offset) return;
    let chunk = this;
    while ((chunk = chunk.next)) chunk.offset += offset;
  }

  remove() {
    if (this.chunks) {
      const {chunks, previous, next, index = chunks.indexOf(this), size} = this;
      size && next && this.reallocate(-size);
      previous && (previous.next = next);
      next && (next.previous = previous);
      index > -1 && chunks.splice(index, 1);
    }
    this.chunks = this.next = this.previous = undefined;
    // this.index = -1;
    this.offset = 0;
    return this;
  }

  insert(chunks, index = chunks.length) {
    this.remove();
    // this.index = index;
    const previous = (this.previous = index > 0 ? chunks[index - 1] : undefined);
    const next = (this.next = index < chunks.length ? chunks[index] : undefined);
    if (previous) {
      //  && previous.chunks === chunks
      (previous.next = this).offset = previous.offset + previous.size;
    } else {
      this.previous = undefined;
      this.offset = 0;
    }
    if (next) {
      //  && next.chunks === chunks
      chunks.splice(index, 0, (next.previous = this));
      this.reallocate(this.size);
    } else {
      this.next = undefined;
      chunks.push(this);
    }
    this.chunks = chunks;
    return this;
  }

  before(chunk) {
    // const chunks = this.chunks || ((this.index = 0), (this.chunks = [this]));
    const chunks = this.chunks || (this.chunks = [this]);
    return chunk.insert(chunks, chunks.indexOf(this));
  }

  after(chunk) {
    // const chunks = this.chunks || ((this.index = 0), (this.chunks = [this]));
    const chunks = this.chunks || (this.chunks = [this]);
    return chunk.insert(chunks, chunks.indexOf(this) + 1);
  }

  toString() {
    return this.text || '';
  }

  [Symbol.for('nodejs.util.inspect.custom')](depth, options) {
    const {offset, size} = this;
    return `Chunk<${offset}:${size}>`;
  }
}

export class Chunks extends Array {
  append(text) {
    if (text) new Chunk(text, this);
  }

  collapse() {
    const text = this.length && this.toString();
    if (!text) return;
    const chunks = this.splice(0, this.length);
    for (const chunk of chunks) chunk.chunks = undefined;
    // chunk.previous = chunk.next =
    this.append(text); // Object.keys({[text]: undefined})[0]
    return this;
  }

  toString() {
    return this.join('');
  }
}
