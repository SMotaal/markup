# SMotaal's Tokenizer

Nestable syntax tokenizer using Regular Expressions.

> **Note:** This package uses `.mjs` extensions to work with `--experimental-modules` in Node.js

**Why?**

While Regular Expressions can be confusing to work with sometimes, they come with certain optimization benefits that can be leveraged to minimize overhead costs for scanning texts. While some argument against their ability to safely guard against melicious patters, this argument equally applies to any and all existing ways of scanning texts. The problem is not Regular Expressions, it is simply those particular regular expressions that not well guarded.

**What it tries to do**

- Provide simplified mechisms for defining syntaxes.
- Provide a way to work with tokens directly from strings.

**What it does NOT try to do**

- Everything else for now

**Demo**

You can see a [live demo](https://smotaal.github.io/experimental/markup/packages/tokenizer/examples/browser/) or serve it locally from [examples/browser/index.html](examples/browser/index.html).

You can set different options in the following order:

    index.html#specifier!mode*repeat**iterations

<b>#</b>`specifier`
  - `#` followed by a relative URL
  - `#https://` followed by an absolute URL
  - `#unpkg:` followed by package or module path
  - `#cdnjs:` followed by package or module path

<b>!</b>`mode`
  - `!es` JavaScript
  - `!css` CSS
  - `!html` HTML
  - `!md` Markdown

<b>&#42;</b>`repeat`
  - repeats the tokenized (and rendered) source text

<b>&#42;&#42;</b>`iterations`
  - repeats the tokenization of the source text
