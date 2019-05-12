/** Creates a list from a Whitespace-separated string @type { (string) => string[] } */
export const List = RegExp.prototype[Symbol.split].bind(/\s+/g);

export const restack = (index, group, goal, state) => {
  const contexts = state.contexts;
  const context = contexts[index];
  state.nextContext =
    (context && context.group === group && context.goal === goal && context) ||
    (contexts[index] = {
      id: contexts.count++,
      depth: index,
      parent: contexts[index - 1],
      goal: goal || (group && group.goal) || state.context.goal,
      group,
      state,
    });
};

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
    context: {goal: initialGoal},
    groups,
  } = state;
  const group = initialGoal.groups[text];

  if (!group) return initialGoal.type || 'sequence';

  const index = groups.push(group) - 1;
  groups.closers.splice(index, groups.closers.length, group.closer);
  restack(index, group, group.goal || initialGoal, state);
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
    context: {goal: initialGoal, group: initialGroup},
    groups,
  } = state;
  const index = groups.closers.lastIndexOf(text);

  if (index === -1 || index !== groups.length - 1) return fault(text, state);

  groups.closers.splice(index, groups.closers.length);
  groups.splice(index, groups.length);
  restack(index - 1, groups[index - 1], initialGroup && initialGroup.parentGoal, state);
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
