//@ts-check

import {Construct} from './helpers';
import {TokenMatcher} from '../../lib/token-matcher';

export interface SpanRegExp extends RegExp {}

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

export interface Group extends TokenMatcher.Group {
  construct: string;
}

export interface Groups extends TokenMatcher.Groups {}

export interface Goal extends TokenMatcher.Goal {}

export interface Contexts extends Array<Context> {
  '-1'?: context;
  count?: number;
}

export interface State extends TokenMatcher.State {}

export interface Token extends TokenMatcher.Token {
  construct?: string;
}

export interface Context extends TokenMatcher.Context, ContextStats {
  currentConstruct?: Construct;
  parentConstruct?: Construct;
  openingConstruct?: Construct;
}

export type ContextStats = import('./helpers').ContextStats;
