import {TokenMatcher} from '../../lib/token-matcher.js';
import {HTMLGoal} from './html-definitions.js';

export const matcher = (HTMLGrammar =>
  TokenMatcher.define(
    // Matcher generator for this matcher instance
    entity =>
      TokenMatcher.join(
        entity(HTMLGrammar.Break()),
        entity(HTMLGrammar.Whitespace()),
        entity(HTMLGrammar.String()),
        entity(HTMLGrammar.Opener()),
        entity(HTMLGrammar.Closer()),
        entity(HTMLGrammar.Punctuator()),
        entity(HTMLGrammar.Fallthrough()),
      ),
    // RegExp flags for this matcher instance
    'gu',
    // Property descriptors for this matcher instance
    {goal: {value: HTMLGoal, enumerable: true, writable: false}},
  ))({
  Fallthrough: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \w+|.+?|.
        ${entity(TokenMatcher.fallthroughEntity)}
      )`,
    ),
  Break: ({lf = true, crlf = false} = {}) =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        ${TokenMatcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity(TokenMatcher.breakEntity)}
      )`,
    ),
  Whitespace: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \s+
        ${entity(TokenMatcher.whitespaceEntity)}
      )`,
    ),
  String: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        "|'
        ${entity(TokenMatcher.Quote)}
      )`,
    ),
  Opener: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        \[|<\?|<!--|<(?=/?[A-Za-z]+(?:[-A-Za-z0-9:]*|\\.)*)|<!(?:\[(?:[Cc][Dd][Aa][Tt][Aa])\[|(?=[A-Za-z]+\b))
        ${entity(TokenMatcher.Opener)}
      )`,
    ),
  Closer: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        -->|\?>|>|\]\]>|\]>|>|\]
        ${entity(TokenMatcher.Closer)}
      )`,
    ),
  Punctuator: () =>
    TokenMatcher.define(
      entity => TokenMatcher.sequence/* regexp */ `(
        =|\b:|\b-\b|/(?=>)
        ${entity((text, entity, match, state) => {
          match.format = 'punctuation';
          TokenMatcher.capture(
            state.context.goal.type ||
              (state.context.goal === HTMLGoal
                ? 'text'
                : state.context.goal.punctuators && state.context.goal.punctuators[text] === true
                ? (match.punctuator =
                    (state.context.goal.punctuation && state.context.goal.punctuation[text]) || 'punctuation')
                : 'fault'),
            match,
          );
        })}
      )`,
    ),
});
