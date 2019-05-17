import {matcher} from './matcher.js';
import {initializeContext} from './helpers.js';
import {createMatcherMode} from '../matcher/helpers.js';
import {countLineBreaks} from '../../packages/tokenizer/lib/core.js';

export const mode = createMatcherMode(matcher, {
  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],
  initializeState: state => {
    (state.groups = []).closers = [];
    state.lineOffset = state.lineIndex = 0;
    state.lineFault = false;
    const contexts = (state.contexts = Array(100));
    const context = initializeContext({
      id: `«${matcher.goal.name}»`,
      number: (contexts.count = 1),
      depth: 0,
      parent: undefined,
      goal: matcher.goal,
      group: undefined,
      state,
    });
    contexts[-1] = state.context = context;
  },
  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },
  createToken: (match, state) => {
    let currentGoal,
      goalName,
      goalType,
      contextId,
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
      tokenNumber,
      captureNumber,
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

    ({id: contextId, goal: currentGoal} = context);
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

    captureNumber = ++context.captureCount;

    if (
      (fold = flatten) && // fold only if flatten is allowed
      previousToken != null &&
      previousToken.context === context && // never fold across contexts
      previousToken.fold === true &&
      (previousToken.type === type || (currentGoal.fold === true && (previousToken.type = currentGoal.type)))
    ) {
      previousToken.text += text;
      breaks && (previousToken.breaks += breaks);
    } else {
      /* Token Creation */
      flatten = false;
      columnNumber = 1 + (offset - lineOffset || 0);
      lineNumber = 1 + (lineIndex || 0);
      tokenNumber = ++context.tokenCount;

      hint = `${(delimiter ? type : goalType && `in-${goalType}`) ||
        ''}&#x000A;${contextId} #${tokenNumber}&#x000A;(${lineNumber}:${columnNumber})`;

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

        captureNumber,
        tokenNumber,

        context,
        lineIndex,
        lineOffset,
      });
    }
  },
});
