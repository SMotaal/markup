const mappings = new WeakMap();

export class Contextualizer {
  // constructor(tokenizer, initialize = context => context) {
  constructor(tokenizer) {
    // Local contextualizer state
    let definitions, context;

    // Tokenizer mode
    const {defaults = {}, mode = defaults.mode, initializeContext} = tokenizer;

    if (!mode) {
      throw ReferenceError(`Tokenizer.contextualizer invoked without a mode`);
      // } else if (!mode[Context]) {
    } else if (!(context = mappings.get((definitions = mode)))) {
      const {
        syntax,
        matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
        quotes,
        punctuators = (mode.punctuators = {aggregators: {}}),
        punctuators: {aggregators = (punctuators.aggregators = {})},
        patterns = (mode.patterns = {maybeKeyword: null}),
        patterns: {
          maybeKeyword = (patterns.maybeKeyword =
            (defaults && defaults.patterns && defaults.patterns.maybeKeyword) || undefined),
        },
        spans: {['(spans)']: spans} = (mode.spans = {}),
      } = mode;

      context = {syntax, goal: syntax, mode, punctuators, aggregators, matcher, quotes, spans};

      initializeContext && Reflect.apply(initializeContext, tokenizer, [context]);

      // initializeContext && initializeContext(context);

      mappings.set(mode, context);
    }

    const root = context;

    const prime = next => {
      // if (definitions !== (definitions = next) && definitions && !definitions[Context]) {
      if (definitions !== next && next && !(context = mappings.get((definitions = next)))) {
        const {
          syntax = (definitions.syntax = mode.syntax),
          goal = (definitions.goal = syntax),
          punctuator,
          punctuators = (definitions.punctuators = mode.punctuators),
          aggregators = (definitions.aggregate = punctuators && punctuators.aggregators),
          closer,
          spans,
          matcher = (definitions.matcher = mode.matcher),
          quotes = (definitions.quotes = mode.quotes),
          forming = (definitions.forming = goal === mode.syntax),
        } = definitions;

        context = {mode, syntax, goal, punctuator, punctuators, aggregators, closer, spans, matcher, quotes, forming};

        initializeContext && Reflect.apply(initializeContext, tokenizer, [context]);

        mappings.set(definitions, context);
      }

      // return definitions && definitions[Context];
      return context || ((definitions = mode), (context = root));
    };

    Object.defineProperties(this, {
      mode: {value: mode, writable: false},
      prime: {value: prime, writable: false},
      // definitions: {value: this.definitions, writable: false},
      // context: {value: this.context, writable: false},
    });
  }

  define({
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

// const Context = Symbol('[context]');
// const Definitions = Symbol('[definitions]');
