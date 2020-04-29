# HTML Token Matcher

The Matcher-based tokenizer implementation for HTML.

## Progress

- [ ] Contextual Definitions — [`html-definitions.js`](./html-definitions.js)

  Structured definitions for keywords, goals, symbols… etc, used by the tokenization process.

  - [ ] HTMLGoal `(…)`

    <!--

    Special subset of ECMAScriptGoal grammar specific to the PrimaryExpression production further restricted to derivatives of NullLiteral, BooleanLiteral, NumericLiteral, StringLiteral, ObjectLiteral, and ArrayLiteral.


    - [x] HTMLStringGoal `"…"`
      - [x] Loose
      - [x] Strict
    - [ ] HTMLArrayGoal `[…]`
      - [x] Loose
      - [ ] Strict
    - [ ] HTMLOpenTagGoal `{…}`
      - [x] Loose
      - [ ] Strict

    -->

- [x] Matcher Ranges — [`html-ranges.js`](./html-ranges.js)

  Special regular expressions instances of `RegExpRange` that take the range or class form (ie `/[…]/`) reflecting ones found in actual specifications to be used as the building blocks of the matcher.

  <!--

  - [x] ControlCharacter `\0-\x1F`
    - [x] NullCharacter `\0`
  - [x] DecimalDigit `0-9`
  - [x] HexDigit `0-9a-fA-F`
    - [x] HexLetter `a-fA-F`

  ->

- [x] Matcher Template — [`html-matcher.js`](./html-matcher.js)

  The actual template expression used to define an internal instance of the matcher used as a template to create additional instances for matching.

  <!--

  - [x] Break
  - [x] Whitespace
  - [x] String
    - [x] Quote
    - [x] Escapes
    - [x] Fault
  - [x] Opener
  - [x] Closer
  - [x] Operator
  - [x] Keyword
  - [x] Number
  - [x] Fallthrough

  -->

- [x] Markup Mode — [`html-mode.js`](./html-mode.js)

  Safely interfaces with Markup's tokenizer APIs.

## Notes

- Development playground [/markup/experimental/html/](./../../../../experimental/html/)

- Imperative `TokenMatcher.forward` optimizations used for Strings.

  > **Why**: Such optimizations are essential since Matcher does yet have a conceptual framework in place to optimize nested matchers which do not compose but instead shared enough state to switch cleanly switch back-and-forth based between two fundamental matcher templates, ie for different goals or grammars.
  >
  > Worth noting that this would be especially useful down the road for nesting different grammars directly without actually needing most or all of Markup's core APIs.

## References

- https://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf
- https://github.com/erights/quasiParserGenerator/blob/master/test/jessie/quasi-html.js
- https://cswr.github.io/JsonSchema/spec/grammar/
