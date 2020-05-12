//@ts-check
import {generateDefinitions, defineSymbol, Keywords} from '../common/helpers.js';
import {TokenMatcher} from '../../lib/token-matcher.js';
import {Ranges} from '../common/helpers.js';

export const {JSONGoal, JSONStringGoal, JSONObjectGoal, JSONArrayGoal, JSONDefinitions} = (() => {
  const identities = {Keyword: 'JSON.Keyword'};
  const goals = {};
  const symbols = {};

  // JSON being the well-defined declarative subset of ECMAScript
  //   grammar free from any statements means it can rely mostly
  //   on well-defined goals with little imperative logic. In fact
  //   it can technically be implemented without any logic, but
  //   that requires a lot of opinionated declarative mechanisms.
  //
  // TODO: Declarative means excluded matches ALWAYS "fault"
  const JSONGoal = (goals[(symbols.JSONGoal = defineSymbol('JSONGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    openers: ['{', '[', '"'],
    keywords: Keywords({[identities.Keyword]: ['true', 'false', 'null']}),
    punctuation: {'"': 'quote'},
    fallthrough: 'fault',
    ranges: Ranges({
      NullCharacter: range => range`\0`,
      DecimalDigit: range => range`0-9`,
      ControlCharacter: (range, {NullCharacter}) => range`${NullCharacter}-\x1f`,
      HexLetter: range => range`A-Fa-f`,
      HexDigit: (range, {DecimalDigit, HexLetter}) => range`${DecimalDigit}${HexLetter}`,
    }),
  });

  const JSONObjectGoal = (goals[(symbols.JSONObjectGoal = defineSymbol('JSONObjectGoal'))] = {
    ...JSONGoal,
    closers: ['}'],
    punctuators: [':', ','],
  });

  const JSONArrayGoal = (goals[(symbols.JSONArrayGoal = defineSymbol('JSONArrayGoal'))] = {
    ...JSONGoal,
    closers: [']'],
    punctuators: [','],
  });

  const JSONStringGoal = (goals[(symbols.JSONStringGoal = defineSymbol('JSONStringGoal'))] = {
    type: 'quote',
    flatten: true,
    fold: true,
    keywords: [],
    openers: [],
    closers: ['"'],
    punctuators: ['\\"', '\\\\', '\\/', '\\b', '\\n', '\\r', '\\t', '\\u'],
    punctuation: {},
    spans: {
      '"': new RegExp(
        //  SEE: https://tc39.es/ecma262/#table-json-single-character-escapes
        TokenMatcher.sequence/* regexp */ `
          (?:
            [^${JSONGoal.ranges.ControlCharacter}"\\\n]+?(?=\\[^]|")
            |\\["/\\bntr]
            |\\u[${JSONGoal.ranges.HexDigit}]{4}
            |\\[^]
          )*?(?="|(
            $
            |\n
            |\\$
            |\\u[${JSONGoal.ranges.HexDigit}]{0,3}[^${JSONGoal.ranges.HexDigit}]
            |\\[^"/\\bntru]
            |[${JSONGoal.ranges.ControlCharacter}"]
          ))`,
        'g',
      ),
    },
  });

  return {
    JSONGoal,
    JSONStringGoal,
    JSONObjectGoal,
    JSONArrayGoal,
    JSONDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}', goal: symbols.JSONObjectGoal},
        ['[']: {opener: '[', closer: ']', goal: symbols.JSONArrayGoal},
        ['"']: {
          opener: '"',
          closer: '"',
          goal: symbols.JSONStringGoal,
          parentGoal: symbols.JSONGoal,
          description: '‹string›',
        },
      },
    }),
  };
})();
