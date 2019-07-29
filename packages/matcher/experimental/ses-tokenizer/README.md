# Secure-ECMAScript Token Matcher

The Matcher-based tokenizer implementation for Secure-ECMAScript.

## Progress

- [x] Proof-of-concept grammar

  - [x] ECMAScript — [`demo`](./../../../../experimental/es/) [`matcher`](./../../../../experimental/es/es-matcher.js) [`definitions`](./../../../../experimental/es/es-definitions.js) [`ranges`](./../../../../experimental/es/es-ranges.js)

    > Incorporates minimal RegExp definitions for accurate tokenization.

- [ ] Full ECMAScript RegExp Grammar <!-- — [`demo`](./../../../../experimental/regexp/) -->

- [x] Layered grammar

  - [x] JSON — [`readme`](../json-tokenizer/README.md) [`demo`](./../../../../experimental/json/) [`matcher`](../json-tokenizer/json-matcher.js) [`definitions`](../json-tokenizer/json-definitions.js) [`ranges`](../json-tokenizer/json-ranges.js)

    - [x] Definitions:
      - [x] JSONGoal
        - [x] JSONObjectGoal
        - [x] JSONArrayGoal
        - [x] JSONStringGoal
        - [x] ~~JSONValueGoal~~ — uses JSONGoal

  - [ ] Justin — [`readme`](../justin-tokenizer/README.md)

    - [ ] Inherit JSON — not yet possible

  - [ ] Jessie — [`readme`](../jessie-tokenizer/README.md) [`demo`](./../../../../experimental/jessie/) [`matcher`](../jessie-tokenizer/jessie-matcher.js) [`definitions`](../jessie-tokenizer/jessie-definitions.js)

    - [ ] Inherit Justin — not yet possible
    - [ ] Definitions:
      - [ ] JessieGoal
        - [x] JessieStringGoal (from JSON)
        - [x] JessieCommentGoal (from ECMAScript)
        - [ ] JessieTemplateLiteralGoal (from ECMAScript)
          - [ ] ~~JessieTemplateSpan~~ — uses JessieGoal

  - [ ] SES — [`readme`](../ses-tokenizer/README.md)

    - [ ] Inherit Jessie — not yet possible
    - [ ] Definitions:
      - [ ] SESGoal
        - [ ] SESStringGoal (from Jessie)
        - [ ] SESCommentGoal (from Jessie)
        - [ ] SESTemplateLiteralGoal (from Jessie)
          - [ ] ~~SESTemplateSpan~~ — uses SESGoal
        - [ ] SESRegularExpressionGoal (from ES)
          - [ ] SESRegularExpressionClassGoal (from ES)

## References

- https://tc39.es/ecma262/
- https://github.com/erights/quasiParserGenerator/blob/master/test/tinyses/tinyses.js
