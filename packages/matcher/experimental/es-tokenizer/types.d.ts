//@ts-check

import {Construct} from './helpers';

export interface MutableState {
  [name: string]: unknown;
}

export interface Match extends RegExpExecArray {
  entity: number;
  identity: string;
  capture: Capture;
  flatten: boolean;
  fault: boolean;
  punctuator: string;
}

export interface Capture {
  [name: string]: string;
}

export interface Group {
  opener: string;
  closer: string;
  goal: Goal | symbol;
  parentGoal: Goal | symbol;
  description: string;
  construct: string;
  [Symbol.toStringTag]: string;
}

export interface Groups extends Array<Group> {
  closers?: string[];
}

export interface Goal {
  name: string;
  type: string;
  flatten: boolean;
  fold: boolean;
  punctuators: Punctuators;
  openers: delimiters;
  closers: delimiters;
  opener: string;
  closer: string;
  groups: Group[];
  initializeContext: (context: Context) => void;
  tokens?: {[symbol: symbol]: MutableState & {symbol: symbol; text: string; type: string; goal: Goal}};
}

export interface Context extends ContextStats, Partial<MutableState> {
  id: string;
  number: number;
  depth: number;
  intent: string;

  parentContext: Context;
  goal: Goal;
  group: Group;
  state: State;

  lastAtom: Token;
  precedingAtom: Token;
  lastTrivia: Token;
  precedingTrivia: Token;
  lastToken: Token;
  precedingToken: Token;

  currentConstruct?: Construct;
  parentConstruct?: Construct;
  openingConstruct?: Construct;
}

export type ContextStats = import('./helpers').ContextStats;

export interface Contexts extends Array<Context> {
  '-1'?: context;
  count?: number;
}

export interface State extends MutableState {
  matcher: RegExp & {goal: Goal};
  sourceText: string;
  contexts: Contexts;

  // TODO: See if we even need context at all!
  context: Context;
  lastContext: Context;
  nextContext: Context;

  firstTokenContext: Context;
  lastTokenContext: Context;
  nextTokenContext: Context;

  groups: Groups;

  lastAtom: Token;
  lastTrivia: Token;
  lastToken: Token;
  nextToken: Token;
  lineIndex: number;
  lineOffset: number;
  nextOffset: number;
  totalCaptureCount: number;
  totalContextCount: number;
  totalTokenCount: number;

  flags: {[name: string]: unknown};

  options: {
    console?: Console;
  };

  error: string;

  // /**
  //  * Safely mutates matcher state to close the current context.
  //  *
  //  * @param text Text of the intended { type = "closer" } token
  //  * @returns String when context is **not** closed
  //  */
  // close(text: string): string | undefined;
  // /**
  //  * Safely mutates matcher state to open a new context.
  //  *
  //  * @param text Text of the intended { type = "opener" } token
  //  * @returns String when context is **not** open
  //  */
  // open(text: string): string | undefined;

  // /**
  //  * Safely mutates matcher state when entity capture is fault.
  //  *
  //  * @param text Text of the intended { type = "closer" } token
  //  * @returns Always returns "fault"
  //  */
  // fault(text): 'fault';

  // /**
  //  * Safely mutates matcher state to skip ahead following capture.
  //  */
  // forward(search: string | RegExp, match: Match, delta?: number): void;

  // /**
  //  * Updates match relative to the specified identity.
  //  */
  // capture<T extends Match, U extends string>(
  //   identity: U,
  //   match: T,
  // ): T & {[identity: U]: T[0]; flatten: U extends 'fault' ? false : T['flatten']};
}

export interface Token {
  text: string;
  type: string;
  punctuator: string;
  hint: string;
  lineInset: string;
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
  isDelimiter: boolean;
  isComment: boolean;
  // FIXME: Nondescript
  fault: boolean;
  fold: boolean;
  flatten: boolean;
  goal: Goal;
  group: Group;
  state: State;
  context?: Context;
  construct?: string;
}

// declare global {
//   namespace symbol {
//     interface KnownSymbol<K extends string> {
//       readonly ['description']?: K;
//     }
//     // type known<K extends string> = unique symbol & KnownSymbol<K>;
//     type known<K extends string = string> = symbol & KnownSymbol<K>
//   }

//   interface SymbolConstructor {
//     <K extends string>(key: K): symbol.known<K>;
//   }

//   interface Symbol {
//     description: string;
//   }
// }

// /** @typedef {import('./types').Match} Match */
// /** @typedef {import('./types').Capture} Capture */
// /** @typedef {import('./types').Group} Group */
// /** @typedef {import('./types').Groups} Groups */
// /** @typedef {import('./types').Goal} Goal */
// /** @typedef {import('./types').Context} Context */
// /** @typedef {import('./types').Contexts} Contexts */
// /** @typedef {import('./types').State} State */
// /** @typedef {import('./types').Token} Token */
