export class Contextualizer {
  constructor(tokenizer, initialize = context => context) {
    // Local contextualizer state
    let grouper;

    // Tokenizer mode
    const mode = tokenizer.mode;
    const defaults = tokenizer.defaults;
    mode !== undefined || (mode = (defaults && defaults.mode) || undefined);
    if (!mode) throw ReferenceError(`Tokenizer.contextualizer invoked without a mode`);

    if (!mode.context) {
      const {
        matcher = (mode.matcher = (defaults && defaults.matcher) || undefined),
        quotes,
        punctuators = (mode.punctuators = {aggregators: {}}),
        punctuators: {aggregators = (punctuators.aggregators = {})},
        patterns: {
          maybeKeyword = (mode.patterns.maybeKeyword =
            (defaults && defaults.patterns && defaults.patterns.maybeKeyword) || undefined),
        } = (mode.patterns = {maybeKeyword: null}),
        spans: {['(spans)']: spans} = (mode.spans = {}),
      } = mode;

      initialize((mode.context = {mode, punctuators, aggregators, matcher, quotes, spans}));
    }

    const {
      syntax: $syntax,
      matcher: $matcher,
      quotes: $quotes,
      punctuators: $punctuators,
      punctuators: {aggregators: $aggregators},
    } = mode;

    this.context = (next = mode.context) => {
      if (grouper !== (grouper = next) && grouper && !grouper.context) {
        const {
          goal = (grouper.syntax = $syntax),
          punctuator,
          punctuators = (grouper.punctuators = $punctuators),
          aggregators = (grouper.aggregate = $aggregators),
          closer,
          spans,
          matcher = (grouper.matcher = $matcher),
          quotes = (grouper.quotes = $quotes),
          forming = (grouper.forming = goal === $syntax),
        } = grouper;

        initialize(
          (grouper.context = {mode, punctuator, punctuators, aggregators, closer, spans, matcher, quotes, forming}),
        );
      }

      return grouper && grouper.context;
    };
  }
}
