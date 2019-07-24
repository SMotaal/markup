//@ts-check
import {generateDefinitions, Keywords} from '../common/helpers.js';

const FaultGoalSymbol = Symbol('FaultGoal');
const JSONGoalSymbol = Symbol('JSONGoal');
const JSONStringGoalSymbol = Symbol('JSONStringGoal');

const goals = {};

goals[FaultGoalSymbol] = {type: 'fault'}; // , groups: {}

goals[JSONGoalSymbol] = {
  type: undefined,
  flatten: undefined,
  fold: undefined,
  openers: ['{', '[', '"'],
  closers: ['}', ']'],
};

goals[JSONStringGoalSymbol] = {type: 'quote', flatten: true, fold: true};

const {[FaultGoalSymbol]: FaultGoal, [JSONGoalSymbol]: JSONGoal, [JSONStringGoalSymbol]: JSONStringGoal} = goals;

const groups = {
  ['{']: {opener: '{', closer: '}'},
  ['[']: {opener: '[', closer: ']'},
  ['"']: {
    opener: '"',
    closer: '"',
    goal: JSONStringGoalSymbol,
    parentGoal: JSONGoalSymbol,
    description: '‹string›',
  },
};

const identities = {Keyword: 'JSONKeyword'};

/** @type {JSONGoal.Keywords} @see http://json.org/ */
// @ts-ignore
const keywords = Keywords({[identities.Keyword]: ['true', 'false', 'null']});

const symbols = {
  JSONGoal: JSONGoalSymbol,
  FaultGoal: FaultGoalSymbol,
  JSONStringGoal: JSONStringGoalSymbol,
};

/** Unique token records @type {{[symbol: symbol]: }} */
const tokens = {};

generateDefinitions({groups, goals, identities, symbols, keywords, tokens});

export {identities, goals, groups, symbols, keywords, FaultGoal, JSONGoal, JSONStringGoal};

/** @typedef {Record<'true'|'false'|'null', symbol>} JSONGoal.Keywords */
