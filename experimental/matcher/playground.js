import {createMatcherMode} from '../../packages/matcher/lib/tokenizer.js';
import {Matcher} from '../../packages/matcher/matcher.js';

export default async markup => {
  const parser = markup.parsers[0];
  const mode = createMatcherMode(
    Matcher.define(
      entity => Matcher.sequence`
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
