//@ts-check
import {generateDefinitions, Keywords} from '../common/helpers.js';

// TODO: Refactor from es-definitions and json-definitions

export const {JessieGoal, JessieStringGoal, JessieObjectGoal, JessieArrayGoal, JessieDefinitions} = (() => {
  const identities = {
    Keyword: 'Jessie.Keyword',
  };
  const goals = {};
  const symbols = {};

  const JessieGoal = (goals[(symbols.JessieGoal = Symbol('JessieGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    // keywords: Keywords({[identities.Keyword]: ['true', 'false', 'null']}),
    openers: ['{', '[', '"', "'"],
  });

  // TODO: Add "'"
  const JessieStringGoal = (goals[(symbols.JessieStringGoal = Symbol('JessieStringGoal'))] = {
    ...JessieGoal,
    type: 'quote',
    flatten: true,
    fold: true,
    keywords: [],
    openers: [],
    closers: [],
    punctuators: ['\\', '\\b', '\\b', '\\n', '\\r', '\\t', '\\u', '\\"', "\\'"],
  });

  // TODO: Add TemplateLiteral

  const JessieObjectGoal = (goals[(symbols.JessieObjectGoal = Symbol('JessieObjectGoal'))] = {
    ...JessieGoal,
    closers: ['}'],
    punctuators: [':', ','],
  });

  const JessieArrayGoal = (goals[(symbols.JessieArrayGoal = Symbol('JessieArrayGoal'))] = {
    ...JessieGoal,
    closers: [']'],
    punctuators: [','],
  });

  return {
    JessieGoal,
    JessieStringGoal,
    JessieObjectGoal,
    JessieArrayGoal,
    JessieDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}', goal: symbols.JessieObjectGoal},
        ['[']: {opener: '[', closer: ']', goal: symbols.JessieArrayGoal},
        // TODO: Define "'" and '`'
        ['"']: {
          opener: '"',
          closer: '"',
          goal: symbols.JessieStringGoal,
          parentGoal: symbols.JessieGoal,
          description: '‹string›',
        },
        ["'"]: {
          opener: "'",
          closer: "'",
          goal: symbols.JessieStringGoal,
          parentGoal: symbols.JessieGoal,
          description: '‹string›',
        },
      },
    }),
  };
})();
