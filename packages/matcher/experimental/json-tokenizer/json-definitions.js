//@ts-check
import {generateDefinitions, defineSymbol, Keywords} from '../common/helpers.js';

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
    keywords: Keywords({[identities.Keyword]: ['true', 'false', 'null']}),
    openers: ['{', '[', '"'],
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
    ...JSONGoal,
    type: 'quote',
    flatten: true,
    fold: true,
    keywords: [],
    openers: [],
    closers: ['"'],
    punctuators: ['\\', '\\b', '\\b', '\\n', '\\r', '\\t', '\\u', '\\"'],
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
