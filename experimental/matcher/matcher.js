import {Parser} from '/markup/packages/tokenizer/lib/parser.js';
import {createTokenFromMatch, createMatcherInstance, createString} from './helpers.js';

export default //
/**
 * @param {import('/modules/matcher/matcher.js').Matcher} matcher
 * @param {any} [overrides]
 */
(matcher, overrides) => {
  const {freeze} = globalThis.Object;

  matcher = freeze(createMatcherInstance(matcher));
  const tokenizer = {
    createToken: createTokenFromMatch,
    /** @type {(state: {}) =>  void} */
    initializeState: undefined,
    /**
     * @param {string} sourceText @param {{sourceType?: string}} [state]
     */
    *tokenize(sourceText, state) {
      const {createToken, initializeState} = this;
      const string = (state.sourceText = createString(sourceText));
      const matcherInstance = (state.matcher = createMatcherInstance(matcher, state || {}));
      const {state: matcherState} = matcherInstance;
      initializeState && initializeState(matcherState);
      let nextToken;
      for (
        let match, matchedToken;
        // TODO: Consider optimizations for RegExp.prototype.exec
        (match = matcherInstance.exec(string));
        // We hold back one grace token
        matchedToken = createToken(match, matcherState),
          nextToken && (yield nextToken),
          nextToken = matcherState.previousToken = matchedToken
      );
      nextToken && (yield nextToken);
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
