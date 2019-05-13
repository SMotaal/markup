import bootstrap from '../matcher/matcher.js';
import {countLineBreaks} from '../matcher/helpers.js';
import {matcher} from './matcher.js';
import {FaultGoal, goals, symbols} from './definitions.js';

const {goal: rootGoal} = matcher;
const {name: rootGoalName} = rootGoal;
const {
  [symbols.ECMAScriptGoal]: ECMAScriptGoal,
  [symbols.CommentGoal]: CommentGoal,
  [symbols.RegExpGoal]: RegExpGoal,
  [symbols.StringGoal]: StringGoal,
  [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
} = goals;

export default bootstrap(matcher, {
  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],
  initializeState: state => {
    (state.groups = []).closers = [];
    state.lineOffset = state.lineIndex = 0;
    state.lineFault = false;
    (state.contexts = Array(100))[-1] = state.context = {
      id: (state.contexts.count = 1),
      depth: 0,
      parent: undefined,
      goal: rootGoal,
      group: undefined,
      state,
    };
  },
  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
    // delete parser.mappings.ecmascript;
    // delete parser.mappings.es;
  },
  createToken: (match, state) => {
    let currentGoal,
      goalName,
      goalType,
      text,
      type,
      fault,
      punctuator,
      offset,
      inset,
      breaks,
      delimiter,
      comment,
      whitespace,
      flatten,
      fold,
      columnNumber,
      lineNumber,
      hint;

    const {context, nextContext, lineIndex, lineOffset, nextOffset, previousToken} = state;

    /* Capture */

    ({
      0: text,
      capture: {inset},
      identity: type,
      flatten,
      fault,
      punctuator,
      index: offset,
    } = match);

    if (!text) return;

    /* Context */

    nextContext && (state.nextContext = void (nextContext !== context && (state.context = nextContext)));

    ({goal: currentGoal} = context);
    ({name: goalName, type: goalType} = currentGoal);

    nextOffset &&
      (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
      (state.matcher.lastIndex = nextOffset)));

    breaks = (text === '\n' && 1) || countLineBreaks(text);
    comment = type === 'comment' || punctuator === 'comment';
    delimiter = type === 'closer' || type === 'opener';
    whitespace = !delimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

    type || (type = (!delimiter && !fault && goalType) || 'text');

    if (breaks) {
      state.lineIndex += breaks;
      state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
    }

    /* Flattening / Token Folding */

    flatten === false || flatten === true || (flatten = !delimiter && currentGoal.flatten === true);

    if (
      (fold = flatten) && // fold only if flatten is allowed
      previousToken != null &&
      previousToken.context === context && // never fold across contexts
      previousToken.fold === true &&
      // (previousToken.type === type ||
      //   ((currentGoal === StringGoal || currentGoal === CommentGoal) && (previousToken.type = currentGoal.type)))
      (previousToken.type === type || (currentGoal.fold === true && (previousToken.type = currentGoal.type)))
    ) {
      previousToken.text += text;
      breaks && (previousToken.breaks += breaks);
    } else {
      /* Token Creation */
      columnNumber = 1 + (offset - lineOffset || 0);
      lineNumber = 1 + (lineIndex || 0);
      hint = `${(delimiter ? type : goalType && `in-${goalType}`) || ''} [${goalName ||
        rootGoalName}:${lineNumber}:${columnNumber}]`;
      // fold || nextGoal !== StringGoal || nextGoal !== CommentGoal || (fold = true);
      flatten = false;
      return (state.previousToken = state[whitespace || comment ? 'previousTrivia' : 'previousAtom'] = {
        type,
        text,
        offset,
        breaks,
        inset,
        columnNumber,
        lineNumber,
        punctuator,
        fault,
        fold,
        flatten,
        delimiter,
        whitespace,
        comment,
        hint,

        context,
        lineIndex,
        lineOffset,
      });
    }
  },
  sourceURL: './matcher.js',
  sourceType: 'es',
});
