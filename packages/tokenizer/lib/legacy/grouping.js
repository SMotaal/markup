const {defineProperty} = Object;

const setProperty = (target, property, value, enumerable = true, configurable = true) =>
  defineProperty(target, property, {value, enumerable, configurable}) && value;

export class Grouping {
  /**
   * @param {{syntax: string, groupers: Groupers, createGrouper: createGrouper}} options
   */
  constructor({syntax, groupers, createGrouper, contextualizer}) {
    this.groupers = groupers;
    this.groupings = [];
    this.hints = new Set();
    this.syntax = syntax;
    this.goal = syntax;
    this.hint = syntax;
    this.contextualizer = contextualizer;
    this.context = syntax;
    this.create = createGrouper || Object;
  }

  /**
   * @param {Token} next
   * @param {Token} parent
   * @param state
   * @param context
   */
  close(next, state, context) {
    let after, grouper, parent;
    const {groupings, hints, syntax} = this;

    const closed = groupings.pop();
    grouper = closed;
    groupings.includes(grouper) || hints.delete(grouper.hinter);

    (closed.punctuator === 'opener' && (next.punctuator = 'closer')) ||
      (closed.punctuator && (next.punctuator = closed.punctuator));

    after = grouper.close && grouper.close(next, state, context);

    const previousGrouper = (grouper = groupings[groupings.length - 1]);

    this.goal = (previousGrouper && previousGrouper.goal) || syntax;
    this.grouper = previousGrouper;

    parent = (next.parent && next.parent.parent) || undefined;

    return {after, grouper, closed, parent};
  }

  open(next, context) {
    let opened, parent, grouper;

    const {groupers, groupings, hints, hint, syntax} = this;
    let {punctuator, text} = next;
    const hinter = punctuator ? `${syntax}-${punctuator}` : hint;
    const group = `${hinter},${text}`;

    grouper = groupers[group];

    const {
      mode: {matchers, comments, spans, closures},
    } = context;

    if (context.spans && punctuator === 'span') {
      const span = context.spans.get(text);
      punctuator = next.punctuator = 'span';
      opened =
        grouper ||
        this.create({
          syntax,
          goal: syntax,
          span,
          matcher: span.matcher || (matchers && matchers.span) || undefined,
          spans: (spans && spans[text]) || undefined,
          hinter,
          punctuator,
        });
    } else if (context.punctuator !== 'quote') {
      if (punctuator === 'quote') {
        opened =
          grouper ||
          this.create({
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
        opened =
          grouper ||
          this.create({
            syntax,
            goal: punctuator,
            comment,
            matcher: comment.matcher || (matchers && matchers.comment) || undefined,
            hinter,
            punctuator,
          });
      } else if (punctuator === 'closure') {
        const closure = (grouper && grouper.closure) || closures.get(text);
        punctuator = next.punctuator = 'opener';
        closure &&
          (opened =
            grouper ||
            this.create({
              syntax,
              goal: syntax,
              closure,
              matcher: closure.matcher || (matchers && matchers.closure) || undefined,
              hinter,
              punctuator,
            }));
      }
    }

    if (opened) {
      groupers[group] || (groupers[group] = grouper = opened);
      groupings.push(grouper), hints.add(hinter);
      this.goal = (grouper && grouper.goal) || syntax;
      parent = next;
    }

    return {grouper, opened, parent, punctuator};
  }
}

/** @typedef {import('../types').Grouping} Grouping */
/** @typedef {import('../types').Tokenizer} Tokenizer */
/** @typedef {import('../types').Token} Token */
/** @typedef {import('../types')['Tokenizer']} TokenizerClass */
/** @typedef {{[name: string]: Grouping}} Groupers */
/** @typedef {(TokenizerClass)['createGrouper']} createGrouper */
