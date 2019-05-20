export const Contexts = (() => {
  const stats = {
    /** Matches captured inside the context */
    directCaptureCount: 0,
    /** Contexted stacked into the context */
    directContextCount: 0,
    /** Tokens produced from the context */
    directTokenCount: 0,
    /** Matches captured inside any nested context */
    indirectCaptureCount: 0,
    /** Contexted stacked into any nested context */
    indirectContextCount: 0,
    /** Tokens produced from any nested context */
    indirectTokenCount: 0,
  };

  class Contexts {
    /**
     * @param {State} state
     * @param {Goal} rootGoal
     * @param {number} [length]
     */
    constructor(state, rootGoal, length = 20) {
      (this.state = state).contexts = this;

      initializeRange(
        /** @type {Context<stats>[]} */
        (this.stack = new Array(length >= 1 ? length : (length = 1))),
        (this.stackDepth = this.directContextCount = this.totalTokenCount = this.totalContextCount = this.totalCaptureCount = 0),
        (this.initialLength = this.stackLength = length),
      );

      // Permanently stacked root context
      stackContext(this, /** @type {Context<stats>} */ (this.rootContext = createContext(this, rootGoal)));
    }

    /**
     * @param {number} depth
     * @param {Goal} goal
     * @param {Group} [group]
     * @returns {Context<Stats & {goal: goal, group: group}>}
     */
    restack(depth, goal, group) {
      const stack = this.stack;
      const stackedContext = stack[depth];

      // TODO: Would trimStack(this, depth) ever apply here?

      if (stackedContext !== undefined) {
        if (stackedContext.goal === goal && stackedContext.group === group) {
          return stackContext(this, stackedContext);
        }
        destackContext(this, stackedContext);
      }

      return stackContext(this, createContext(this, goal, group, stack[depth - 1]));
    }
  }

  /** @type {<T extends Array>(array: T, start: number, end: number) => T} */
  const initializeRange = Function.call.bind([].fill, undefined);

  /**
   * @template {Contexts} C
   * @template {Context<stats>} T
   * @param {C} contexts
   * @param {T} context
   * @returns {T}
   */
  const stackContext = (contexts, context) => {
    const {rootContext: root, stack, stackDepth, stackLength} = contexts;
    const {contextId: id, contextDepth: depth, parentContext: parent} = context;
    const stackingParent = depth ? stack[depth - 1] : contexts;

    if (contexts.currentContext === context) return context;

    if (depth - stackDepth !== 1)
      throw new StackingError(
        `Invalid stacking operation — contextDepth ${depth} - stackDepth ${stackDepth} = ${depth - stackDepth} !== 1`,
      );

    if (typeof id !== 'string' || !id.length)
      throw new StackingError(`Invalid stacking operation — contextId "${id}" is not a valid string`);

    if (depth === 0) {
      if (context !== root && root !== undefined)
        throw new StackingError(
          `Invalid stacking operation — context (${id || '[unknown]'}) cannot replace the root context (${
            root.contextId
          })`,
        );
    } else if (depth > 0) {
      if (parent !== stackingParent)
        throw new StackingError(
          `Invalid stacking operation — parentContext (${id}) is different from the actual stacking parent (${
            stackingParent.contextId
          })`,
        );

      // Double the stack size when exceeded
      depth < stackLength || initializeRange(stack, stackLength, (contexts.stackLength = stack.length *= 2));
    } else {
      throw new StackingError(`Invalid stacking operation — contextDepth ${depth} is not >= 0`);
    }

    // Throws if stack is invalid
    stack[depth] === context || (stackingParent.directContextCount++, (stack[depth] = context));
    contexts.stackDepth = depth;
    return (contexts.currentContext = context);
  };

  /**
   * @template {Contexts} C
   * @template {Context<stats>} T
   * @param {C} contexts
   * @param {T} context
   * @returns {T['parentContext']}
   */
  const destackContext = (contexts, context) => {
    const {
      contextId,
      contextDepth,
      parentContext,

      directCaptureCount,
      directContextCount,
      directTokenCount,
      indirectCaptureCount,
      indirectContextCount,
      indirectTokenCount,
    } = context;

    if (contexts.stack[contextDepth].contextId !== contextId) {
      throw new StackingError(`Invalid destacking operation — context (${contextId || '[unknown]'}) is not in stack`);
    }
    // Consolidate statistics or Throw if orphaned (ie root/invalid)
    parentContext.indirectContextCount += indirectContextCount + directContextCount;
    parentContext.indirectTokenCount += indirectTokenCount + directTokenCount;
    parentContext.indirectCaptureCount += indirectCaptureCount + directCaptureCount;
    // Safely remove child
    contexts.stack[contextDepth] = undefined;
    // Safely update indices
    contexts.stackDepth = contextDepth - 1;
    contexts.indirectContextCount--;
    return (contexts.currentContext = parentContext);
  };

  /**
   * @template {Contexts} C
   * @template {Goal} T
   * @template {Group} U
   * @param {C} contexts
   * @param {T} goal
   * @param {U} group
   * @param {Context<stats>} [parentContext]
   * @returns {Context<stats>}
   */
  const createContext = (contexts, goal, group, parentContext) => ({
    // Logistics
    contextNumber: ++contexts.totalContextCount,
    contextId: `${(parent && `${parent.id}[${++parent.directContextCount}`) || ']'}${goal.name}${(group &&
      `‹${group.opener}›`) ||
      '‹top›'}]`,
    contextDepth: (parent && parent.depth + 1) || 1,
    parentContext,

    // Identities
    state: contexts.state,
    goal,
    group,

    // Statistics
    ...stats,
  });

  const StackingError = class StackingDepthError extends RangeError {};

  const trimStack = (contexts, depth) => {
    // Trim the top of the stack
    for (
      let i = contexts.stackDepth, child, parent;
      i - depth > 0;
      (child = stackContext[i--]) === undefined || destackContext(contexts, child)
    );
  };

  return Contexts;
})();

/** @typedef {{contexts: undefined | Contexts}} State */
/** @typedef {{name: string}} Goal */
/** @typedef {{opener: string}} Group */

/**
 * @template {{}} R
 * @typedef {{contextNumber: number, contextId: string, contextDepth: number, parentContext: Context<R> | undefined, state: State, goal?: Goal, group?: group} & R} Context
 */
