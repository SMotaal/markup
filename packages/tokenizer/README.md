# SMotaal's Tokenizer

Nestable syntax tokenizer using Regular Expressions.

**What it tries to do**

- Provide simplified mechisms for defining syntaxes.
- Provide a way to work with tokens directly from strings.
- Provide a highlighter-inspired WYSIWYG for debugging.

**What it does NOT try to do**

- Everything else for now

> **Important Note:** This package is designed for ECMAScript module supporting runtimes, including all major browsers and Node.js 12 or later.

See [<samp>Changelog</samp>][changelog].

## Getting Started

<figcaption><b>Single-Mode</b></figcaption>

```js
import {Parser} from '@smotaal/tokenizer/tokenizer.js';
import {javascript} from '@smotaal/grammar/javascript/javascript-grammar.js';

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

You can see a [live demo](https://smotaal.io/markup/markup).

<figure>

<figcaption><i>Parameters</i></figcaption>

```url example
examples/browser/#‹specifier›!‹mode›*‹iterations›**‹repeats›
```

<b>`#`</b><samp>‹specifier›</samp>

- `#` followed by a relative URL
- `#https://` followed by an absolute URL
- `#unpkg:` followed by package or module path
- `#cdnjs:` followed by package or module path

<b>`!`</b><samp>‹mode›</samp>

- `!es` JavaScript
- `!css` CSS
- `!html` HTML
- `!md` Markdown

<b>`*`</b><samp>‹iterations›</samp>

- repeats the tokenization of the source text

<b>`**`</b><samp>‹repeat›</samp>

- repeats the tokenized (and rendered) source text

</figure>

[package:repository]: https://github.com/SMotaal/markup/tree/master/packages/tokenizer
[changelog]: ./CHANGELOG.md
