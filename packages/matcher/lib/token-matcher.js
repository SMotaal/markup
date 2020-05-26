// @ts-check
/// <reference path="./types.d.ts" />

import {Matcher} from './matcher.js';
import {Tokenizer} from './tokenizer.js';

/** @typedef {Object} TokenMatcher.State */

/** @template  U */
class TokenMatcher extends Matcher {
  /**
   * Safely updates the match to reflect the captured identity.
   *
   * NOTE: fault always sets match.flatten to false
   *
   * @template T @param {string} identity @param {T} match @returns {T}
   */
  static capture(identity, match) {
    // @ts-ignore
    match.capture[(match.identity = identity)] = match[0];
    // @ts-ignore
    (match.fault = identity === 'fault') && (match.flatten = false);
    return match;
  }

  /**
   * Safely mutates matcher state to open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} opener - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** open
   */
  static open(opener, state) {
    const {
      context: parentContext,
      context: {
        depth: index,
        goal: initialGoal,
        goal: {
          groups: {[opener]: group},
        },
      },
    } = state;

    if (!group) return initialGoal.type || 'sequence';
    state.groups.splice(index, state.groups.length, group);
    state.groups.closers.splice(index, state.groups.closers.length, group.closer);

    parentContext.contextCount++;

    const goal = group.goal === undefined ? initialGoal : group.goal;
    const forward = state.currentMatch != null && goal.spans != null && goal.spans[opener] != null;

    if (forward) {
      if (
        this.forward(
          goal.spans[opener],
          state,
          // DONE: fix deltas for forwards expressions
          // typeof goal.spans[text] === 'string' ? undefined : false,
        ) === 'fault'
      )
        state.nextFault = true;
      // return 'fault';

      // if (goal.type) state.currentMatch.format = goal.type;
      // if (match[match.format] = state.nextContext.goal.type || 'comment')
    }

    const nextContext = {
      id: `${parentContext.id} ${
        goal !== initialGoal ? `\n${goal[Symbol.toStringTag]} ${group[Symbol.toStringTag]}` : group[Symbol.toStringTag]
      }`,
      number: ++state.contexts.count,
      depth: index + 1,
      faults: state.nextFault === true ? 1 : 0,
      parentContext,
      goal,
      group,
      state,
    };

    typeof state.initializeContext === 'function' && state.initializeContext(nextContext);

    state.nextContext = state.contexts[index] = nextContext;

    if (state.nextFault === true && !(state.nextOffset > state.currentMatch.index + state.currentMatch[0].length)) {
      state.nextFault = undefined;
      return 'fault';
    }

    if (!!state.currentMatch.format && !!state.nextContext.goal.type)
      state.currentMatch[state.currentMatch.format] = state.nextContext.goal.type;

    if (state.currentMatch.format === 'punctuator')
      state.currentMatch.punctuator =
        (state.context.goal.punctuation != null && state.context.goal.punctuation[opener]) ||
        state.nextContext.goal.type ||
        undefined;

    if (state.nextContext.goal.flatten === true && state.currentMatch.flatten !== false)
      state.currentMatch.flatten = true;
  }

  /**
   * Safely ensures matcher state can open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} opener - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {boolean}
   */
  static canOpen(opener, state) {
    // const upperCase = text.toUpperCase();
    return /** @type {boolean} */ (state.context.goal.openers != null &&
      state.context.goal.openers[opener] === true &&
      (state.context.goal.spans == null ||
        state.context.goal.spans[opener] == null ||
        // Check if conditional span faults
        this.lookAhead(state.context.goal.spans[opener], state)));
  }
  /**
   * Safely ensures matcher state can open a new context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} closer - Text of the intended { type = "opener" } token
   * @param {S} state - Matcher state
   * @returns {boolean}
   */
  static canClose(closer, state) {
    // const upperCase = text.toUpperCase();
    return /** @type {boolean} */ (state.context.group.closer === closer ||
      (state.context.goal.closers != null && state.context.goal.closers[closer] === true));
  }

  /**
   * Safely mutates matcher state to close the current context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} closer - Text of the intended { type = "closer" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** closed
   */
  static close(closer, state) {
    // const groups = state.groups;
    const index = state.groups.closers.lastIndexOf(closer);

    // if (index === -1 || index !== state.groups.length - 1) return 'fault';
    if (
      index === -1 ||
      !(state.groups.length - index === 1 || (state.context.faults > 0 && state.groups.length - index === 2))
    )
      return 'fault';

    state.groups.closers.splice(index, state.groups.closers.length);
    state.groups.splice(index, state.groups.length);
    state.nextContext = state.context.parentContext;

    if (!!state.currentMatch.format && !!state.context.goal.type)
      state.currentMatch[state.currentMatch.format] = state.context.goal.type;

    if (state.currentMatch.format === 'punctuator')
      state.currentMatch.punctuator =
        (state.context.goal.punctuation != null && state.context.goal.punctuation[closer]) ||
        state.context.goal.type ||
        undefined;

    if (state.context.goal.flatten === true && state.currentMatch.flatten !== false) state.currentMatch.flatten = true;
  }

  /**
   * Safely mutates matcher state to close the current context.
   *
   * @template {TokenMatcher.State} S
   * @param {string} delimiter - Text of the intended { type = "closer" | "opener" } token
   * @param {S} state - Matcher state
   * @returns {undefined | string} - String when context is **not** closed
   */
  static punctuate(delimiter, state) {
    if (TokenMatcher.canOpen(delimiter, state)) return TokenMatcher.open(delimiter, state) || 'opener';
    else if (TokenMatcher.canClose(delimiter, state)) return TokenMatcher.close(delimiter, state) || 'closer';
  }

  /**
   * Safely mutates matcher state to skip ahead.
   *
   * TODO: Finish implementing forward helper
   *
   * @template {TokenMatcher.State} S
   * @param {string | RegExp} search
   * @param {S} state - Matcher state
   */
  static lookAhead(search, state) {
    return this.forward(search, state, null);
  }
  /**
   * Safely mutates matcher state to skip ahead.
   *
   * TODO: Finish implementing forward helper
   *
   * @template {TokenMatcher.State} S
   * @param {string | RegExp} search
   * @param {S} state - Matcher state
   * @param {number | boolean | null} [delta]
   */
  static forward(search, state, delta) {
    if (typeof search === 'string' && search.length) {
      if (delta === null)
        return (
          state.currentMatch.input.slice(
            state.currentMatch.index + state.currentMatch[0].length,
            state.currentMatch.index + state.currentMatch[0].length + search.length,
          ) === search
        );
      state.nextOffset =
        state.currentMatch.input.indexOf(search, state.currentMatch.index + state.currentMatch[0].length) +
        (0 + /** @type {number} */ (delta) || 0);
    } else if (search != null && typeof search === 'object') {
      search.lastIndex = state.currentMatch.index + state.currentMatch[0].length;
      const matched = search.exec(state.currentMatch.input);
      // console.log(...matched, {matched});
      if (!matched || matched[1] !== undefined) {
        if (delta === null) return false;
        state.nextOffset = search.lastIndex;
        state.nextFault = true;
        return 'fault';
      } else {
        if (delta === null) return true;
        state.nextOffset = search.lastIndex + (0 + /** @type {number} */ (delta) || 0);
      }
    } else {
      throw new TypeError(`forward invoked with an invalid search argument`);
    }
  }

  /**
   * @param {Matcher & {goal?: object}} matcher
   * @param {any} [options]
   */
  static createMode(matcher, options) {
    const tokenizer = (({constructor, ...tokenizerPropertyDescriptors}) =>
      Object.defineProperties({matcher: Object.freeze(TokenMatcher.create(matcher))}, tokenizerPropertyDescriptors))(
      Object.getOwnPropertyDescriptors(Tokenizer.prototype),
    );

    const mode = {syntax: 'matcher', tokenizer};
    options &&
      ({
        syntax: mode.syntax = mode.syntax,
        aliases: mode.aliases,
        preregister: mode.preregister,
        createToken: tokenizer.createToken = tokenizer.createToken,
        ...mode.overrides
      } = options);

    matcher.goal &&
      ({initializeState: tokenizer.initializeState, finalizeState: tokenizer.finalizeState} = matcher.goal);

    Object.freeze(tokenizer);

    return mode;
  }
}

/** @type {import('../experimental/common/types').Goal|symbol} */
TokenMatcher.prototype.goal = undefined;

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
 * @param {T} [state]
 */
TokenMatcher.Opener = (text, capture, match, state) => {
  match.upperCase = text.toUpperCase();
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuators != null && state.context.goal.punctuators[match.upperCase] === true
      ? (match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[match.upperCase]) || 'combinator')
      : TokenMatcher.canOpen(match.upperCase, state)
      ? TokenMatcher.open(match.upperCase, state) ||
        ((match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[match.upperCase]) ||
          state.context.goal.type),
        'opener')
      : // If it is passive sequence we keep only on character
        (text.length === 1 || ((state.nextOffset = match.index + 1), (text = match[0] = text[0])),
        state.context.goal.type),
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, upperCase?: string, punctuator?: string}} match
 * @param {T} [state]
 */
TokenMatcher.Closer = (text, capture, match, state) => {
  match.upperCase = text.toUpperCase();
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuators != null && state.context.goal.punctuators[text] === true
      ? (match.punctuator = 'combinator')
      : TokenMatcher.canClose(match.upperCase, state)
      ? TokenMatcher.close(match.upperCase, state) ||
        ((match.punctuator =
          (state.context.goal.punctuation != null && state.context.goal.punctuation[text]) || state.context.goal.type),
        'closer')
      : state.context.goal.type,
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, punctuator?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.Quote = (text, capture, match, state) => {
  match.format = 'punctuator';
  TokenMatcher.capture(
    state.context.goal.punctuation[text] === 'quote' && TokenMatcher.canOpen(text, state)
      ? TokenMatcher.open(text, state) || 'opener'
      : state.context.goal.type === 'quote' && state.context.group.closer === text && TokenMatcher.canClose(text, state)
      ? TokenMatcher.close(text, state) || ((match.punctuator = state.context.goal.type || 'quote'), 'closer')
      : state.context.goal.type || 'quote',
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.whitespaceEntity = (text, capture, match, state) => {
  match.format = 'whitespace';
  TokenMatcher.capture(
    state.context.goal.type || state.lineOffset !== match.index
      ? ((match.flatten = state.context.goal.flatten !== false), 'whitespace')
      : ((match.flatten = false), 'inset'),
    match,
  );
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.breakEntity = (text, capture, match, state) => {
  match.format = 'whitespace';
  TokenMatcher.capture(
    (state.context.group != null && state.context.group.closer === '\n' && TokenMatcher.close(text, state)) ||
      // NOTE: ‹break› takes precedence over ‹closer›
      (state.context.goal.punctuation != null && state.context.goal.punctuation['\n']) ||
      'break',
    match,
  );
  match.flatten = false;
};

/**
 * @template {TokenMatcher.State} T
 * @param {string} text
 * @param {number} capture
 * @param {MatcherMatch & {format?: string, flatten?: boolean, fault?: boolean}} match
 * @param {T} [state]
 */
TokenMatcher.fallthroughEntity = (text, capture, match, state) => {
  TokenMatcher.capture(
    state.context.group.fallthrough !== 'fault' &&
      state.context.goal.fallthrough !== 'fault' &&
      (state.context.goal.span == null || TokenMatcher.forward(state.context.goal.span, state) !== 'fault')
      ? ((match.flatten = true), state.context.goal.type || 'text')
      : 'fault',
    match,
  );
  // match.identity === 'fault' && (match.flatten = false);
};

Object.freeze(TokenMatcher);

export {TokenMatcher};
