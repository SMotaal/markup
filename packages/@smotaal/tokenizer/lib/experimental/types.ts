export {Tokenizer} from './tokenizer';
export {Contextualizer} from './contextualizer';
export {TokenSynthesizer} from './synthesizer';
export {Contexts} from './contexts';

export interface TokenizableSet<T = SymbolDefinition | ClosureDefinition> {
  get(token: string): T;
  includes(token: string): boolean;
}

export type SymbolDefinition = string;
export interface SymbolSet extends TokenizableSet<SymbolDefinition> {
  ['(symbols)']?: string;
}

export type ClosureDefinition = string | {opener: string; closer: string};
export interface ClosureSet extends TokenizableSet<ClosureDefinition> {
  ['(closures)']?: string;
}

export interface TokenValidator {
  test(token: string): boolean;
  global?: false;
  sticky?: false;
}

export interface TokenMatcher<T = RegExpExecArray> {
  exec(source: string): T;
  lastIndex: number | null;
  global?: true;
  sticky?: false;
}

export type TokanizableSpecies =
  | 'comments'
  | 'quotes'
  | 'closures'
  | 'spans'
  | 'assigners'
  | 'combinators'
  | 'nonbreakers'
  | 'operators'
  | 'breakers'
  | 'keywords';

export type ScannableType = 'text' | 'whitespace' | 'sequence' | 'pre';

export type PunctuatorType =
  | 'opener'
  | 'closer'
  | 'comment'
  | 'quote'
  | 'closure'
  | 'span'
  | 'assigner'
  | 'combinator'
  | 'nonbreaker'
  | 'operator'
  | 'breaker';

export type LexicalType = 'keyword' | 'identifier' | 'punctuator';

export type ContextualType = ScannableType | PunctuatorType | LexicalType;

export type TokenType<T extends string = ContextualType> = T;

export interface TokenizableMappings<T> extends Record<TokanizableSpecies, T> {}

export interface TokenizableDefinitions extends Partial<TokenizableMappings<TokenizableSet>> {
  syntax: string;
  matcher?: TokenMatcher;
  matchers?: Partial<TokenizableMappings<TokenMatcher>>;
  patterns?: {
    maybeIdentifier?: TokenValidator;
    maybeKeyword?: TokenValidator;
    segments: {[name: string]: TokenValidator};
  };
}

export interface Token<T extends string = TokenType> {
  type: T;
  hint?: string;
  previous?: Token;
  parent?: Token;
  next?: Token;
  last?: Token;
}

export interface TokenizerState {}

// type LexicalContext = 'quote' | 'comment' | 'closure' | 'span';

// export interface LexicalDefinition {

//   syntax: string;
//   goal?: string;
//   matcher?: RegExp;
//   punctuator?: string;
//   closer?: string;
//   punctuators?: SymbolList;
//   aggregators?: SymbolList;
//   spans?: SymbolList;
//   quotes?: SymbolList;
//   forming?: boolean;

//   quote: ClosureDefinition;
//   comment?: ClosureDefinition;
//   closure?: ClosureDefinition;
//   span?: ClosureDefinition;
//   context?: this['quote'] | this['closure'] | this['span'] | this['comment'];
//   opener?: string;
//   closer?: string;
//   hinter: string;
//   open = (context && context.open) || undefined,
//   close = (context && context.close) || undefined,
// }

// export interface TokenizerContext {
//   mode: LexicalGrammar;
//   syntax: string;
//   goal?: string;
//   matcher?: RegExp;
//   punctuator?: string;
//   closer?: string;
//   punctuators?: SymbolList;
//   aggregators?: SymbolList;
//   spans?: SymbolList;
//   quotes?: SymbolList;
//   forming?: boolean;
// }
