# Markup (_Experimental_) <span float-right>[<kbd>GitHub</kbd>](https://github.com/SMotaal/markup) [<kbd>Updates</kbd>](./updates.html)</span>

Semi-contextual parsing experiments, which fall somewhere between the scope of regular expressions and the more much more advanced realms of source code parsing.

**FYI**: Markup is undergoing refactoring to release [@SMotaal/tokenizer](./packages/@smotaal/tokenizer/README)

## Scope

**What it aims to accomplish**

- Scan and Highlight various standard formats (like HTML, CSS, JS, JSON... etc).
- Provide simplified mechisms for defining syntaxes.
- Generate a single scan for multiple operations.
- Allow extended modeling of modifications.

**What it does not try to do**

- Anything the runtime would do anyway, like:
  - Parse malformed/unbalanced expressions.
  - Code validation or error checking.

## _./markup.html_ — fetches, scans and renders source texts

### Parameters

**Notation**

```
markup.html#‹specifier›!‹mode›*‹repeat›**‹iterations›
```

**Note**: The order of the parameters is manadatory, but all parameters are optional.

1. Resource specifier can either be one of the hard-wired presets, a valid url or a bare specifier with `unpkg:` or `cdnjs:` prefixes
2. You can force the parsing mode by adding `!‹mode›`
3. You can force repetitive rendering by adding `*‹repeat›`
4. You can also iterate just through the tokenizing logic to time that without the additional cost of rendering.

**Specifiers**

[unpkg.com/acorn]: ./markup.html#https://unpkg.com/acorn 'Preview markup from https://unpkg.com/acorn'
[~/lib/tokenizer.js]: ./markup.html#~/lib/tokenizer.js 'Preview markup from ./packages/@smotaal/tokenizer/lib/tokeinzer.js'

<figure>

- [`#https://unpkg.com/acorn`][unpkg.com/acorn]
- [`#~/lib/tokenizer.js`][~/lib/tokenizer.js]

</figure>

**Modes**

<figure>

_Syntax Modes_ — `html`, `css`, and `js` (aka `es` or `javascript`)

> **FYI**: Using other modes can be useful if content-type detection fails

- [`#markup.html!html`](./markup.html#markup.html!html)
- [`#markup.css!css`](./markup.html#markup.css!css)
- [`#lib.markup.js!js`](./markup.html#lib/markup.js!js)

---

_Useful Presets_ — hard-wired convenience samples

- [`#es`](./markup.html#es)
- [`#html`](./markup.html#html)
- [`#css`](./markup.html#css)
- [`#md`](./markup.html#md)

---

_Special Mode & Presets_ — research related samples

- [`#acorn-esm`](./markup.html#acorn-esm) — EMCAScript® module features
- [`#acorn-cjs`](./markup.html#acorn-cjs) — CommonJS module features
- [`#acorn-cjs!esx`](./markup.html#acorn-cjs!esx) — EMCAScript® and CommonJS module features

</figure>

**Repeats & Iterations**

<figure>

- [`#`](./markup.html#) — Render &times; 1 and Tokenize &times; 1
- [`#*2`](./markup.html#*2) — Render &times; 2 and Tokenize &times; 1
- [`#*0`](./markup.html#*0) — Render &times; 0 and Tokenize &times; 1
- [`#*0**100`](./markup.html#*0**100) — Render &times; 0 and Tokenize &times; 100
- [`#*2**2`](./markup.html#*2**2) — Render &times; 2 and Tokenize &times; 2

</figure>
