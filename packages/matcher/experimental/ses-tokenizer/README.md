# Secure-ECMAScript Token Matcher

The Matcher-based tokenizer implementation for Secure-ECMAScript.

## Progress

- [x] Proof-of-concept Grammar

  - [x] ECMAScript — [`demo`](./../../../../experimental/es/)

    > Incorporates minimal RegExp definitions for accurate tokenization.

    - [x] Matcher — [`matcher`](./../../../../experimental/es/es-matcher.js)
    - [x] Definitions — [`definitions`](./../../../../experimental/es/es-definitions.js)
    - [x] Ranges — [`ranges`](./../../../../experimental/es/es-ranges.js)
    - [x] Constructs — [`constructs`](./../../../../experimental/es/Constructs.md)

- [ ] Full ECMAScript RegExp Grammar

- [x] Layered Grammar

  - [x] JSON — [`readme`](../json-tokenizer/README.md) [`demo`](./../../../../experimental/json/) [`matcher`](../json-tokenizer/json-matcher.js)

    - [x] Matcher — [`matcher`](../json-tokenizer/json-matcher.js)
    - [x] Definitions — [`definitions`](../json-tokenizer/json-definitions.js)
      - [x] JSONGoal
        - [x] JSONObjectGoal
        - [x] JSONArrayGoal
        - [x] JSONStringGoal
        - [x] ~~JSONValueGoal~~ — uses JSONGoal
    - [x] Ranges — [`ranges`](../json-tokenizer/json-ranges.js)
    - [ ] Constructs
      - [ ] …

  - [ ] Justin — [`readme`](../justin-tokenizer/README.md)

    - [ ] Matcher
    - [ ] Definitions
      - [ ] Inherit JSON — not yet possible
      - [ ] …
    - [ ] Ranges
    - [ ] Constructs

  - [ ] Jessie — [`readme`](../jessie-tokenizer/README.md) [`demo`](./../../../../experimental/jessie/)

    - [x] Matcher — [`matcher`](../jessie-tokenizer/jessie-matcher.js)
    - [ ] Definitions — [`definitions`](../jessie-tokenizer/jessie-definitions.js)
      - [ ] Inherit Justin — not yet possible
      - [ ] JessieGoal
        - [x] JessieStringGoal (from JSON)
        - [x] JessieCommentGoal (from ECMAScript)
        - [ ] JessieTemplateLiteralGoal (from ECMAScript)
          - [ ] ~~JessieTemplateSpan~~ — uses JessieGoal
        - [ ] …
    - [ ] Ranges
    - [ ] Constructs

  - [ ] SES — [`readme`](../ses-tokenizer/README.md)

    - [ ] Matcher
    - [ ] Definitions
      - [ ] Inherit Jessie — not yet possible
      - [ ] …
    - [ ] Ranges
    - [ ] Constructs

## References

- https://tc39.es/ecma262/
- https://github.com/erights/quasiParserGenerator/blob/master/test/tinyses/tinyses.js
