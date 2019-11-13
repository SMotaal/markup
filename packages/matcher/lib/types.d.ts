// Internal types

interface Matcher extends import('./lib/matcher.js').Matcher, RegExp {}

type MatcherFlags = string;
type MatcherText = string;
type MatcherPattern = (string | RegExp) & Definition;
type MatcherPatternFactory = (entity: MatcherEntityFactory) => MatcherPattern;

type MatcherMatch<T extends MatcherArray = RegExpExecArray | RegExpMatchArray> = T extends
  | RegExpExecArray
  | RegExpMatchArray
  ? MatcherExecArray | MatcherMatchArray
  : T extends RegExpMatchArray
  ? MatcherMatchArray
  : MatcherExecArray;

type MatcherArray = RegExpExecArray | RegExpMatchArray;

interface MatcherExecArray extends RegExpExecArray, MatcherMatchRecord {}
interface MatcherMatchArray extends RegExpMatchArray, MatcherMatchRecord {}

interface MatcherMatchRecord {
  identity: MatcherIdentityEntity | Matcher;
  entity: number;
  capture: MatcherCapture;
  matcher: RegExp;
  meta?: string;
}

interface MatcherCapture {
  [name: MatcherNamedEntity]: string;
}

interface Trimmed extends String {
  trim(): this;
}
interface Suffixed<T extends string, V extends boolean = false> {
  endsWith(suffix: T): V;
}

type MatcherIdentityEntity = symbol | (string & Trimmed & Suffixed<'?', false>);
type MatcherMetaEntity = string & Suffixed<'?'>;

type MatcherUnknownEntity = 'UNKNOWN?';
type MatcherNamedEntity = MatcherIdentityEntity | MatcherMetaEntity;

type MatcherOperator = <T>(text: string, capture: number, match: MatcherMatch, state?: T) => void;

type MatcherEntity = MatcherNamedEntity | MatcherOperator | undefined;

interface MatcherEntitySet<T extends MatcherEntity = MatcherEntity> extends Set<T> {
  has<U>(entity: U): U extends T ? boolean : false;
}

interface MatcherEntities extends Array<MatcherEntity> {
  flags?: string;
  meta?: MatcherEntitySet<MatcherMetaEntity>;
  identities?: MatcherEntitySet<MatcherIdentityEntity>;
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
  hint?: string;
  capture?: MatchCapture;
  index: number;
  lineOffset: number;
  lineBreaks: number;
  lineInset?: text;
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
