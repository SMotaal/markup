# SMotaal's Tokenizer

Nestable syntax tokenizer using Regular Expressions.

**What it tries to do**

- Provide simplified mechisms for defining syntaxes.
- Provide a way to work with tokens directly from strings.

**What it does NOT try to do**

- Everything else for now

> **Important Note:** This package is designed for ECMAScript module supporting runtimes, including all major browsers and Node.js 12 or later.

## Important Changes

_v0.0.6_

- Switch to `@smotaal/pseudom` scoped distribution.
- Refactor `extensions/dom.js` to `export default new class {}`
- Cleanup extensions and related documentation
- Rename source entries using `tokenizer‹.variant›*.js`
- Cleanup implementation and examples
- Introduce `experimental` tokenizer variants from `lib/experimental`

_v0.0.5_

- Refactor grammars into a separate package.
- Remove `dist/extensions/` bundles
- Expose dom and grammar helpers directly `dist/tokenizer.browser.js`

_v0.0.4_

- Rename ECMAScript module sources to `.js` instead of `.mjs`.
- Add minimal `node/loader.mjs` for experimental Node.js mode.

_v0.0.3_

- Refactor source files for optimal bundling with `rollup`.
- Add `dist/` with multiple dist `umd` and `esm` bundles.

## Getting Started

<figcaption><b>Single-Mode</b></figcaption>

```js
import {Parser} from '@smotaal/tokenizer/tokenizer.js';
import {javascript} from '@smotaal/grammars/javascript/javascript-grammar.js';

const parser = new Parser();
export const {modes, mappings} = parser;
parser.register(javascript);

parser.tokenize('/* source */', {sourceType: 'javascript'});
```

<figcaption><b>Extended-Mode</b></figcaption>

```js
import {Parser, extensions} from '@smotaal/tokenizer/tokenizer.extended.js';
const parser = new Parser();

export const {modes, mappings} = parser;

for (const id in extensions.modes) parser.register(extensions.modes[id]);

parser.tokenize('/* source */', {sourceType: 'javascript'});
```

## Demo

You can see a [live demo](https://www.smotaal.io/markup/markup) or serve it locally from [examples/browser/index.html](./examples/browser/index.html).

<figure>

<figcaption><i>Parameters</i></figcaption>

```url example
examples/browser/#‹specifier›!‹mode›*‹iterations›**‹repeats›
```

<b>`#`</b><tt>‹specifier›</tt>

- `#` followed by a relative URL
- `#https://` followed by an absolute URL
- `#unpkg:` followed by package or module path
- `#cdnjs:` followed by package or module path

<b>`!`</b><tt>‹mode›</tt>

- `!es` JavaScript
- `!css` CSS
- `!html` HTML
- `!md` Markdown

<b>`*`</b><tt>‹iterations›</tt>

- repeats the tokenization of the source text

<b>`**`</b><tt>‹repeat›</tt>

- repeats the tokenized (and rendered) source text

</figure>
