# @smotaal/matcher

Matchers are stateful expressions that use interlaced capture hooks (ie `entities`) to mutate both state and matches. This mere abstraction makes it possible to leverage Regular Expressions beyond the traditional context-free limitations.

**`Matcher`** extends the `exec` method of the _`RegExp`_ class to iterate over the `entities` array for respective capture(s).

By default:

- A _capture position_ is any position in the `match` array except for the match position itself (ie `match[0]`).

- A capture represents an initialized element in a _capture position_ that is not `undefined`.

- An _entity position_ in the `entities` array maps to the _capture position_ of the following index in the `match` where `entityIndex == captueIndex - 1`.

- A _`null` entity_ in the `entities` array is always skipped.

- A _`‹identity›` entity_ that is _non-callable_ and which is expected to always be coercible to a `string` or `symbol` is assigned to the respective `match.capture[‹identity›]`, where the intact value of `‹identity›` last captured is also iteratively reflected as the `match.identity`.

- A _`‹handler›` entity_ that is callable is called with `match[0]`, _capture `index`_, the `match`, and the `state` of the `Matcher` instance, which is expected to independently handle all mutations of the `match` instance, including mutations to the `match.capture` or `match.identity` if necessary.

  > **Note**: By design, there are no safeguards in place for preserving `‹handler›` mutations to any `match` or `match.capture` fields, but which can be implemented by extensions that would justify such exponential expansive costs.

**`Token Matcher`** extends the _`Matcher`_ interface with a `tokenize` method that

<!-- See [<samp>Changelog</samp>][changelog]. -->

## Progress

- [x] Experiments

  - [x] [`experimental/json-tokenizer`](./experimental/json-tokenizer/README.md)
  - [ ] [`experimental/jessie-tokenizer`](./experimental/jessie-tokenizer/README.md)
  - [ ] [`experimental/justin-tokenizer`](./experimental/justin-tokenizer/README.md)
  - [ ] [`experimental/ses-tokenizer`](./experimental/ses-tokenizer/README.md)

- [x] Implementation

  - [x] Implement base Matcher — [`lib/matcher.js`](./lib/matcher.js)
    - [x] Refactor Tokenizer helpers — [`lib/token-matcher.js`](./lib/token-matcher.js)
    - [x] Refactor Segmenter helpers and overrides — [`segment-matcher.js`](./lib/segment-matcher.js)
    - [x] Refactor Debugging helpers — [`lib/debug.js`](./lib/debug.js)
    - [x] Refactor Matches wrapper — [`lib/matches.js`](./lib/matches.js)
  - [x] Refactor RegExpRange — [`lib/range.js`](./lib/range.js)

[package:repository]: https://github.com/SMotaal/markup/tree/master/packages/matcher
[changelog]: ./CHANGELOG.md
