# SMotaal's Grammars

Regular expression markup grammars.

These grammars represent the set of barebone elements needed for fine-enough grained parsing with a one-size-fits semi-contextual tokenizer. Naturally, they rely on abstractions that do not currently have a well-defined conceptual paradigm.

<blockquote>

**Note**: All grammars are not yet stable.

These grammars are constantly being revised to meet experimental requirements of [`@smotaal/tokenizer`](https://github.com/smotaal/markup/tree/master/packages/tokenizer/). They do not conform to any particular specifications at the moment.

</blockquote>

That said, they have been used reliably and responsibly to build the prototype of the Markout client-side engine I use on my own site.

## `JS` JavaScript

- `javascript-grammar` aims for spec-level granularity.
- `javascript-extended-grammar` intends to go rouge.
- `typescript-grammar` is there to make `markout` happy.

## `HTML` Hypertext Markup Language

- `html-grammar` aims for spec-level granularity.

## `CSS` Cascading Style Sheets

- `css-grammar` is there to make `html-grammar` happy.

## `MOMD` Markout-Markdown

- `markdown-grammar` is there to make `markout` happy.
