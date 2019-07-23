//@ts-check

import {matcher} from './matcher.js';
import {initializeState, finalizeState} from '../es/helpers.js';
import {createMatcherMode} from '../../packages/matcher/lib/token-matcher.js';
import {countLineBreaks} from '../../packages/tokenizer/lib/core.js';

export const mode = createMatcherMode(matcher, {
  syntax: 'json',
  aliases: ['json'],

  initializeState,
  finalizeState,

  createToken:
    /** @param {Match} match @param {State} state */
    (match, state) => {
      let currentGoal,
        // goalName,
        currentGoalType,
        contextId,
        contextNumber,
        contextDepth,
        contextGroup,
        parentContext,
        tokenReference,
        tokenContext,
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

      ({
        id: contextId,
        number: contextNumber,
        depth: contextDepth,
        goal: currentGoal,
        group: contextGroup,
        parentContext,
      } = tokenContext = (type === 'opener' && nextContext) || currentContext);

      currentGoalType = currentGoal.type;

      nextOffset &&
        (state.nextOffset = void (nextOffset > offset && (text = match.input.slice(offset, nextOffset)),
        (state.matcher.lastIndex = nextOffset)));

      lineBreaks = (text === '\n' && 1) || countLineBreaks(text);
      isDelimiter = type === 'closer' || type === 'opener';
      isWhitespace = !isDelimiter && (type === 'whitespace' || type === 'break' || type === 'inset');

      (isComment = type === 'comment' || punctuator === 'comment')
        ? (type = 'comment')
        : type || (type = (!isDelimiter && !fault && currentGoalType) || 'text');

      if (lineBreaks) {
        state.lineIndex += lineBreaks;
        state.lineOffset = offset + (text === '\n' ? 1 : text.lastIndexOf('\n'));
      }

      /* Flattening / Token Folding */

      flatten === false || flatten === true || (flatten = !isDelimiter && currentGoal.flatten === true);

      captureNumber = ++tokenContext.captureCount;
      state.totalCaptureCount++;

      if (
        (fold = flatten) && // fold only if flatten is allowed
        lastToken != null &&
        ((lastToken.contextNumber === contextNumber && lastToken.fold === true) ||
          (type === 'closer' && flatten === true)) && // never fold across contexts
        (lastToken.type === type || (currentGoal.fold === true && (lastToken.type = currentGoalType)))
      ) {
        lastToken.captureCount++;
        lastToken.text += text;
        lineBreaks && (lastToken.lineBreaks += lineBreaks);
      } else {
        // The generator retains this new as state.nextToken
        //   which means tokenContext is state.nextTokenContext
        //   and the fact that we are returning a token here will
        //   yield the current state.nextToken so we need to also
        //   set state.lastTokenContext to match
        //
        //   TODO: Add parity tests for tokenizer's token/context states
        state.lastTokenContext = state.nextTokenContext;
        state.nextTokenContext = tokenContext;

        /* Token Creation */
        flatten = false;
        columnNumber = 1 + (offset - lineOffset || 0);
        lineNumber = 1 + (lineIndex || 0);

        tokenNumber = ++tokenContext.tokenCount;
        state.totalTokenCount++;

        // hint = `${(isDelimiter ? type : currentGoalType && `in-${currentGoalType}`) ||
        hint = `${
          isDelimiter ? type : currentGoalType ? `in-${currentGoalType}` : ''
        }\n\n${contextId} #${tokenNumber}\n(${lineNumber}:${columnNumber})`;

        tokenReference = isWhitespace || isComment ? 'lastTrivia' : 'lastAtom';

        nextToken = tokenContext[tokenReference] = state[tokenReference] = tokenContext.lastToken = state.lastToken = {
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

/** @typedef {import('../es/types').Match} Match */
/** @typedef {import('../es/types').Groups} Groups */
/** @typedef {import('../es/types').Contexts} Contexts */
/** @typedef {import('../es/types').State} State */
