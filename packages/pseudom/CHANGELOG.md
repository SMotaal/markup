# Changelog

<!--
All notable changes to the "experimental-theme" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.
 -->

## [0.0.10][] — 2019-12-03

### Added

- Preliminary compositional `CSSStyleDeclaration`, `DOMTStringMap`, `DOMTokenList` and `DOMNodeList` abstractions.
- Preliminary compositional support for `pseudo.createElement(…).style` attribute style properties (no case folding).

### Improved

- Compositional `style` and `dataset` properties in `pseudo.Element` to match the `readonly` and `assignable` behaviour of their `native.Element` counterparts.
- Compositional `append(…)` and `remove(…)`.

### Fixed

- [x] Typo in README example `createElement` missing second argument.
- [x] Handling for `pseudo.Element`'s `append` to automatically create `Text` nodes from non-`Element` values.
- [x] Handling for `pseudo.Element`'s `append` to automatically create `Text` nodes from non-`Element` values.
- [x] Exposing `append(…)` from `pseudo.Element` not `pseudo.Node`.
- [x] Exposing `remove()` from `pseudo.Node` which always throws.

## [0.0.9][] — 2019-10-09

### Added

- Preliminary compositional support for `pseudo.createElement(…).dataset` auto-prefixed `data-` attributes (no case folding).

## [0.0.8][] — 2019-10-09

- Refactor package following OCAP principles

[unreleased]: ./README.md
[0.0.10]: https://www.npmjs.com/package/@smotaal/pseudom/v/0.0.10
[0.0.9]: https://www.npmjs.com/package/@smotaal/pseudom/v/0.0.9
[0.0.8]: https://www.npmjs.com/package/@smotaal/pseudom/v/0.0.8
