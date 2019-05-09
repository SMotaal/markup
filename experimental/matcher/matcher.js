import {Parser} from '/markup/packages/tokenizer/lib/parser.js';
import {createTokenFromMatch, createMatcherInstance, createString} from './helpers.js';

export default //
/**
 * @param {import('/modules/matcher/matcher.js').Matcher} matcher
 * @param {any} [overrides]
 */
(matcher, overrides) => {
  const {freeze} = globalThis.Object;

  const matcherInstance = (matcher = freeze(createMatcherInstance(matcher)));
  const tokenizer = {
    createToken: createTokenFromMatch,
    /** @type {(state: {}) =>  void} */
    initializeState: undefined,
    /**
     * @param {string} sourceText @param {{sourceType?: string}} [initialState]
     */
    *tokenize(sourceText, initialState) {
      const {createToken, initializeState} = this;
      const string = (initialState.sourceText = createString(sourceText));
      const matcher = (initialState.matcher = createMatcherInstance(matcherInstance, initialState || {}));
      const {state} = matcher;
      initializeState && initializeState(state);
      let next;
      for (
        let match, token, index = 0;
        // TODO: Consider optimizations for RegExp.prototype.exec
        (match = matcher.exec(string));
        // We hold back one grace token
        (token = createToken(match, state)) &&
        ((token.index = index++),
        (state.lastToken = token),
        // (state[(match.capture.whitespace && 'lastWhitespaceToken') || 'lastTextToken'] = state[
        //   `last.${token.type || 'sequence'}`
        // ] = token),
        next && (yield next),
        (next = state.previousToken = token))
      );
      next && (yield next);
    },
  };
  const mode = {syntax: 'matcher', tokenizer};
  overrides &&
    ({
      syntax: mode.syntax = mode.syntax,
      createToken: tokenizer.createToken = tokenizer.createToken,
      initializeState: tokenizer.initializeState,
      ...overrides
    } = overrides);
  const parser = new Parser({mode, tokenizer, url: import.meta.url});

  freeze(tokenizer);

  return (
    /**
     * @param {import('/markup/packages/tokenizer/lib/api').API} markup
     */
    async markup => {
      // console.log({matcher, overrides, parser});
      markup.parsers.splice(0, markup.parsers.length, parser);
      return {...overrides};
    }
  );
};
