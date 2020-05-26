//@ts-check

interface Matcher extends import('./lib/matcher.js').Matcher, RegExp {}

type MatcherFlags = string;
type MatcherText = string;
type MatcherPattern = (string | RegExp) & Definition;
type MatcherEntityFactory = (entity: MatcherEntity | Matcher) => void;
type MatcherPatternFactory = (entity: MatcherEntityFactory) => MatcherPattern;

type MatcherMatch<T extends RegExpExecArray | RegExpMatchArray = RegExpExecArray | RegExpMatchArray> = T extends
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

type MatcherIdentityString = string & Trimmed & Suffixed<'?', false>;
type MatcherIdentityEntity = symbol | MatcherIdentityString;
type MatcherMetaEntity = string & Suffixed<'?'>;

type MatcherUnknownEntity = 'UNKNOWN?';
type MatcherNamedEntity = MatcherIdentityEntity | MatcherMetaEntity;

type MatcherStatefulOperator<T> = (text: string, capture: number, match: MatcherMatch, state) => void;
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

interface TokenMatcher extends Matcher {
  state: TokenMatcherState;
}

interface TokenMatcherCapture extends MatcherCapture {
  inset?: string;
}
interface TokenMatcherMatchRecord extends MatcherMatchRecord {
  flatten?: boolean;
  fault?: boolean;
  punctuator?: string;
  capture: TokenMatcherCapture;
}

type TokenMatcherMatch<T extends RegExpExecArray | RegExpMatchArray = RegExpExecArray | RegExpMatchArray> = T extends
  | RegExpExecArray
  | RegExpMatchArray
  ? TokenMatcherExecArray | TokenMatcherMatchArray
  : T extends RegExpMatchArray
  ? TokenMatcherMatchArray
  : TokenMatcherExecArray;

interface TokenMatcherExecArray extends RegExpExecArray, TokenMatcherMatchRecord {}
interface TokenMatcherMatchArray extends RegExpMatchArray, TokenMatcherMatchRecord {}

type MutableRecord<T extends {} = {}> = {
  [K in string]: K extends keyof T ? T[K] : any;
};

interface TokenMatcherGroup extends MutableRecord {
  opener: string;
  closer: string;
  goal: TokenMatcherGoal | symbol;
  parentGoal: TokenMatcherGoal | symbol;
  description: string;
  [Symbol.toStringTag]: string;
}

interface TokenMatcherGroups extends Array<TokenMatcherGroup> {
  root?: TokenMatcherGroup;
  closers?: string[];
}

interface TokenMatcherGoal extends MutableRecord {
  name: string;
  type: string;
  flatten: boolean;
  fold: boolean;
  punctuators: Record<string, boolean>;
  openers: Array<string> & Record<string, boolean>;
  closers: Array<string> & Record<string, boolean>;
  opener: string;
  closer: string;
  groups: TokenMatcherGroups;
  initializeContext: (context: Context) => void;
  tokens?: {[symbol: symbol]: MutableRecord<{symbol: symbol; text: string; type: string; goal: TokenMatcherGoal}>};
  spans?: null | {[name: string]: SpanRegExp};
}

interface TokenMatcherToken extends MutableRecord {
  hint?: string;
  capture?: MatchCapture;
  index?: number;

  text: string;
  type: string;
  punctuator: string;
  lineInset?: string;
  offset: number;
  lineOffset: number;
  lineBreaks: number;
  columnNumber: number;
  lineNumber: number;
  captureNumber: number;
  captureCount: number;
  tokenNumber: number;
  contextNumber: number;
  contextDepth: number;
  isWhitespace: boolean;
  isOperator: boolean;
  isDelimiter: boolean;
  isComment: boolean;

  // FIXME: Nondescript
  fault: boolean;
  fold: boolean;
  flatten: boolean;

  state?: TokenMatcherState;
  context?: TokenMatcherContext;
  goal?: TokenMatcherGoal;
  group?: TokenMatcherGroup;
}

interface TokenMatcherContext extends MutableRecord {
  id: string;
  number: number;
  depth: number;
  faults: number;
  intent: string;

  parentContext: Context;
  goal: TokenMatcherGoal;
  group: TokenMatcherGroup;
  state?: TokenMatcherState;

  lastAtom: TokenMatcherToken;
  precedingAtom: TokenMatcherToken;
  lastTrivia: TokenMatcherToken;
  precedingTrivia: TokenMatcherToken;
  lastToken: TokenMatcherToken;
  precedingToken: TokenMatcherToken;

}


interface TokenMatcherState extends MutableRecord {
  matcher: TokenMatcher;
  sourceText?: string;
  lastToken?: TokenMatcherToken;
  previousToken?: TokenMatcherToken;
  initializeContext?: <T extends {}, P extends {} = {}, C extends {} = {}>(context: T, properties?: P) => T & P & C;

  // TODO: See if we even need context at all!
  context: TokenMatcherContext;
  lastContext: TokenMatcherContext;
  nextContext: TokenMatcherContext;

  firstTokenContext: TokenMatcherContext;
  lastTokenContext: TokenMatcherContext;
  nextTokenContext: TokenMatcherContext;

  groups: TokenMatcherGroups;

  lastAtom?: TokenMatcherToken;
  lastTrivia?: TokenMatcherToken;
  lastToken?: TokenMatcherToken;
  nextToken?: TokenMatcherToken;
  lineIndex: number;
  lineOffset: number;
  nextOffset: number;
  totalCaptureCount: number;
  totalContextCount: number;
  totalTokenCount: number;

  flags: MutableRecord;

  options: MutableRecord<{console?: Console}>;

  error: string;
  nextFault?: boolean;
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
