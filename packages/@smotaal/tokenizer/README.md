# SMotaal's Tokenizer

Nestable syntax tokenizer using Regular Expressions.

<table><tr><td>

**Supported Platforms**

This package uses `.js` extensions for ECMAScript modules supported by all up-to-date versions of most modern browsers, specifically Chrome, Safari, Firefox. <span><details><summary>Testing in Node.js with <code>--experimental-modules</code> mode</summary>

For supporting Node.js versions, you can use this package by opting to use the `--experimental-modules --loader @smotaal/tokenizer/node/loader.mjs` approach intended to only be used for experimental work.

If you use your own custom loader, you can configure it to resolve `.js` files in this package for files that do not have a sibling `.mjs` file as `format: 'esm'` (dual formats should mostly be restricted to the `dist` folder in general).

Please note that no efforts are intended to make this package operational with tooling commonly used to down-transpile code for runtimes that do not natively support ECMAScript modules. If you use this path and it works, it will likely not behave as intended leading to issues that I am not able to address.

</details></span></td></tr><tr><td>

**Important Changes**

*v0.0.4*
- Rename ECMAScript module sources to `.js` instead of `.mjs`.
- Add minimal `node/loader.mjs` for experimental Node.js mode.

*v0.0.3*
- Refactor source files for optimal bundling with `rollup`.
- Add `dist/` with multiple dist `umd` and `esm` bundles.

</details></td></tr></table>

**Why?**

While Regular Expressions can be confusing to work with sometimes, they come with certain optimization benefits that can be leveraged to minimize overhead costs for scanning texts. While some argue against their ability to safely guard against malicious patters, this argument equally applies to any and all existing ways of scanning texts. The problem is not Regular Expressions, it is simply those particular regular expressions that not well guarded.

**What it tries to do**

- Provide simplified mechisms for defining syntaxes.
- Provide a way to work with tokens directly from strings.

**What it does NOT try to do**

- Everything else for now

**Getting Started**

> **Multi-Mode**
>
> ```js
> import {Parser, extensions} from '@smotaal/tokenizer/extended.js';
>
> const parser = new Parser();
> export const {modes, mappings} = parser;
> for (const id in extensions.modes) parser.register(extensions.modes[id]);
>
> parser.tokenize('/* source */', {sourceType: 'javascript'});
> ```

> **Single-Mode**
>
> ```js
> import {Parser} from '@smotaal/tokenizer/tokenizer.js';
> import {javascript} from '@smotaal/tokenizer/modes/javascript.js';
>
> const parser = new Parser();
> export const {modes, mappings} = parser;
> parser.register(javascript);
>
> parser.tokenize('/* source */', {sourceType: 'javascript'});
> ```

**Documentation** (_in progress_)

At the moment, you can read the on going drafts for:

- [Concepts](./docs/Concepts.md)

**Demo**

You can see a [live demo](https://smotaal.github.io/markup/packages/@smotaal/tokenizer/examples/browser/) or serve it locally from [examples/browser/index.html](examples/browser/index.html).

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

<b>\*</b>`repeat`

- repeats the tokenized (and rendered) source text

<b>\*\*</b>`iterations`

- repeats the tokenization of the source text
