# JSON Token Matcher

The Matcher-based tokenizer implementation for JSON.

## Progress

- [ ] Contextual Definitions — [`json-definitions.js`](./json-definitions.js)

  Structured definitions for keywords, goals, symbols… etc, used by the tokenization process.

  - [ ] JSONGoal `(…)`

    Special subset of ECMAScriptGoal grammar specific to the PrimaryExpression production further restricted to derivatives of NullLiteral, BooleanLiteral, NumericLiteral, StringLiteral, ObjectLiteral, and ArrayLiteral.

    - [x] JSONStringGoal `"…"`
      - [x] Loose
      - [x] Strict
    - [ ] JSONArrayGoal `[…]`
      - [x] Loose
      - [ ] Strict
    - [ ] JSONObjectGoal `{…}`
      - [x] Loose
      - [ ] Strict

- [x] Matcher Ranges — [`json-ranges.js`](./json-ranges.js)

  Special regular expressions instances of `RegExpRange` that take the range or class form (ie `/[…]/`) reflecting ones found in actual specifications to be used as the building blocks of the matcher.

  - [x] ControlCharacter `\0-\x1F`
    - [x] NullCharacter `\0`
  - [x] DecimalDigit `0-9`
  - [x] HexDigit `0-9a-fA-F`
    - [x] HexLetter `a-fA-F`

- [x] Matcher Template — [`json-matcher.js`](./json-matcher.js)

  The actual template expression used to define an internal instance of the matcher used as a template to create additional instances for matching.

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

- [x] Markup Mode — [`json-mode.js`](./json-mode.js)

  Safely interfaces with Markup's tokenizer APIs.

## Notes

- Development playground [/markup/experimental/json/](./../../../../experimental/json/)

- Matcher does yet optimize nested matcher templates, it simply concatenates the expression and the entities.

  - Manual optimizations must be made for strings and comments using the `TokenMatcher.forward` helper for performance and more importantly to limit the complexity of entity handlers by delegating to so called `LookAheadExpressions`.

## References

- https://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf
- https://github.com/erights/quasiParserGenerator/blob/master/test/jessie/quasi-json.js
- https://cswr.github.io/JsonSchema/spec/grammar/
