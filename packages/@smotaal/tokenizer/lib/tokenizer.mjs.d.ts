/// Enumerated Types

export type GrouperKind = 'comment' | 'span' | 'quote' | 'closure';

export type AggregatorKind = 'assigner' | 'combinator';

export type PunctuatorKind = 'nonbreaker' | 'operator' | 'breaker' | GrouperKind;

/// Opaque Types
// declare global {
namespace Symbol {
  declare const syntax: unique symbol;
  declare const goal: unique symbol;

  declare const sequence: unique symbol;
  declare const grouper: unique symbol;

  declare const punctuator: unique symbol;
  declare const aggregator: unique symbol;
}
// }

export type opaque = unknown;
export type Opaque<T, U = {[name: symbol]: opaque}> = T & U;

export type Syntax<T = string> = Opaque<T, {[Symbol.syntax]: opaque}>;
export type Goal<T = string> = Syntax<T> | Opaque<T, {[Symbol.goal]: opaque}>;

export type Sequence<T = string> = Opaque<T, {[Symbol.sequence]: opaque}>;

export type Grouper<T = string, U = GrouperKind> = Opaque<Punctuator<T, U>, {[Symbol.grouper]: U}>;

export type Punctuator<T = string, U = PunctuatorKind> = Opaque<T, {[Symbol.punctuator]: U}>;

export type Aggregator<T = string, U = AggregatorKind> = Opaque<Punctuator<T, U>, {[Symbol.aggregator]: U}>;

/// Composite Types
export type Primitive = Closure | Sequence;
export type Primitives<P = Primitive> = P extends Closure
  ? Closures<[P['opener'], P['closer']]>
  : P extends Sequence
  ? Symbols<P>
  : Iterable<P>;

/// Abstract Types

export interface Token {
  // Primordial
  text: string;
  offset: number;
  type: 'top' | 'pre' | 'keyword' | 'punctuator' | 'whitespace' | 'identifier' | 'sequence' | 'text' | string;
  // Relational
  previous: Token | undefined;
  parent: Token | undefined;
  last: Token | undefined;
  // Contextual
  punctuator?: PunctuatorKind | AggregatorKind;
  hint: string;
}

export interface TokensArray extends Array<Token> {
  end?: number;
}

export interface TokenizableRange {
  syntax: Syntax;
  offset: number;
  index: number;
}

export type TokenizableResult = TokensArray | TokenizableRange;

export interface Symbols<S = string[]> extends Iterable<S> {
  includes<T>(symbol: T): boolean;
  get<T>(symbol: T): T extends S[number] ? Sequence<T> : undefined;
}

export interface Closure<C = [string, string]> {
  opener: Sequence<C[0]>;
  closer: Sequence<C[1]>;
}

export interface Closures<C = [string, string][]> extends Iterable<Closure<C[number]>> {}

export interface Spans {
  [name: Syntax]: Closures;
}

export interface Pattern extends Partial<RegExp> {
  test(sequence: string): boolean;
}

export interface Patterns {
  [name: string]: Pattern;
}

export interface Matcher extends Partial<RegExp> {
  exec(sequence: string): RegExpExecArray;
  lastIndex: number;
  global: true;
}

export interface Matchers {
  [name: string]: Matcher;
}

export interface Mode {
  syntax: Syntax;
  // Closures
  comments?: Closures;
  closures?: Closures;
  quotes?: Primitives;
  // Symbols
  keywords?: Symbols;
  assigners?: Symbols;
  combinators?: Symbols;
  nonbreakers?: Symbols;
  operators?: Symbols;
  breakers?: Symbols;
  // Maps
  spans?: Spans;
  patterns?: Patterns;
  matchers?: Matchers;
  // Expressions
  segmenter?: Matcher;
  matcher?: Matcher;
  context?: Context<this>;
}

export interface Punctuators {
  [name: Punctuator]: PunctuatorKind;
  aggregators?: Aggregators;
}

export interface Aggregators {
  [name: Aggregator]: AggregatorKind;
}

export interface Grouping<M extends Mode = Mode, G = Grouper> {
  // Contextual
  goal: Goal;
  hinter: string;
  punctuator?: Punctuator;
  closer?: Punctuator;
  opener?: Punctuator;

  // Syntactical
  // comments?: Closures;
  // closures?: Closures;
  spans?: Closures;
  quotes?: Primitives;
  matcher?: Matcher;
  open?(next: token, state: object, context: Context): TokenizableResult;
  close?(next: token, state: object, context: Context): TokenizableResult;

  // Volatile
  punctuators?: Punctuators;
}

export interface Context<M extends Mode = Mode, G = Grouper>
  extends Pick<Grouping<M, G>, 'goal' | 'punctuator' | 'closer' | 'spans' | 'quotes'> {
  mode: M;
  matcher: G['matcher'] extends Matcher ? G['matcher'] : M['matcher'] extends Matcher ? M['matcher'] : Matcher;
  punctuators: G['punctuators'] extends Punctuators ? G['punctuators'] : Punctuators;
  aggregators: this['punctuators']['aggregators'];
  forming: boolean;
  token: <T extends Partial<Token>>(token: T) => Token & T;
}

/// Concrete Types

export declare class Tokenizer<M extends Mode = Mode, D extends {}> {
  mode: M;
  defaults: D;

  constructor(mode: M, defaults: D);

  tokenize(source, state = {}): Tokenizer.Tokens;

  static contextualizer(tokenizer: Tokenizer): Tokenizer.Contexts<M>;

  static createGrouper<G = Grouper>(grouping: Partial<Grouping<M, G>>): Grouping<M, G>;
}

export declare namespace Tokenizer {
  export interface Contexts<M extends Mode> extends IterableIterator<Context<M>> {
    next<G = Grouper>(grouper: G): IteratorResult<Context<M, G>>;
  }

  export interface Tokens extends IterableIterator<Token> {
    next(): IteratorResult<Token>;
  }
}
////////////////////////////////////////////////////////////////////////////////
// export declare namespace Mode {
//   export type Closures = 'keywords' | 'assigners' | 'combinators' | 'nonbreakers' | 'operators' | 'breakers' | 'quotes';
//   export type Symbols = 'keywords' | 'assigners' | 'combinators' | 'nonbreakers' | 'operators' | 'breakers' | 'quotes';

// }
