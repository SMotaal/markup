const join = Function.call.bind(Array.prototype.join);

/** @typedef {import('./tokenizer').Tokenizer} Tokenizer */
/** @typedef {import('./contextualizer').Contextualizer} Contextualizer */
/** @typedef {import('./types').Token} Token */
/** @typedef {Contexts} Grouper */
/** @typedef {{[name: string]: Contexts}} States */

class Hints extends Set {
  toString() {
    return `${(this.root && ` ${this.root}`) || ''}${(this.top && ` ${this.top}`) || ''}${(this.size &&
      ` ${join(this, ' ')}`) ||
      ''}`.trim();
  }
}

export class Contexts {
  constructor(contextualizer) {
    const {syntax, [Definitions]: definitions = (contextualizer.mode[Definitions] = {})} = contextualizer.mode;
    this.contextualizer = contextualizer;
    const hints = (this.hints = new Hints());
    hints.top = this.goal = this.syntax = syntax;
    this.stack = [(this.root = contextualizer.prime())];
    this.stack.hints = [(this.hint = `${hints.toString()}`)];
    this.definitions = definitions;
    // console.log(this, {syntax, definitions, hints});
  }

  /**
   * @param {Token} nextToken
   * @param {Token} parent
   * @param context
   */
  close(nextToken, state, context) {
    const childContext = context;
    let after, parentToken;
    const {stack, hints, syntax, contextualizer} = this;

    const childIndex = stack.length - 1;
    const childDefinitions = childIndex && stack[childIndex];

    // if (childDefinitions && childContext.closer !== childDefinitions.closer) debugger;

    if (childDefinitions) {
      stack.pop();

      const {hinter, punctuator} = childDefinitions;

      // console.log({hinter, punctuator, close});

      // TODO: Handle mismatch contexts.close()
      stack.includes(childDefinitions) || hints.delete(hinter);

      (punctuator === 'opener' && (nextToken.punctuator = 'closer')) ||
        (punctuator && (nextToken.punctuator = punctuator));

      nextToken.type = 'punctuator';

      after = childDefinitions.close && childDefinitions.close(nextToken, state, childContext);
    }

    const parentIndex = stack.length - 1;
    const parentDefinitions = stack[parentIndex];
    const parentHint = stack.hints[parentIndex];
    context = contextualizer.prime(parentDefinitions);

    // console.log({childContext, childIndex, childDefinitions}, {parentContext: context, parentIndex, parentDefinitions});

    this.goal = (parentDefinitions && parentDefinitions.goal) || syntax;
    // this.grouper = parentContext;
    this.hint = parentHint || stack.hints[0];
    parentToken = (nextToken.parent && nextToken.parent.parent) || undefined;

    return {context, after, parentToken}; // closed,
  }

  open(nextToken, state, context) {
    const parentContext = context;
    let childDefinitions, parentToken, after;

    const {definitions, stack, hints, hint, syntax, contextualizer} = this;
    let {punctuator, text} = nextToken;
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
      if (punctuator === 'quote') {
        childDefinitions =
          definedDefinitions ||
          contextualizer.define({
            syntax,
            goal: punctuator,
            quote: text,
            matcher: (matchers && matchers.quote) || undefined,
            spans: (spans && spans[text]) || undefined,
            hinter,
            punctuator,
          });
      } else if (punctuator === 'comment') {
        const comment = comments.get(text);
        childDefinitions =
          definedDefinitions ||
          contextualizer.define({
            syntax,
            goal: punctuator,
            comment,
            matcher: comment.matcher || (matchers && matchers.comment) || undefined,
            hinter,
            punctuator,
          });
      } else if (punctuator === 'closure') {
        const closure = (definedDefinitions && definedDefinitions.closure) || closures.get(text);
        punctuator = nextToken.punctuator = 'opener';
        closure &&
          (childDefinitions =
            definedDefinitions ||
            contextualizer.define({
              syntax,
              goal: syntax,
              closure,
              matcher: closure.matcher || (matchers && matchers.closure) || undefined,
              hinter,
              punctuator,
            }));
      }
    }

    if (childDefinitions) {
      definitions[contextID] || (definitions[contextID] = childDefinitions);
      const childIndex = stack.push(childDefinitions);
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

const Definitions = Symbol('[definitions]');
