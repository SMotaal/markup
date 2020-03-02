# Changelog

<!--
All notable changes to the "experimental-theme" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
 -->

## [0.0.7][] — 2019-12-03

### Added

- Refactored markup APIs with support for the new `matcher` tokenizer.
- High-precedence contextual `punctuation` map.

### Improved

- DOM granularity and styling with new `style` attribute properties.

### Changed

- Dropped token flattening from `extensions/dom.js`.
- Moved `browser/demo` to `@smotaal.io/markup`.

### Fixed

- [x] MarkupRenderer sometimes yielding extra `undefined`.
- [x] Extraneous `newline` token for nested code blocks (ie `script` and `style` in `html`).

## [0.0.6][] — 2019-04-30

- Switch to `@smotaal/pseudom` scoped distribution.
- Refactor `extensions/dom.js` to `export default new class {}`.
- Cleanup extensions and related documentation.
- Rename source entries using `tokenizer‹.variant›*.js`.
- Cleanup implementation and examples.
- Introduce `experimental` tokenizer variants from `lib/experimental`.

## [0.0.5][] — 2019-03-24

- Refactor grammars into a separate package.
- Remove `dist/extensions/` bundles.
- Expose dom and grammar helpers directly `dist/tokenizer.browser.js`.

## [0.0.3][] — 2019-01-30

## [0.0.2][] — 2019-01-28

## [0.0.1][] — 2019-11-27

## [0.0.0][] — 2019-11-23

[unreleased]: ./README.md
[0.0.7]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.7
[0.0.6]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.6
[0.0.5]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.5
[0.0.3]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.3
[0.0.2]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.2
[0.0.1]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.1
[0.0.0]: https://www.npmjs.com/package/@smotaal/tokenizer/v/0.0.0
