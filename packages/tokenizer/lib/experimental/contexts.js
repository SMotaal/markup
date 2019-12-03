import {Contextualizer} from './contextualizer.js';

/** Private context state handler for token generator instances */
export class Contexts {
  /** @param {Tokenizer} tokenizer */
  constructor(tokenizer) {
    ({
      syntax: this.syntax,
      syntax: this.goal,
      syntax: (this.hints = new Hints()).top,
      [Definitions]: this.definitions = (this.contextualizer.mode[Definitions] = {}),
    } = (this.contextualizer =
      // TODO: Undo if concurrent parsing shows side-effects
      tokenizer.contextualizer || (tokenizer.contextualizer = new Contextualizer(tokenizer))).mode);
    (this.stack = [(this.root = this.contextualizer.prime(null))]).hints = [(this.hint = this.hints.toString())];
  }

  /**
   * @param {Token} nextToken
   * @param {TokenizerState} state
   * @param {TokenizerContext} context
   */
  close(nextToken, state, context) {
    const childContext = context;
    let after, parentToken;
    const {stack, hints, syntax, contextualizer} = this;

    const childIndex = stack.length - 1;
    const childDefinitions = childIndex && stack[childIndex];

    // TODO: Handle childContext.closer !== childDefinitions.closer
    if (childDefinitions) {
      const {hinter, punctuator} = childDefinitions;
      stack.pop();
      stack.includes(childDefinitions) || hints.delete(hinter);
      (punctuator === 'opener' && (nextToken.punctuator = 'closer')) ||
        (punctuator && (nextToken.punctuator = punctuator));
      nextToken.type = 'punctuator';
      after = childDefinitions.close && childDefinitions.close(nextToken, state, childContext);
    }

    const parentIndex = stack.length - 1;
    const parentDefinitions = stack[parentIndex];
    const parentHint = stack.hints[parentIndex];

    // TODO: Verify coherent goal, context, and hints
    (parentDefinitions &&
      (this.hint = parentHint) &&
      (context = contextualizer.prime(parentDefinitions)) &&
      (this.goal = context.goal || syntax)) ||
      ((this.goal = (context = contextualizer.prime(null)).goal || syntax) && (this.hint = stack.hints[0] || syntax));
    parentToken = (nextToken.parent && nextToken.parent.parent) || undefined;

    return {context, after, parentToken};
  }

  /**
   * @param {Token} nextToken
   * @param {TokenizerState} state
   * @param {TokenizerContext} context
   */
  open(nextToken, state, context) {
    let childDefinitions, parentToken, after;
    let {punctuator, text} = nextToken;
    const parentContext = context;
    const {definitions, stack, hints, hint, syntax, contextualizer} = this;
    const hinter = punctuator ? `${syntax}-${punctuator}` : hint;
    const contextID = `${hinter},${text}`;
    const definedDefinitions = definitions[contextID];
    const {
      mode: {matchers, comments, spans, closures},
    } = parentContext;

    if (punctuator === 'span' && parentContext.spans) {
      const span = parentContext.spans.get(text);
      punctuator = nextToken.punctuator = 'span';
      childDefinitions =
        definedDefinitions ||
        contextualizer.normalize({
          syntax,
          goal: syntax,
          span,
          matcher: span.matcher || (matchers && matchers.span) || undefined,
          spans: (spans && spans[text]) || undefined,
          hinter,
          punctuator,
          punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
        });
    } else if (parentContext.punctuator !== 'quote') {
      if (punctuator === 'quote') {
        childDefinitions =
          definedDefinitions ||
          contextualizer.normalize({
            syntax,
            goal: punctuator,
            quote: text,
            matcher: (matchers && matchers.quote) || undefined,
            spans: (spans && spans[text]) || undefined,
            hinter,
            punctuator,
            punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
          });
      } else if (punctuator === 'comment') {
        const comment = comments.get(text);
        childDefinitions =
          definedDefinitions ||
          contextualizer.normalize({
            syntax,
            goal: punctuator,
            comment,
            matcher: comment.matcher || (matchers && matchers.comment) || undefined,
            hinter,
            punctuator,
            punctuation: (definedDefinitions && definedDefinitions.punctuation) || {},
          });
      } else if (punctuator === 'closure') {
        const closure = (definedDefinitions && definedDefinitions.closure) || closures.get(text);
        punctuator = nextToken.punctuator = 'opener';
        closure &&
          (childDefinitions =
            definedDefinitions ||
            contextualizer.normalize({
              syntax,
              goal: syntax,
              closure,
              matcher: closure.matcher || (matchers && matchers.closure) || undefined,
              hinter,
              punctuator,
              punctuation: (definedDefinitions && definedDefinitions.punctuation) || {
                ...((closure && closure.punctuation) || undefined),
              },
            }));
      }
    }

    if (childDefinitions) {
      (contextID && definitions[contextID]) || (definitions[contextID] = childDefinitions);
      const childIndex = stack.push(childDefinitions) - 1;
      hints.add(hinter);
      this.goal = (childDefinitions && childDefinitions.goal) || syntax;
      this.hint = stack.hints[childIndex] = `${hints.toString()} in-${this.goal}`;
      parentToken = nextToken;
      context = contextualizer.prime(childDefinitions);
      nextToken.type = 'punctuator';
      after = childDefinitions.open && childDefinitions.open(nextToken, state, context);
    }

    return {context, after, parentToken};
  }
}

Object.freeze(Object.freeze(Contexts.prototype).constructor);

const Definitions = Symbol('[definitions]');

const Hints = Object.freeze(
  Object.defineProperties(
    class Hints extends Set {
      toString() {
        return `${(this.root && ` ${this.root}`) || ''}${(this.top && ` ${this.top}`) || ''}${(this.size &&
          ` ${this.join(' ')}`) ||
          ''}`.trim();
      }
    }.prototype,
    {join: Object.getOwnPropertyDescriptor(Array.prototype, 'join')},
  ),
).constructor;

/** @typedef {import('./types').Contextualizer} Contextualizer */
/** @typedef {import('./types').Token} Token */
/** @typedef {import('./types').Tokenizer} Tokenizer */
/** @typedef {import('./types').TokenizerState} TokenizerState */
/** @typedef {import('./types').TokenizerContext} TokenizerContext */
