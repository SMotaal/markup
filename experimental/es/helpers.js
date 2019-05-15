/** Creates a list from a Whitespace-separated string @type { (string) => string[] } */
export const List = RegExp.prototype[Symbol.split].bind(/\s+/g);

const stats = {
  captureCount: 0,
  contextCount: 0,
  tokenCount: 0,
  totalCaptures: 0,
  totalContexts: 0,
  totalTokens: 0,
};

/** @template {{}} T @param {T} context @returns {T & stats} */
export const initializeContext = context => Object.assign(context, stats);

export const capture = (identity, match, text) => {
  match.capture[(match.identity = identity)] = text || match[0];
  (match.fault = identity === 'fault') && (match.flatten = false);
  return match;
};

/**
 * Safely mutates matcher state to open a new context.
 *
 * @param {*} text - Text of the intended { type = "opener" } token
 * @param {*} state - Matcher state
 * @returns {undefined | string} - String when context is **not** open
 */
export const open = (text, state) => {
  // const {goal: initialGoal, groups} = state;
  const {
    contexts,
    context: parentContext,
    context: {depth: index, goal: initialGoal},
    groups,
  } = state;
  const group = initialGoal.groups[text];

  if (!group) return initialGoal.type || 'sequence';
  groups.splice(index, groups.length, group);
  groups.closers.splice(index, groups.closers.length, group.closer);

  parentContext.contextCount++;

  const goal = group.goal === undefined ? initialGoal : group.goal;

  state.nextContext = contexts[index] = initializeContext({
    id: `${parentContext.id}${goal !== initialGoal ? ` ‹${group.opener}›&#x000A;«${goal.name}»` : ` ‹${group.opener}›`}`,
    number: contexts.count++,
    depth: index + 1,
    parentContext,
    goal,
    group,
    state,
  });
};

/**
 * Safely mutates matcher state to close the current context.
 *
 * @param {*} text - Text of the intended { type = "closer" } token
 * @param {*} state - Matcher state
 * @returns {undefined | string} - String when context is **not** closed
 */
export const close = (text, state) => {
  // const {goal: initialGoal, group: initialGroup, groups} = state;
  const {
    contexts,
    context: {
      goal: initialGoal,
      group: initialGroup,
      parentContext,
      captureCount,
      contextCount,
      tokenCount,
      totalCaptures,
      totalContexts,
      totalTokens,
    },
    groups,
  } = state;
  const index = groups.closers.lastIndexOf(text);

  if (index === -1 || index !== groups.length - 1) return fault(text, state);

  parentContext.totalContexts += totalContexts + contextCount;
  parentContext.totalCaptures += totalCaptures + captureCount;
  parentContext.totalTokens += totalTokens + tokenCount;

  groups.closers.splice(index, groups.closers.length);
  groups.splice(index, groups.length);
  state.nextContext = parentContext;
};

export const forward = (search, match, state) => {
  search &&
    (typeof search === 'object'
      ? ((search.lastIndex = match.index + match[0].length), (state.nextOffset = match.input.search(search)))
      : (state.nextOffset = match.input.indexOf(search, match.index + match[0].length)));
};

/**
 * @returns {'fault'}
 */
export const fault = (text, state) => {
  console.warn(text, {...state});
  return 'fault';
};
