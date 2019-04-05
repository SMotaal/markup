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

## Demo

```
markup.html#‹specifier›!‹mode›*‹iterations›**‹repeats›
```

<blockquote>

**Notes**

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

</blockquote>

#### Examples

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
