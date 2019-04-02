import {Contextualizer} from './contextualizer.js';

/** Contextual state of a token generator */
export class Contexts {
  /** @param {Tokenizer} tokenizer */
  constructor(tokenizer) {
    /** @type {Contextualizer}  */
    const contextualizer = tokenizer.contextualizer || (tokenizer.contextualizer = new Contextualizer(tokenizer));
    const {syntax, [Definitions]: definitions = (contextualizer.mode[Definitions] = {})} = contextualizer.mode;
    this.contextualizer = contextualizer;
    const hints = (this.hints = new Hints());
    hints.top = this.goal = this.syntax = syntax;
    this.goal = this.syntax = syntax;
    this.stack = [(this.root = contextualizer.prime())];
    this.stack.hints = [(this.hint = `${hints.toString()}`)];
    this.definitions = definitions;
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

    childDefinitions &&
      // TODO: childContext.closer !== childDefinitions.closer
      (stack.pop(),
      stack.includes(childDefinitions) || hints.delete(childDefinitions.hinter),
      (childDefinitions.punctuator === 'opener' && (nextToken.punctuator = 'closer')) ||
        (childDefinitions.punctuator && (nextToken.punctuator = childDefinitions.punctuator)),
      (nextToken.type = 'punctuator'),
      (after = childDefinitions.close && childDefinitions.close(nextToken, state, childContext)),
      (parentToken = (nextToken.parent && nextToken.parent.parent) || undefined));

    const parentIndex = stack.length - 1;
    const parentDefinitions = stack[parentIndex];
    const parentHint = stack.hints[parentIndex];

    context = contextualizer.prime(parentDefinitions);
    this.goal = (parentDefinitions && parentDefinitions.goal) || syntax;
    this.hint = parentHint || stack.hints[0];

    return {context, after, parentToken};
  }

  /**
   * @param {Token} nextToken
   * @param {TokenizerState} state
   * @param {TokenizerContext} context
   */
  open(nextToken, state, context) {
    const parentContext = context;
    let childDefinitions, parentToken, after;

    const {definitions, stack, hints, hint, syntax, contextualizer} = this;
    const {punctuator, text} = nextToken;
    const hinter = punctuator ? `${syntax}-${punctuator}` : hint;
    const contextID = `${hinter},${text}`;
    const existingDefinitions = definitions[contextID];
    const {matchers, comments, spans, closures} = parentContext.mode;

    if (punctuator === 'span' && parentContext.spans) {
      const span = parentContext.spans.get(text);

      const punctuator = (nextToken.punctuator = 'span');
      childDefinitions =
        existingDefinitions ||
        contextualizer.define({
          syntax,
          goal: syntax,
          span,
          matcher: span.matcher || (matchers && matchers.span) || undefined,
          spans: (spans && spans[text]) || undefined,
          hinter,
          punctuator,
        });
    } else if (parentContext.punctuator !== 'quote') {
      let comment, closure;
      switch (punctuator) {
        case 'quote':
          childDefinitions =
            existingDefinitions ||
            contextualizer.define({
              syntax,
              goal: punctuator,
              quote: text,
              matcher: (matchers && matchers.quote) || undefined,
              spans: (spans && spans[text]) || undefined,
              hinter,
              punctuator,
            });
          break;
        case 'comment':
          comment = comments.get(text);
          childDefinitions =
            existingDefinitions ||
            contextualizer.define({
              syntax,
              goal: punctuator,
              comment,
              matcher: comment.matcher || (matchers && matchers.comment) || undefined,
              hinter,
              punctuator,
            });
          break;
        case 'closure':
          (closure = (existingDefinitions && existingDefinitions.closure) || closures.get(text)) &&
            (childDefinitions =
              existingDefinitions ||
              contextualizer.define({
                syntax,
                goal: syntax,
                closure,
                matcher: closure.matcher || (matchers && matchers.closure) || undefined,
                hinter,
                punctuator: (nextToken.punctuator = 'opener'),
              }));
          break;
      }
    }

    childDefinitions &&
      (definitions[contextID] || (definitions[contextID] = childDefinitions),
      (nextToken.type = 'punctuator'),
      (parentToken = nextToken),
      (context = contextualizer.prime(childDefinitions)),
      (this.hint = stack.hints[stack.push(childDefinitions) - 1] = `${hints.add(hinter)} in-${(this.goal =
        (childDefinitions && childDefinitions.goal) || syntax)}`),
      (after = childDefinitions.open && childDefinitions.open(nextToken, state, context)));

    return {context, after, parentToken};
  }
}

Object.freeze(Object.freeze(Contexts.prototype).constructor);

/** Serializable Word Set */
const Definitions = Symbol('[definitions]');

/** Serializable Word Set */
const Hints = class Hints extends Set {
  toString() {
    return `${this.root || ''} ${this.top || 'markup'} ${(this.size && ` ${this.join(' ')}`) || ''}`.trim();
  }
}

Object.freeze(
  Object.defineProperties(Object.freeze(Hints).prototype, {
    join: Object.getOwnPropertyDescriptor(Array.prototype, 'join'),
  }),
);

/** @typedef {import('./types').Contextualizer} Contextualizer */
/** @typedef {import('./types').Token} Token */
/** @typedef {import('./types').Tokenizer} Tokenizer */
/** @typedef {import('./types').TokenizerState} TokenizerState */
/** @typedef {import('./types').TokenizerContext} TokenizerContext */
