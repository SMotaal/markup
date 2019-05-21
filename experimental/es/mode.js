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
    state.totalCaptureCount = state.totalTokenCount = 0;
    const contexts = (state.contexts = Array(100));
    const context = initializeContext({
      id: `«${matcher.goal.name}»`,
      number: (contexts.count = state.totalContextCount = 1),
      depth: 0,
      parentContext: undefined,
      goal: matcher.goal,
      group: undefined,
      state,
    });
    state.tokenContext = void (contexts[-1] = state.context = state.lastContext = context);
  },
  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },
  createToken: (match, state) => {
    let currentGoal,
      // goalName,
      currentGoalType,
      contextId,
      contextNumber,
      contextDepth,
      contextGroup,
      parentContext,
      tokenReference,
      nextToken,
      text,
      type,
      fault,
      punctuator,
      offset,
      lineInset,
      lineBreaks,
      isDelimiter,
      isComment,
      isWhitespace,
      flatten,
      fold,
      columnNumber,
      lineNumber,
      tokenNumber,
      captureNumber,
      hint;

    const {
      context: currentContext,
      nextContext,
      lineIndex,
      lineOffset,
      nextOffset,
      lastToken,
      lastTrivia,
      lastAtom,
    } = state;

    /* Capture */

    ({
      0: text,
      capture: {inset: lineInset},
      identity: type,
      flatten,
      fault,
      punctuator,
      index: offset,
    } = match);

    if (!text) return;

    // try {
    ({
      id: contextId,
      number: contextNumber,
      depth: contextDepth,
      goal: currentGoal,
      group: contextGroup,
      parentContext,
    } = state.tokenContext = currentContext);

    currentGoalType = currentGoal.type; // ({name: goalName, type: goalType} = currentGoal);

    nextOffset &&
      (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
      (state.matcher.lastIndex = nextOffset)));

    lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
    isComment = type === 'comment' || punctuator === 'comment';
    isDelimiter = type === 'closer' || type === 'opener';
    isWhitespace = !isDelimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

    type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

    if (lineBreaks) {
      state.lineIndex += lineBreaks;
      state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
    }

    /* Flattening / Token Folding */

    flatten === false || flatten === true || (flatten = !isDelimiter && currentGoal.flatten === true);

    captureNumber = ++currentContext.captureCount;
    state.totalCaptureCount++;

    if (
      (fold = flatten) && // fold only if flatten is allowed
      lastToken != null &&
      lastToken.contextNumber === contextNumber && // never fold across contexts
      lastToken.fold === true &&
      (lastToken.type === type || (currentGoal.fold === true && (lastToken.type = currentGoalType)))
    ) {
      lastToken.captureCount++;
      lastToken.text += text;
      lineBreaks && (lastToken.lineBreaks += lineBreaks);
    } else {
      /* Token Creation */
      flatten = false;
      columnNumber = 1 + (offset - lineOffset || 0);
      lineNumber = 1 + (lineIndex || 0);

      tokenNumber = ++currentContext.tokenCount;
      state.totalTokenCount++;

      hint = `${(isDelimiter ? type : currentGoalType && `in-${currentGoalType}`) ||
        ''}\n${contextId} #${tokenNumber}\n(${lineNumber}:${columnNumber})`;

      tokenReference = isWhitespace || isComment ? 'lastTrivia' : 'lastAtom';

      nextToken = currentContext[tokenReference] = state[
        tokenReference
      ] = currentContext.lastToken = state.lastToken = {
        text,
        type,
        offset,
        punctuator,
        hint,
        lineOffset,
        lineBreaks,
        lineInset,
        columnNumber,
        lineNumber,
        captureNumber,
        captureCount: 1,
        tokenNumber,
        contextNumber,
        contextDepth,

        isWhitespace, // whitespace:
        isDelimiter, // delimiter:
        isComment, // comment:

        // FIXME: Nondescript
        fault,
        fold,
        flatten,

        goal: currentGoal,
        group: contextGroup,
        state,
      };
    }
    /* Context */
    !nextContext ||
      ((state.nextContext = undefined), nextContext === currentContext) ||
      ((state.lastContext = currentContext),
      currentContext === nextContext.parentContext
        ? (state.totalContextCount++,
          (nextContext.precedingAtom = lastAtom),
          (nextContext.precedingTrivia = lastTrivia),
          (nextContext.precedingToken = lastToken))
        : ((parentContext.nestedContextCount += currentContext.nestedContextCount + currentContext.contextCount),
          (parentContext.nestedCaptureCount += currentContext.nestedCaptureCount + currentContext.captureCount),
          (parentContext.nestedTokenCount += currentContext.nestedTokenCount + currentContext.tokenCount)),
      (state.context = nextContext));

    return nextToken;
  },
});
