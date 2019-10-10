# Markup <nav float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/markup)

Semi-contextual parsing experiments using regular expressions as a core building block.

> **Note**: Stale documentation is currently under review.

---

## Refactor

<details>

- [ ] [_Custom Elements_](./elements/) — Compartmentalize reusable web components structured to progressively compose from simple to the more advanced use cases through iterations.

</details>

---

## Demo

The minimalistic web interface is designed from the ground up to stay out of the way, ie without the noise of non-essential UI, or the use of any libraries, frameworks or tools, using pure ECMAScript module sources.

_Classic_ — [`html`](./markup.html#html) [`css`](./markup.html#css) [`js`](./markup.html#js) [`md`](./markup.html#md)

_Experimental_ — [`html`](./experimental/#html) [`css`](./experimental/#css) [`js`](./experimental/#js) [`md`](./experimental/#md)

<details>

Multiple entrypoints are used for the various experimental efforts, all using the same interface and hash-based options:

```
markup.html#‹specifier›!‹mode›*‹iterations›**‹repeats›
```

**Parameters**

The order of the parameters is manadatory, but all parameters are optional.

1. Resource specifier can either be one of the hard-wired presets, a valid url or a bare specifier with `unpkg:` or `cdnjs:` prefixes

2. You can force the parsing mode by adding `!es`, `!html`, `!css`, or `!md`

   <blockquote>

   Forcing other modes can be useful if content-type detection fails

   </blockquote>

3. You can repeat the tokenization process by adding `*‹iterations›`

4. You can repeat the input passed to the parser by adding `**‹repeats›`

   <blockquote>

   Adding `**0` can be useful to disable rendering for very long sources.

   </blockquote>

**Examples**

<figure>

_Specifiers & Modes_

- [`#unpkg:acorn`](./markup.html#unpkg:acorn)
- [`#~/lib/tokenizer.js`](./markup.html#~/lib/tokenizer.js)

_Useful Presets_ — hard-wired convenience samples

- [`#es`](./markup.html#es)
- [`#html`](./markup.html#html)
- [`#css`](./markup.html#css)
- [`#md`](./markup.html#md)

_Repeats & Iterations_

- [`#`](./markup.html#) — Render &times; 1 and Tokenize &times; 1
- [`#**2`](./markup.html#**2) — Render &times; 2 and Tokenize &times; 1
- [`#**0`](./markup.html#**0) — Render &times; 0 and Tokenize &times; 1
- [`#*100**0`](./markup.html#*100*0) — Render &times; 0 and Tokenize &times; 100
- [`#*2**2`](./markup.html#*2**2) — Render &times; 2 and Tokenize &times; 2

</figure>

</details>

---

## Noteworthy Aspects

### Matcher-based Grammar (aka [`@smotaal/matcher`](./packages/matcher/README.md))

The second generation matcher-based experimental tokenizer designs, inspired by [erights/quasiParserGenerator](https://github.com/erights/quasiParserGenerator). Efforts on way to refactor this into it's own separate package — [source code](https://github.com/SMotaal/markup/tree/master/packages/matcher/).

- [Matcher-based JSON](./experimental/json/)
- [Matcher-based ECMAScript](./experimental/es/)

### Classic Grammar (aka [`@smotaal/grammar`](./packages/grammar/README.md))

The original extensible and declarative grammars. While my experimental efforts have since concluded, these heavily-refined first-approximation grammars see uses in [other project(s)](https://www.smotaal.io/markout 'Markout') — [source code](https://github.com/SMotaal/markup/tree/master/packages/grammar/).

### Markup Core (aka [`@smotaal/tokenizer`](./packages/tokenizer/README.md))

The second generation tokenizer architecture, optimized for both Classic and Matcher-based grammars — [source code](https://github.com/SMotaal/markup/tree/master/packages/tokenizer/).

### Compositional DOM (aka [`pseudom`](./packages/pseudom/README.md))

The minimalistic isomorphic compositional DOM used to render tokenized markup — [source code](https://github.com/SMotaal/markup/tree/master/packages/pseudom/).

---

All my experimental work is intended to remain open and freely available, with the one obvious expectation of fair attribution where used.
