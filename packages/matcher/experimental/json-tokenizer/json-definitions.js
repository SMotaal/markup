//@ts-check
import {generateDefinitions, Keywords} from '../common/helpers.js';

export const {JSONGoal, JSONStringGoal, JSONObjectGoal, JSONArrayGoal, JSONDefinitions} = (() => {
  const identities = {Keyword: 'JSON.Keyword'};
  const goals = {};
  const symbols = {};

  const JSONGoal = (goals[(symbols.JSONGoal = Symbol('JSONGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    keywords: Keywords({[identities.Keyword]: ['true', 'false', 'null']}),
    openers: ['{', '[', '"'],
  });

  const JSONStringGoal = (goals[(symbols.JSONStringGoal = Symbol('JSONStringGoal'))] = {
    ...JSONGoal,
    type: 'quote',
    flatten: true,
    fold: true,
    keywords: [],
    openers: [],
    closers: ['"'],
    punctuators: ['\\', '\\b', '\\b', '\\n', '\\r', '\\t', '\\u', '\\"'],
  });

  const JSONObjectGoal = (goals[(symbols.JSONObjectGoal = Symbol('JSONObjectGoal'))] = {
    ...JSONGoal,
    closers: ['}'],
    punctuators: [':', ','],
  });

  const JSONArrayGoal = (goals[(symbols.JSONArrayGoal = Symbol('JSONArrayGoal'))] = {
    ...JSONGoal,
    closers: [']'],
    punctuators: [','],
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
