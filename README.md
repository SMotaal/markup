# Markup [<kbd float-right>GitHub</kbd>][/./]

Experimental parsing using regular expressions as a core building block.

> **Note**: Stale documentation currently under review.

## Structure

Markup is a monorepo which includes a number of experimental parsing-related works. Those efforts are organically evolving, which makes it sometimes hard to keep documentation up-to-date. All work is open-source and contributions are welcome, just reach out.

1. Early prototype now lives in [/lib/][] — pending refactor to [/packages/markup/lib/][]

   > **Note**: Intended only as a concept proof (buggy) for parsing nested syntax (ie `html`, `css`, and `js`)

   - Strawman generator-based tokenizer to switch between regular expressions
   - Strawman grammar definitions with contextual hooks — ie closure-level handling of `open` and `close`
   - Strawman parsing architecture to register and switch between modes — ie primed tokenizer of a specific grammar

2. Early playground now lives in [/packages/markup/browser/][] — pending refactor to [/packages/markup/browser/playground/][]

   - Featherweight compositional DOM abstractions that live in [/packages/pseudom/][]

3. Core implementation now lives in [/packages/tokenizer/][] and [/packages/grammar/][]

   - Classic tokenizer and grammars
   - Classic parsing architecture
   - Experimental parsing architecture with cleaner APIs and tokenizer interfaces

4. Matcher-based implementation now lives in [/packages/matcher/][]

   - Experimental `RegExp` extension for stateful entity capturing hooks - ie handling of individual captures for a given match

### Refactor

<details>

- [ ] Refactored `@smotaal.io/markup` into `packages/markup/`
  - [x] Refactored `packages/tokenizer/browser/demo/` to `packages/markup/browser/`
  - [x] Refactored `packages/tokenizer/browser/styles` to `packages/markup/browser/styles/`
  - [x] Refactored `lib/` to `packages/markup/lib/`
  - [x] Refactored `benchmarks/` to `packages/markup/benchmarks/`
  - [x] Refactored `node/` to `packages/markup/node/`
  - [x] Add `postbundle` task to copy `packages/tokenizer/dist/` into `packages/markup/dist/tokenizer/`
  - [x] Update CSP and loading mechanism for `dark-mode` to fallback to `unpkg`
  - [ ] Specs:
    - [x] `specs/markup-node-esm-package`
    - [ ] `specs/markup-node-cjs-package`
    - [ ] `specs/markup-unpkg-esm-package`
    - [ ] `specs/markup-unpkg-legacy-package`
  - [ ] Publish
- [ ] Refactor `@smotaal.io/tokenizer`
- [ ] Refactor `@smotaal.io/matcher`

</details>

---

## Playgrounds

This browser-based tool is designed to help with the development efforts. It has no dependencies and can be easily deployed on any static server, where the hash (ie fragment) is used to indicate the source to be tokenized and other options.

Each entrypoint can customize mappings for aliases (ie _mapped aliases_) and modes (ie _mode mappings_), where:

- _Mapped Aliases_ associate shorthand identifier strings to particular URLs along with an optional explicit mode.
- _Mode Mappings_ associate short and long mode identifier strings to particular tokenizer configurations.

By default, any playground entrypoint should handle hash-based parameters in a similar manner. However, entrypoints will likely use tailor aspects like mappings and fallbacks to their task.

```
‹entrypoint›#‹specifier›!‹mode›*‹iterations›**‹repeats›
```

<details><summary align=center>Details</summary>

**Hash Rules**

- All hash parameters are optional.
- When a `‹specifier›` is used, it must always go first.
- Every hash parameter other than the `‹specifier›` is delimited.
- All hash parameters except for the `‹specifier›` can be in any order.

**Valid Arrangements**

- `#‹specifier›!‹mode›*‹iterations›**‹repeats›`
- `#‹specifier›*‹iterations›!‹mode›**‹repeats›`
- `#‹specifier›*‹iterations›**‹repeats›!‹mode›`
- `#‹specifier›**‹repeats›!‹mode›*‹iterations›`
- `#‹specifier›!‹mode›**‹repeats›*‹iterations›`

**Things to Keep in Mind**

- Default fallbacks for omitted parameters are configured by `‹entrypoint›` to tailor it to their task.
- Playgrounds can also affect the outcomes of explicit parameters for their respective `‹entrypoint›` based on their task.
- It is recommended to avoid "pilling" of a parameter as that may lead to unintended outcomes.

**Live Entrypoints**

A number of playground entrypoints are hosted directly from the repository:

- https://smotaal.io/markup/markup.html
- https://smotaal.io/markup/experimental/
- https://smotaal.io/markup/experimental/es/
- https://smotaal.io/markup/experimental/json/

**Specifiers & Modes**

Aside from _mapped aliases_ (above), specifiers can also use _convenience prefixes_ are also incorporated for `unpkg:` and `cdnjs:` by default, which may be further customized by entrypoints. Those prefixes are first delegated to respective resolvers to determine the URL of the fetched source.

If an explicit mode parameter is passed, it will take first precedence, otherwise, the mode is determined from the alias or the `content-type` header of the fetched source. Each playground can override some of this behavior.

**Iterations & Repeats**

By default, each source will have a warmup parse, followed by a timed headless parse, followed by separate timed rendered parse. The average times are shown following each step.

Additional iterations can be specified to improve sampling accuracy for the average headless time. Additional repeats can be specified to sequentially render the same source multiple times.

**Future Work**

- [ ] Incorporate documentation into playgrounds
- [ ] Refactor and deploy as a package

</details>

---

## Aspects

### Matcher-based Grammar (aka [`@smotaal/matcher`](./packages/matcher/README.md)) [<kbd float-right>source</kbd>][/packages/matcher/]

The second generation matcher-based experimental tokenizer designs, inspired by [erights/quasiParserGenerator](https://github.com/erights/quasiParserGenerator). Efforts on way to refactor this into it's own separate package.

- [Matcher-based JSON](./experimental/json/)
- [Matcher-based ECMAScript](./experimental/es/)

### Classic Grammar (aka [`@smotaal/grammar`](./packages/grammar/README.md)) [<kbd float-right>source</kbd>][/packages/grammar/]

The original extensible and declarative grammars. While my experimental efforts have since concluded, these heavily-refined first-approximation grammars see uses in projects, including [markout](https://www.smotaal.io/markout 'Markout').

### Markup Core (aka [`@smotaal/tokenizer`](./packages/tokenizer/README.md)) [<kbd float-right>source</kbd>][/packages/tokenizer/]

The second generation tokenizer architecture, optimized for both Classic and Matcher-based grammars.

### Compositional DOM (aka [`pseudom`](./packages/pseudom/README.md)) [<kbd float-right>source</kbd>][/packages/pseudom/]

The minimalistic isomorphic compositional DOM used to render tokenized.

---

## Drafts

> **Note** — The following are incomplete thoughts.

- `2019-09` [Articulative Parsing](/experimental-modules-shim/documentation/Articulative-Parsing.md)
- `2019-06` [ECMAScript Constructs](/markup/experimental/es/Constructs.md)
- `2019-05` [Contemplative Parsing](/experimental-modules-shim/documentation/Contemplative-Parsing.md)
  - `2019-05` [Disambiguation](/experimental-modules-shim/documentation/Contemplative-Parsing-Disambiguation.md)

---

All my experimental work is intended to remain open and freely available, with the one obvious expectation of fair attribution where used.

[/./]: https://github.com/SMotaal/markup/tree/master/
[/lib/]: https://github.com/SMotaal/markup/tree/master/lib/
[/packages/grammar/]: https://github.com/SMotaal/markup/tree/master/packages/grammar/
[/packages/tokenizer/]: https://github.com/SMotaal/markup/tree/master/packages/tokenizer/
[/packages/markup/browser/]: https://github.com/SMotaal/markup/tree/master/packages/markup/browser/
[/packages/matcher/]: https://github.com/SMotaal/markup/tree/master/packages/matcher/
[/packages/markup/lib/]: https://github.com/SMotaal/markup/tree/master/packages/markup/lib/
[/packages/markup/browser/playground/]: https://github.com/SMotaal/markup/tree/master/packages/markup/browser/playground/
[/packages/pseudom/]: https://github.com/SMotaal/markup/tree/master/packages/pseudom/
