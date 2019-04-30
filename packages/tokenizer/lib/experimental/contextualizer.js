/** Shared context state handler for token generator instances  */
export class Contextualizer {
  constructor(tokenizer) {
    // Local contextualizer state
    let definitions, context;

    // Tokenizer mode
    const {defaults = {}, mode = defaults.mode, initializeContext} = tokenizer;

    if (!mode) throw Error(`Contextualizer constructed without a mode`);

    const prime = next => (
      definitions !== next &&
        next &&
        ((context = mappings.get((definitions = next))) ||
          ((context = this.contextualize(definitions)),
          initializeContext && apply(initializeContext, tokenizer, [context]))),
      (next != null && context) || ((definitions = mode), (context = root))
    );

    Object.defineProperties(this, {
      mode: {value: mode, writable: false},
      prime: {value: prime, writable: false},
    });

    // Eagerly contextualize "root" definitions on first use
    if (!(context = mappings.get((definitions = mode)))) {
      const {
        // Parent goal
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

      initializeContext && apply(initializeContext, tokenizer, [context]);

      mappings.set(mode, context);
    }

    const root = context;
  }

  contextualize(definitions) {
    const mode = this.mode;

    const {
      // Parent goal
      syntax = (definitions.syntax = mode.syntax),

      // Lexical goal
      goal = (definitions.goal = syntax),

      // Assumes shared parent and unrelated production lexicons
      punctuators = (definitions.punctuators = goal === syntax ? mode.punctuators : {}),
      aggregators = (definitions.aggregate =
        (punctuators && punctuators.aggregators) || (punctuators.aggregators = {})),

      // Contextual identity
      punctuator,
      closer,

      // Contextual grammar
      spans,
      matcher = (definitions.matcher = mode.matcher),
      quotes = (definitions.quotes = mode.quotes),
      forming = (definitions.forming = goal === mode.syntax),
    } = definitions;

    const context = {mode, syntax, goal, punctuator, punctuators, aggregators, closer, spans, matcher, quotes, forming};

    mappings.set(definitions, context);
    return context;
  }

  /** @deprecate Historical convenience sometimes used cautiously */
  normalize({
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

Object.freeze(Object.freeze(Contextualizer.prototype).constructor);

const mappings = new WeakMap();
const {apply} = Reflect;
