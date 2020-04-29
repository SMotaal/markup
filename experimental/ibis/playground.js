import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';
import {
  createToken,
  generateDefinitions,
  defineSymbol,
  initializeState,
  finalizeState,
} from '../../packages/matcher/experimental/common/helpers.js';

export const {IBISGoal, IBISStatementGoal, IBISCommentGoal, IBISDefinitions} = (() => {
  const identities = {};
  const goals = {};
  const symbols = {};
  const spans = {
    //    This faults when match[1] === ''
    //    It forwards until ‹\n›
    LineSpan: /.*?(?=\n|($))/g,
  };

  const IBISGoal = (goals[(symbols.IBISGoalSymbol = defineSymbol('IBISGoal'))] = {
    type: undefined,
    // flatten: false,
    // fold: true,
    openers: ['?', '?!', '?~', ':', ':+', ':-', ':~+', '+', '-', '!', '#'],
    closers: [],
    // punctuators: [],
  });

  const IBISStatementGoal = (goals[(symbols.IBISStatementGoalSymbol = defineSymbol('IBISStatementGoal'))] = {
    // type: 'literal',
    // flatten: false,
    // fold: true,
    openers: [],
    closers: [],
    spans: {
      ['?']: spans.LineSpan,
      ['?!']: spans.LineSpan,
      ['?~']: spans.LineSpan,
      [':']: spans.LineSpan,
      [':+']: spans.LineSpan,
      [':-']: spans.LineSpan,
      [':~+']: spans.LineSpan,
      ['+']: spans.LineSpan,
      ['-']: spans.LineSpan,
      ['!']: spans.LineSpan,
    },
  });

  const IBISCommentGoal = (goals[(symbols.IBISCommentGoalSymbol = defineSymbol('IBISCommentGoal'))] = {
    type: 'comment',
    // flatten: false,
    // fold: true,
    openers: [],
    closers: [],
    spans: {['#']: spans.LineSpan},
  });

  const {IBISGoalSymbol, IBISStatementGoalSymbol, IBISCommentGoalSymbol} = symbols;
  const IBISGroup = {closer: '\n', parentGoal: IBISGoalSymbol};

  return {
    IBISGoal,
    IBISStatementGoal,
    IBISCommentGoal,
    IBISDefinitions: generateDefinitions({
      identities,
      symbols,
      goals,
      groups: {
        ['?']: {opener: '?', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹suggested issue›'},
        ['?!']: {opener: '?!', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹resolved issue›'},
        ['?~']: {opener: '?!', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹pending issue›'},
        [':']: {opener: ':', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹position›'},
        [':+']: {opener: ':+', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹accepted position›'},
        [':~+']: {opener: ':~+', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹pending position›'},
        [':-']: {opener: ':-', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹rejected position›'},
        ['+']: {opener: '+', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹pro argument›'},
        ['-']: {opener: '-', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹con argument›'},
        ['!']: {opener: '!', ...IBISGroup, goal: IBISStatementGoalSymbol, description: '‹todo›'},
        ['#']: {opener: '#', ...IBISGroup, goal: IBISCommentGoalSymbol, description: '‹comment›'},
      },
    }),
  };
})();

/**
 * @param {import('/markup/packages/tokenizer/lib/api').API} markup
 */
export default ((
  sourceURL = `${new URL('./example', import.meta.url)}`,
  sourceType = 'ibis',
  resolveSourceType = (defaultType, {sourceType, resourceType, options, ...rest}) => {
    // console.log({options, sourceType, resourceType});
    // if (!sourceType && resourceType === 'javascript') return 'es';
    if (!sourceType && (resourceType === 'ibis' || resourceType === 'octet')) return 'ibis';
    return defaultType;
  },
) => async markup => {
  const IBISMode = TokenMatcher.createMode(
    TokenMatcher.define(
      entity => TokenMatcher.sequence`
        (
          \n
          ${entity((text, entity, match, state) => {
            match.format = 'whitespace';
            state.lineOffset = match.index + text.length;
            TokenMatcher.capture(
              (state.context.group != null && state.context.group.closer === '\n' && TokenMatcher.close(text, state)) ||
                // NOTE: ‹break› takes precedence over ‹closer›
                'break',
              match,
            );
          })}
        )|(
          \s+
          ${entity((text, entity, match, state) => {
            match.format = 'whitespace';
            TokenMatcher.capture(state.lineOffset !== match.index ? 'whitespace' : 'inset', match);
          })}
        )|(
          (?:\?[!~]?|:-|:~?\+?|[-+!#])(?=\s)
          ${entity((text, entity, match, state) => {
            match.format = 'punctuator';
            TokenMatcher.capture(
              // (state.lastToken == null || state.lastToken.type === 'inset' || state.lastToken.type === 'break') &&
              state.context.goal && state.context.goal.openers && state.context.goal.openers[text]
                ? TokenMatcher.open(text, state) ||
                    (state.nextContext &&
                      state.nextContext.goal &&
                      ((match.flatten = false), // state.nextContext.goal.flatten),
                      // (match.punctuator = 'combinator'),
                      state.nextContext.goal.spans != null &&
                        state.nextContext.goal.spans[text] != null &&
                        TokenMatcher.forward(state.nextContext.goal.spans[text], state)),
                    // // (match[match.format] = state.nextContext.goal.type || 'sequence'),
                    // console.log({match, ...state})),
                    //
                    'opener')
                : state.context.goal.type || 'sequence',
              match,
            );
            // TokenMatcher.capture(
            //   state.lastToken == null || state.lastToken.type === 'inset' ? 'combinator' : 'sequence',
            //   match,
            // );
          })}
        )|(
          \S+
          ${entity((text, entity, match, state) => {
            // match.format = 'punctuator';
            TokenMatcher.capture(
              (console.log({text, ...state}),
              state.context != null &&
                state.context.goal != null &&
                state.context.goal.spans != null &&
                state.context.goal.spans[text] != null &&
                ((match.punctuator = 'combinator'),
                (match.flatten = state.context.goal.flatten),
                TokenMatcher.forward(state.context.goal.spans[text], state) || state.context.goal.type)) ||
                'sequence',
              // state.context != null && state.context.goal != null && state.context.goal.type) ||
              // (state.lastToken != null && state.lastToken.type === 'combinator' && 'string') ||
              // 'sequence',
              match,
            );
          })}
        )
      `,
      // RegExp flags for this matcher instance
      'g',
      // Property descriptors for this matcher instance
      {
        goal: {value: IBISGoal, enumerable: true, writable: false},
      },
    ),
    {
      syntax: 'ibis',
      initializeState,
      finalizeState,
      createToken: (match, state) => {
        const token = createToken(match, state);
        token.flatten = false;
        // if (match.punctuator) token.punctuator = match.punctuator;
        return token;
      },
    },
  );

  markup.parsers[0].register(IBISMode);
  return {sourceURL, sourceType, resolveSourceType};
})();

// import {mode as JSONMode} from '../../packages/matcher/experimental/json-tokenizer/json-mode.js';
// import {mode as IBISMode} from '../es/es-mode.js';

// IBISMode.USE_CONSTRUCTS = true;

// https://raw.githubusercontent.com/wiki/smotaal/specs/Test-Fixture-Design-Issue.md

// punctuation: {
//   '?': 'combinator',
//   ':': 'combinator',
//   ':+': 'combinator',
//   ':-': 'combinator',
//   ':~+': 'combinator',
//   '+': 'combinator',
//   '-': 'combinator',
//   '!': 'combinator',
//   '#': 'combinator',
// },

// const dumpExample = async () => console.log('example: %O', await (await fetch('./example')).text());
