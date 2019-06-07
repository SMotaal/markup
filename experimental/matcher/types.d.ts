// import {Matcher} from '/modules/matcher/matcher.js';

type identity = string | symbol;

type Matcher = import('/modules/matcher/matcher.js').Matcher;

type MatchArray = RegExpMatchArray | RegExpExecArray;
type MatchCapture = import('/modules/matcher/matcher.js').Matcher.Capture;
type MatchResult<T> = import('/modules/matcher/matcher.js').Matcher.MatchResult<T>;

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
}

// interface Tokenizer<T extends RegExp = RegExp, U extends {} = Object> {
//   createToken?<M extends MatchArray>()
// }

// /**
//  * @template {RegExp} T
//  * @template {{}} U
//  * @typedef {{createToken?<M extends MatchArray, T extends {}>(init: MatchResult<M>) => Token<T>, lastToken?: Token<U>, previousToken?: Token<U>}} Tokenizer
//  */
