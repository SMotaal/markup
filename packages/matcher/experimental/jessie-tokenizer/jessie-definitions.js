//@ts-check
import {generateDefinitions, defineSymbol, Keywords} from '../common/helpers.js';

// TODO: Refactor from es-definitions and json-definitions

export const {JessieGoal, JessieStringGoal, JessieCommentGoal, JessieDefinitions} = (() => {
  const identities = {
    Keyword: 'Jessie.Keyword',
  };
  const goals = {};
  const symbols = {};

  // Jessie being closer to ECMAScript than JSON means it will
  //   require imperative matcher logic and so opt to minimize
  //   complexity by not creating separate JessieObjectGoal and
  //   JessieArrayGoal… etc. What we'll explore instead is how
  //   we can constructional argument the goal's imperative logic.
  //
  // TODO: Imperative means excluded matches NEVER "fault"
  const JessieGoal = (goals[(symbols.JessieGoal = defineSymbol('JessieGoal'))] = {
    type: undefined,
    flatten: undefined,
    fold: undefined,
    // keywords: Keywords({[identities.Keyword]: ['true', 'false', 'null']}),
    openers: ['{', '[', '"', "'", '//', '/*'],
    closers: ['}', ']'],
    punctuators: [':', ','],
  });

  const JessieStringGoal = (goals[(symbols.JessieStringGoal = defineSymbol('JessieStringGoal'))] = {
    // ...JessieGoal,
    type: 'quote',
    flatten: true,
    fold: true,
    keywords: [],
    openers: [],
    closers: [],
    punctuators: ['\\', '\\b', '\\b', '\\n', '\\r', '\\t', '\\u', '\\"', "\\'"],
  });

  // TODO: Add TemplateLiteral

  const JessieCommentGoal = (goals[(symbols.JessieCommentGoalSymbol = defineSymbol('JessieCommentGoal'))] = {
    type: 'comment',
    flatten: true,
    fold: true,
  });

  return {
    JessieGoal,
    JessieStringGoal,
    JessieCommentGoal,
    JessieDefinitions: generateDefinitions({
      symbols,
      identities,
      goals,
      groups: {
        ['{']: {opener: '{', closer: '}', goal: symbols.JessieGoal},
        ['[']: {opener: '[', closer: ']', goal: symbols.JessieGoal},
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
        ['//']: {
          opener: '//',
          closer: '\n',
          goal: symbols.JessieCommentGoalSymbol,
          parentGoal: symbols.JessieGoal,
          description: '‹comment›',
        },
        ['/*']: {
          opener: '/*',
          closer: '*/',
          goal: symbols.JessieCommentGoalSymbol,
          parentGoal: symbols.JessieGoal,
          description: '‹comment›',
        },
      },
    }),
  };
})();
