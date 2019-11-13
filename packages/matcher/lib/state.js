//@ts-check
/// <reference path="./types.d.ts" />

const CurrentIndex = Symbol('CurrentIndex');
const CurrentMatch = Symbol('CurrentMatch');
const CurrentToken = Symbol('CurrentToken');
const CreatedToken = Symbol('CreatedToken');
const TotalTokens = Symbol('TotalTokens');
const TotalMatches = Symbol('TotalMatches');
const Next = Symbol('Next');
const Initialize = Symbol('Initialize');
const Finalize = Symbol('Finalize');
const Tokens = Symbol('Tokens');

/** @template {RegExp} T  @implements {MatcherIterator<T>} */
export class MatcherState {
  /** @param {Partial<MatcherState<T>>} properties */
  constructor({source, matcher, initialize, finalize, ...properties}) {
    Object.assign(this, properties);

    this.done = false;
    /** @type {*} */
    this.value = undefined;

    /** @type {string} */
    this.source = String(source);
    /** @type {T} */
    this.matcher =
      matcher &&
      (matcher instanceof RegExp
        ? Object.setPrototypeOf(RegExp(matcher.source, matcher.flags || 'g'), matcher)
        : RegExp(matcher, 'g'));

    /** @type {RegExpExecArray} */
    this[CurrentMatch] = undefined;
    this[TotalMatches] = -1;
    this[Next] = this.getNextMatch;
    this[Initialize] =
      typeof initialize === 'function'
        ? () => {
            this.initialize();
            initialize();
          }
        : this.initialize;
    this[Finalize] =
      typeof finalize === 'function'
        ? () => {
            finalize();
            this.finalize();
          }
        : this.finalize;
  }

  initialize() {
    Object.defineProperties(this, {
      source: {value: this.source, writable: false, configurable: true},
      matcher: {value: this.matcher, writable: false, configurable: true},
    });
    this[TotalMatches] = 0;
  }

  finalize() {
    Object.freeze(this);
  }

  [Symbol.iterator]() {
    return this;
  }

  next() {
    if (this.done) return this;
    if (this[TotalMatches] === -1) this[Initialize]();
    if ((this.done = (this.value = this[Next]()) == null)) this[Finalize]();
    else this[TotalMatches]++;
    return this;
  }

  getNextMatch() {
    return !this.done &&
      this.matcher.lastIndex <
        ((this[CurrentMatch] = this.matcher.exec(this.source)) != null /* */
          ? this.matcher.lastIndex + (this[CurrentMatch][0].length === 0 && 1)
          : this.matcher.lastIndex)
      ? this[CurrentMatch]
      : undefined;
  }
}

/** @template {RegExp} T  @extends {MatcherState<T>} */
export class TokenizerState extends MatcherState {
  /** @param {Partial<TokenizerState<T>>} properties */
  constructor(properties) {
    super(properties)[Next] = this.getNextToken;
  }

  initialize() {
    super.initialize();
    this[TotalTokens] = 0;
  }

  finalize() {
    super.finalize();
  }

  getNextToken() {
    if (this.done || this.getNextMatch() == null) return;

    this[CurrentToken] = this[CreatedToken];
    this[CreatedToken] = this.createToken(this[CurrentMatch], this);

    if (this[CreatedToken] !== undefined) {
      this[CreatedToken].index = ++this[TotalTokens];
    }

    // Initial design considered holding on to one token
    //   that used to be set to state.nextToken along with
    //   the matching state.nextTokenContext.
    //
    // TODO: Replace graceful holding with construct stacking.
    return this[CurrentToken] || this.getNextToken();
  }

  get [Tokens]() {
    return Object.defineProperty(this, Tokens, {value: [], writable: false, configurable: true})[Tokens];
  }

  createToken(match, state) {}
}

TokenizerState.prototype.previousToken = TokenizerState.prototype.nextToken = /** @type {Token} */ (undefined);

TokenizerState.defaults = {source: undefined, initialize: undefined, finalize: undefined};
