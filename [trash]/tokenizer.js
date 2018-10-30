const LineEndings = /$/gm;

const maybe = (result, expression, text) =>
  (expression && // expression !== undefined && expression !== null &&
    (expression.test
      ? expression.test(text)
      : expression.includes
        ? expression.includes(text)
        : expression === text) &&
    result) ||
  undefined;

export function* tokenizer(context) {
  let done, input, output;

  const {
    $: {
      syntax: $syntax,
      // matcher: $matcher, //
      matchers: $matchers,
      keywords: $keywords,
      assigners: $assigners,
      operators: $operators,
      combinators: $combinators,
      nonbreakers: $nonbreakers,
      comments: $comments,
      // quotes: $quotes, //
      // spans: $spans,
      closures: $closures,
      breakers: $breakers,
      patterns: $patterns,
      // punctuators: $punctuators, //
      // aggregators: $aggregators, //
    },
    punctuator: $$punctuator,
    punctuators: $$punctuators,
    aggregators: $$aggregators,
    closer: $$closer,
    spans: $$spans,
    matcher: $$matcher,
    quotes: $$quotes,
  } = context;

  while (!done) {
    let output;
    if (input) {
      let {
        // Matched whitespace of next production
        whitespace,

        // Matched sequence of next production
        sequence,

        // Unmatched sequence before next production
        pre,

        // Text for next production
        text = whitespace || sequence || pre || '',

        // Type of next production
        type = (whitespace && 'whitespace') || (sequence && 'sequence') || (pre && 'pre') || 'text',

        // Index of next production
        offset,

        // Linebreaks in next production
        breaks,

        // Hint of next production
        hint,

        // Previous production
        previous,

        // Parent of next production
        parent = (previous && previous.parent) || undefined,

        // Last significant production
        last,

        //
        forming,
      } = input;

      if (sequence) {
        type =
          (previous &&
            ($$aggregators[text] ||
              (!(text in $$aggregators) &&
                ($$aggregators[text] =
                  ($assigners && $assigners.includes(text) && 'assigner') ||
                  ($combinators && $combinators.includes(text) && 'combinator'))))) ||
          ($$punctuators[text] ||
            (!(text in $$punctuators) &&
              ($$punctuators[text] =
                ($nonbreakers && $nonbreakers.includes(text) && 'nonbreaker') ||
                ($operators && $operators.includes(text) && 'operator') ||
                ($comments && $comments.includes(text) && 'comment') ||
                ($$spans && $$spans.includes(text) && 'span') ||
                ($$quotes && $$quotes.includes(text) && 'quote') ||
                ($closures && $closures.includes(text) && 'closure') ||
                ($breakers && $breakers.includes(text) && 'breaker')))) ||
          type;
      } else if (whitespace) {
        breaks = whitespace.match(LineEndings).length - 1;
      } else if (forming && text) {
        const word = text.trim();
        // const assigning = forming && punctuator && punctuator === 'assigner';
        const keywording =
          forming &&
          ((!previous || previous.punctuator !== 'nonbreaker') &&
            (!last ||
              !last.punctuator ||
              (last.punctuator !== 'nonbreaker' && last.punctuator !== 'quote') ||
              !previous ||
              previous.breaks ||
              previous.type !== 'whitespace' ||
              !previous.previous ||
              (!previous.previous.punctuator ||
                previous.previous.punctuator !== 'nonbreaker' ||
                !previous.previous.form ||
                previous.previous.form === 'keyword' ||
                previous.previous.form === 'identifier')));

        type =
          (forming &&
            ((keywording && maybe('keyword', $keywords, word)) ||
              ($patterns &&
                (maybe('identifier', $patterns.maybeIdentifier, word) ||
                  maybe('word', $patterns.maybeKeyword, word))))) ||
          'text';
        // type = (assigning && 'variable') || form;
      }

      output = {type, text, offset, breaks, hint, previous, parent};
    }

    input = yield output;
  }
}
