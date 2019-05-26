//@ts-check

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
  groups: Group[];
}

export interface Context extends ContextStats {
  id: string;
  number: number;
  depth: number;

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
}

export type ContextStats = import('./helpers').ContextStats;

export interface Contexts extends Array<Context> {
  '-1'?: context;
  count?: number;
}

export interface State {
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
}

// /** @typedef {import('./types').Match} Match */
// /** @typedef {import('./types').Capture} Capture */
// /** @typedef {import('./types').Group} Group */
// /** @typedef {import('./types').Groups} Groups */
// /** @typedef {import('./types').Goal} Goal */
// /** @typedef {import('./types').Context} Context */
// /** @typedef {import('./types').Contexts} Contexts */
// /** @typedef {import('./types').State} State */
// /** @typedef {import('./types').Token} Token */
