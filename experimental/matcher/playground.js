import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

export default async markup => {
  const parser = markup.parsers[0];
  const mode = TokenMatcher.createMode(
    TokenMatcher.define(
      entity => TokenMatcher.sequence`
        (
          \S+
          ${entity('text')}
        )|(
          \n
          ${entity((text, entity, match, state) => {
            state.lineOffset = match.index + text.length;
            match.capture[(match.identity = 'break')] = text;
          })}
        )|(
          \s+
          ${entity((text, entity, match, state) => {
            match.capture[(match.identity = state.lineOffset !== match.index ? 'whitespace' : 'inset')] = text;
          })}
        )
      `,
      'g',
    ),
  );
  console.log(parser, mode);
  parser.register(mode);
  return {...mode.overrides};
};
