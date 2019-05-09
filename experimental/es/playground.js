import bootstrap from '../matcher/matcher.js';
import {countLineBreaks} from '../matcher/helpers.js';
import {matcher} from './matcher.js';
import {FaultGoal} from './definitions.js';

const {goal: rootGoal} = matcher;
const {name: rootGoalName} = rootGoal;

export default bootstrap(matcher, {
  syntax: 'es',
  initializeState: state => {
    (state.groups = []).closers = [];
    state.lineOffset = state.lineIndex = 0;
    state.lineFault = false;
    state.goal = state.nextGoal = rootGoal;
    state.group = state.nextGroup = undefined;
  },
  createToken: (match, state) => {
    // if (!match.text) return;

    const {
      goal: currentGoal,
      group: currentGroup,
      lineIndex: currentLineIndex,
      lineOffset: currentLineOffset = (state.lineOffset = 0),
      previousToken,
      nextGoal,
      nextGroup,
    } = state;

    const {
      0: text,
      identity,
      flatten,
      fault,
      punctuator,
      index,
      capture: {inset},
    } = match;

    const breaks = (identity === 'break' && 1) || countLineBreaks(text);
    const delimiter = identity === 'closer' || identity === 'opener';
    const whitespace = !delimiter && (identity === 'whitespace' || identity === 'break' || identity === 'inset');

    nextGoal === currentGoal || (state.goal = state.nextGoal = nextGoal || FaultGoal);
    nextGroup === currentGroup || (state.group = state.nextGroup = nextGroup);

    if (breaks) {
      state.lineIndex += breaks;
      state.lineOffset = index + text.lastIndexOf('\n');
    }

    if (flatten && !fault && currentGoal !== rootGoal && previousToken && previousToken.type === identity) {
      previousToken.text += text;
      breaks && (previousToken.breaks += breaks);
      return;
    }

    const {name: goalName, type: goalType} = currentGoal || rootGoal;
    const columnNumber = index - (currentLineOffset || -1);
    const lineNumber = currentLineIndex + 1;
    const token = {
      type: (!delimiter && goalType) || identity || 'text',
      text,
      offset: index,
      breaks,
      inset: inset || '',
      columnNumber,
      lineNumber,
      punctuator,
      flatten,
      // flatten: false,
      delimiter,
      whitespace,
      goal: goalName || rootGoalName,
      hint: `${(delimiter ? identity : goalType && `in-${goalType}`) || ''} [${goalName ||
        rootGoalName}:${lineNumber}:${columnNumber}]`,
    };

    currentGoal !== rootGoal || whitespace || (state.previousAtom = token);

    return token;
  },
  sourceURL: './matcher.js',
});
