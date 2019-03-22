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

- Operate on invalid code (or minified code for now).

## _./markup.html_ — fetches, scans and renders source texts

### Parameters

**Notation**

<pre>markup.html#<samp>specifier</samp>!<samp>mode</samp>&#42;<samp>repeat</samp>&#42;&#42;<samp>iterations</samp></pre>

**Specifiers**

<figure>

- [#lib/markup.js](./markup.html#lib/markup.js)
- [#https://unpkg.com/acorn](./markup.html#https://unpkg.com/acorn)

</figure>

**Modes**

<figure>

_Automatic Mode_ — per content-type or preset

- [#markup](./markup.html#markup) <kbd>auto=es</kbd>
- [#markup.html](./markup.html#markup.html) <kbd>auto=html</kbd>
- [#markup.css](./markup.html#markup.css) <kbd>auto=css</kbd>
- [#README.md](./markup.html#README.md) <kbd>auto=md</kbd>

---

_Syntax Modes_ — `html`, `css`, and `js` (aka `es` or `javascript`)

- [#markup.html!html](./markup.html#markup.html!html) <kbd>html</kbd>
- [#markup.css!css](./markup.html#markup.css!css) <kbd>css</kbd>
- [#lib.markup.js!js](./markup.html#lib/markup.js!js) <kbd>es</kbd>

---

_Inspection Modes_ — `esm`, `cjs`, `esx`

- [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd> — EMCAScript® Module features
- [#acorn-cjs](./markup.html#acorn-cjs) <kbd>preset=cjs</kbd> — CommonJS Module features
- [#acorn-cjs!esx](./markup.html#acorn-cjs!esx) <kbd>esx</kbd> — EMCAScript® and CommonJS Module features

</figure>

**Iterations**

<figure>

- [#markup](./markup.html#markup) — Render &times; 1 and Tokenize &times; 1
- [#markup\*2](./markup.html#markup*2) — Render &times; 2 and Tokenize &times; 1
- [#markup\*0](./markup.html#markup*0) — Render &times; 0 and Tokenize &times; 1
- [#markup\*0\*\*100](./markup.html#markup*0**100) — Render &times; 0 and Tokenize &times; 100
- [#markup\*2\*\*2](./markup.html#markup*2**2) — Render &times; 2 and Tokenize &times; 2

</figure>

**Presets**

<figure>

- [#markup](./markup.html#markup) <kbd>auto=es</kbd>
- [#acorn](./markup.html#acorn) <kbd>auto=es</kbd>
- [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd>
- [#acorn-cjs](./markup.html#acorn-cjs) <kbd>preset=cjs</kbd>
- [#esprima](./markup.html#esprima) <kbd>auto=es</kbd>
- [#babel](./markup.html#babel) <kbd>auto=es</kbd>

</figure>
