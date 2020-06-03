//@ts-check

import {TokenMatcher} from '../../lib/token-matcher.js';
import {HTMLGoal} from './html-definitions.js';

export const matcher = TokenMatcher.define(
  {
    Break: () =>
      TokenMatcher.define(entity => TokenMatcher.sequence/* regexp */ `(\r?\n${entity(TokenMatcher.breakEntity)})`),

    Whitespace: () =>
      TokenMatcher.define(entity => TokenMatcher.sequence/* regexp */ `(\s+${entity(TokenMatcher.whitespaceEntity)})`),

    String: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          "|'
          ${entity(TokenMatcher.quoteEntity)}
        )`,
      ),

    Opener: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          \[|<\?|<!--|<(?=/?[A-Za-z]+(?:[-A-Za-z0-9:]*|\\.)*)|<!(?:\[(?:[Cc][Dd][Aa][Tt][Aa])\[|(?=[A-Za-z]+\b))
          ${entity(TokenMatcher.openerEntity)}
        )`,
      ),

    Closer: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          -->|\?>|>|\]\]>|\]>|>|\]
          ${entity(TokenMatcher.closerEntity)}
        )`,
      ),

    Punctuator: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          =|\b:|\b-\b|/(?=>)|\\.
          ${entity((text, entity, match, state) => {
            match.format = 'punctuation';
            TokenMatcher.capture(
              state.context.goal.type ||
                (state.context.goal === HTMLGoal
                  ? ((match.flatten = true), 'text')
                  : state.context.goal.punctuation != null && state.context.goal.punctuation[text] === false
                  ? ((match.flatten = true),
                    (state.lastAtom && state.lastAtom.type) || state.context.goal.type || 'text')
                  : state.context.goal.punctuators != null && state.context.goal.punctuators[text] === true
                  ? (match.punctuator =
                      (state.context.goal.punctuation && state.context.goal.punctuation[text]) || 'punctuation')
                  : 'fault'),
              match,
            );
          })}
        )`,
      ),

    Fallthrough: () =>
      TokenMatcher.define(
        entity => TokenMatcher.sequence/* regexp */ `(
          \w+|.+?|.
          ${entity(TokenMatcher.fallthroughEntity)}
        )`,
      ),
  },
  // RegExp flags for this matcher instance
  'gu',
  // Property descriptors for this matcher instance
  {goal: {value: HTMLGoal, enumerable: true, writable: false}},
);
