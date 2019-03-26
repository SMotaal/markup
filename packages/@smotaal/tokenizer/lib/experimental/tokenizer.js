import {Grouping} from '../grouping.js';
import {Contextualizer} from './contextualizer.js';
import {TokenSynthesizer} from './synthesizer.js';

/** Tokenizer for a single mode (language) */
export class Tokenizer {
  constructor(mode, defaults) {
    this.mode = mode;
    this.defaults = defaults || this.constructor.defaults || undefined;
  }

  /** Token generator from source using tokenizer.mode (or defaults.mode) */
  *tokenize(source, state = {}) {
    let done;

    const Species = this.constructor; // TODO: Consider Symbol.species

    // Local context
    const contextualizer =
      this.contextualizer ||
      new Contextualizer(this, context => {
        let {token = (context.token = new TokenSynthesizer(context).token)} = context;
        return context;
      });
    let context = contextualizer.context();

    const {mode, syntax, createGrouper = Species.createGrouper || Object} = context;

    // Local grouping
    const groupers = mode.groupers || (mode.groupers = {});
    const grouping =
      state.grouping ||
      (state.grouping = new Grouping({
        syntax: syntax || mode.syntax,
        groupers,
        createGrouper,
        contextualizer,
      }));

    // Local matching
    let {match, index = 0, flags} = state;

    // Local tokens
    let previousToken, lastToken, parentToken;
    const top = {type: 'top', text: '', offset: index};

    // let lastContext = context;
    state.context = context;

    state.source = source;

    const tokenize = state.tokenize || (text => [{text}]);

    while (!done) {
      const {
        mode: {syntax, matchers, comments, spans, closures},
        punctuator: $$punctuator,
        closer: $$closer,
        spans: $$spans,
        matcher: $$matcher,
        token,
        forming = true,
      } = context;

      // Current contextual hint (syntax or hint)
      const hint = grouping.hint;

      while (state.context === (state.context = context)) {
        let next;

        const lastIndex = state.index || 0;

        $$matcher.lastIndex = lastIndex;
        match = state.match = $$matcher.exec(source);
        done = index === (index = state.index = $$matcher.lastIndex) || !match;

        if (done) break;

        // Current contextual match
        const {0: text, 1: whitespace, 2: sequence, index: offset} = match;

        // Current quasi-contextual fragment
        const pre = source.slice(lastIndex, offset);
        pre &&
          ((next = token({
            type: 'pre',
            text: pre,
            offset: lastIndex,
            previous: previousToken,
            parent: parentToken,
            hint,
            last: lastToken,
            source,
          })),
          yield (previousToken = next));

        // Current contextual fragment
        const type = (whitespace && 'whitespace') || (sequence && 'sequence') || 'text';
        next = token({type, text, offset, previous: previousToken, parent: parentToken, hint, last: lastToken, source});

        // Current contextual punctuator (from sequence)
        const closing =
          $$closer &&
          ($$closer.test ? $$closer.test(text) : $$closer === text || (whitespace && whitespace.includes($$closer)));

        let after;
        let punctuator = next.punctuator;

        if (punctuator || closing) {
          let closed, opened, grouper;

          if (closing) {
            ({after, closed, parent: parentToken = top, grouper} = grouping.close(next, state, context));
          } else if ($$punctuator !== 'comment') {
            ({grouper, opened, parent: parentToken = top, punctuator} = grouping.open(next, context));
          }

          state.context = grouping.context = grouping.goal || syntax;

          if (opened || closed) {
            next.type = 'punctuator';
            context = contextualizer.context((state.grouper = grouper || undefined));
            grouping.hint = `${[...grouping.hints].join(' ')} ${grouping.context ? `in-${grouping.context}` : ''}`;
            opened && (after = opened.open && opened.open(next, state, context));
          }
        }

        // Current contextual tail token (yield from sequence)
        yield (previousToken = next);

        // Next reference to last contextual sequence token
        next && !whitespace && forming && (lastToken = next);

        if (after) {
          let tokens, token, nextIndex;

          if (after.syntax) {
            const {syntax, offset, index} = after;
            const body = index > offset && source.slice(offset, index - 1);
            if (body) {
              body.length > 0 &&
                ((tokens = tokenize(body, {options: {sourceType: syntax}}, this.defaults)), (nextIndex = index));
              const hint = `${syntax}-in-${mode.syntax}`;
              token = token => ((token.hint = `${(token.hint && `${token.hint} `) || ''}${hint}`), token);
            }
          } else if (after.length) {
            const hint = grouping.hint;
            token = token => ((token.hint = `${hint} ${token.type || 'code'}`), context.token(token));
            (tokens = after).end > state.index && (nextIndex = after.end);
          }

          if (tokens) {
            for (const next of tokens) {
              previousToken && ((next.previous = previousToken).next = next);
              token && token(next);
              yield (previousToken = next);
            }
            nextIndex > state.index && (state.index = nextIndex);
          }
        }
      }
    }
    flags && flags.debug && console.info('[Tokenizer.tokenize‹state›]: %o', state);
  }

  static createGrouper({
    syntax,
    goal = syntax,
    quote,
    comment,
    closure,
    span,
    grouping = comment || closure || span || undefined,
    punctuator,
    spans = (grouping && grouping.spans) || undefined,
    matcher = (grouping && grouping.matcher) || undefined,
    quotes = (grouping && grouping.quotes) || undefined,
    punctuators = {aggregators: {}},
    opener = quote || (grouping && grouping.opener) || undefined,
    closer = quote || (grouping && grouping.closer) || undefined,
    hinter,
    open = (grouping && grouping.open) || undefined,
    close = (grouping && grouping.close) || undefined,
  }) {
    return {syntax, goal, punctuator, spans, matcher, quotes, punctuators, opener, closer, hinter, open, close};
  }
}
