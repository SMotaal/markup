export class SourceText {
  constructor(source) {
    Object.defineProperties(this, properties).source = source;
  }

  set source(source) {
    if (source == null) return;

    const close = () => {
      this[READY] = this[BUFFER] = undefined;
      const reject = async () => {
        throw Error('Already closed');
      };
      Object.defineProperty(this, 'ready', {get: reject});
      this[CLOSE] = this[ABORT] = reject;
    };

    if (typeof source !== 'object') {
      this[CHUNKS] = [`${source}`];
      this.closed = Promise.resolve();
      close();
    } else {
      const closed = new Promise((resolve, reject) => {
        this[CLOSE] = async () => {
          this[CHUNKS] = this[BUFFER];
          close();
          resolve();
        };
        this[ABORT] = async reason => {
          close();
          reject(reason);
        };
      });
      Object.defineProperty(this, 'closed', {get: () => closed});
      this[BUFFER] = [];
      this[READY] = Promise.resolve();
    }

    Object.defineProperty(this, 'source', {get: () => source, enumerable: true});
    // Object.defineProperty(this, 'source', {value: source, enumerable: true});
  }

  get source() {}

  get ready() {
    return this[READY];
  }

  close() {
    return this[CLOSE]();
  }

  abort() {
    return this[ABORT]();
  }

  async *chunks() {
    const {source, [BUFFER]: buffer, [CHUNKS]: chunks} = this;
    if (chunks) {
      yield* chunks;
    } else if (buffer.length) {
      yield* buffer;
    } else if (source == null) {
      return;
    } else if (typeof source === 'object' && Symbol.iterator in source) {
      for (const chunk of source) await this.write(chunk), yield chunk;
      await this.close();
    } else if (Symbol.asyncIterator in source) {
      for await (const chunk of source) await this.write(chunk), yield chunk;
      await this.close();
    } else {
      const chunk = `${source}`;
      this.write(chunk);
      yield chunk;
      await this.close();
    }
  }

  async write(chunk) {
    const buffer = this[BUFFER];
    if (buffer && chunk) {
      buffer.push(await chunk);
      // await this[READY];

      // const index = buffer.push(chunk);
      // if (chunk.then) {
      //   this[READY] = chunk.then(chunk => {
      //     buffer[index] = `${chunk || ''}`;
      //   });
      // }
      // await chunk;
    }
  }

  async text() {
    const chunks = this.chunks();
    let text = '';
    for await (const chunk of chunks) text += `${chunk || ''}`;
    return text;
  }

  // async [Symbol.asyncIterator]() {
  //   return this.chunks();
  // }

  // toString() {
  //   const source = this.source;
  //   if (source && source !== this) {
  //     const type = typeof source;
  //     if (type === 'string') return source;
  //     if (type === 'object' && 'toString' in source) return source;
  //   }
  //   return '';
  // }
}

const BUFFER = '[buffer]';
const CHUNKS = '[chunks]';
const CLOSE = '[close]';
const ABORT = '[abort]';
const READY = '[ready]';
const internal = {value: undefined, writable: true, enumerable: false};
const external = {value: undefined, writable: true, enumerable: true};
const properties = {
  // source: external,
  [BUFFER]: internal,
  [CHUNKS]: internal,
  [CLOSE]: internal,
  [ABORT]: internal,
  [READY]: internal,
};
SourceText.prototype[CLOSE] = SourceText.prototype[ABORT] = () => Promise.reject('Invalid operation');
