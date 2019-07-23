// Internal types

interface Matcher extends import('./lib/matcher.js').Matcher {}

type MatcherFlags = string;
type MatcherText = string;
type MatcherPattern = (string | RegExp) & Definition;
type MatcherPatternFactory = (entity: MatcherEntityFactory) => MatcherPattern;

type MatcherMatch = MatcherExecArray | MatcherMatchArray;

interface MatcherExecArray extends RegExpExecArray, MatcherMatchRecord {}
interface MatcherMatchArray extends RegExpMatchArray, MatcherMatchRecord {}

interface MatcherMatchRecord {
  identity: MatcherIdentity;
  entity: number;
  capture: MatcherCapture;
  matcher: RegExp;
}

interface MatcherCapture {
  [identity: MatcherIdentity]: string;
}

type MatcherIdentity = string | symbol;

type MatcherOperator = <T>(text: string, capture: number, match: MatcherMatch, state?: T) => void;

type MatcherEntity = MatcherIdentity | MatcherOperator | undefined;

interface MatcherEntities extends Array<MatcherEntity> {
  flags?: string;
}

type MatcherIterator<T extends RegExp = Matcher> = IterableIterator<
  T extends Matcher ? MatcherMatchArray : RegExpMatchArray | RegExpExecArray
>;

// Tokenizing

interface TokenMatcher<U extends {} = Object> extends Matcher {
  state: TokenizerState<this, U>;
}

interface Token<T extends {} = Object> extends Partial<Object & T> {
  type: string;
  text: string;
  offset: number;
  breaks: number;
  inset?: text;
  hint?: string;
  capture?: MatchCapture;
}

interface TokenizerState<T extends RegExp, U extends {} = Object> {
  matcher: TokenMatcher<U>;
  sourceText?: string;
  lastToken?: Token<U>;
  previousToken?: Token<U>;
  initializeContext?: <T extends {}, P extends {} = {}, C extends {} = {}>(context: T, properties?: P) => T & P & C;
}

// Debugging

type MatcherDebugOptions = Partial<MatcherDebugOptions.ExternalOptions & MatcherDebugOptions.InternalDebugOptions>;

namespace MatcherDebugOptions {
  export type Colors<K extends string = string> = string[] & Partial<Record<K, string>>;

  export interface ExternalOptions {
    timing: boolean;
    warnings: boolean;
    method: 'log' | 'warn' | 'info' | 'render';
    colors: Colors;
  }

  export interface InternalDebugOptions extends ExternalDebugOptions {
    sourceText: string;
    matcher: Matcher;
    matches: MatcherMatch[];

    colors: Colors<this['uniqueTypes'][number]>;
    uniqueTypes: string[];
    logs: [ExternalOptions['method'], any[]];
  }
}
