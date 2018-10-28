# Markup (_Experimental_)

Semi-contextual parsing experiments, which fall somewhere between the scope of regular expressions and the more much more advanced realms of source code parsing.

## Scope

**What it aims to accomplish**

- Scan and Highlight various standard formats (like HTML, CSS, JS, JSON... etc).
- Provide simplified mechisms for defining syntaxes.
- Generate a single scan for multiple operations.
- Allow extended modeling of modifications.

**What it does not try to do?**

- Operate on invalid code (or minified code for now).

## Experiments

### _./markup.html_ — fetches and highlights sources

**Fragments**

<pre>#<samp>specifier</samp>!<samp>mode</samp>*<samp>repeat</samp>**<samp>iterations</samp></pre>

**Syntax Modes** — html, css, es (js or javascript)

> [#./markup.html](./markup.html#./markup.html!html) <kbd>auto=html</kbd>
>
> [#./markup.html!html](./markup.html#./markup.html!html) <kbd>html</kbd>
>
> [#./markup.css!css](./markup.html#./markup.css!css) <kbd>css</kbd>
>
> [#./lib.markup.js!js](./markup.html#./lib.markup.js!js) <kbd>es</kbd>

**Additional Modes** — esm, cjs, esx, (syntax detection model)

> *SourceText scanner — <kbd>esm</kbd>*
>
> [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd>
>
> [#acorn-cjs!esm](./markup.html#acorn-cjs!esm) <kbd>esm</kbd>
>
> [#https://unpkg.com/acorn!esm](./markup.html#https://unpkg.com/acorn!esm) <kbd>esm</kbd>

**Specifiers** — URL or "bare" specifiers

> [#https://unpkg.com/acorn](./markup.html#https://unpkg.com/acorn) <kbd>auto=es</kbd>
>
> [#./lib/markup.js](./markup.html#./lib/markup.js) <kbd>auto=es</kbd>
>
> [#markup](./markup.html#markup) <kbd>auto=es</kbd>
>
> [#acorn](./markup.html#acorn) <kbd>auto=es</kbd>
>
> [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd>
>
> [#acorn-cjs](./markup.html#acorn-cjs) <kbd>preset=cjs</kbd>
>
> [#esprima](./markup.html#esprima) <kbd>auto=es</kbd>
>
> [#babel](./markup.html#babel) <kbd>auto=es</kbd>

**Rendering**
>
> [#markup&#42;1](./markup.html#markup!es*1) <kbd>es</kbd> (on)
>
> [#markup&#42;0](./markup.html#markup!es*0) <kbd>es</kbd> (off)

**Benchmarking**
>
> [#markup!esm&#42;0&#42;&#42;100](./markup.html#markup!esm*0**100) <kbd>html</kbd>

</center>

<!--

## Ideas

Markup can be broken down into two main concepts, sequences and groupings.

### Sequences and Groups

Sequences are meaningful symbols in the right context. Groupings provide
the context from which sequences can be infered.

In turn, sequences that become meaningful will continue to affect the meaning of the ones that follow, leading to other sequences indicating the end of their the current grouping or ones before that indicating the start of nested groupings, or ones that are not expected at all, the meaning of which shall still be somehow assumed.

> **Example**: A JavaScript source inhrently starts with that context, the curly
> braces sequence in that context determines the grouping nature to follow,
> the grouping in turn determines the context… and so on.

Precedence and relevance can affect the significance of certain sequences
in different contexts. Yet, the bulk of sequences used in most popular
languages can in fact be ecompassed in simple efficient expressions.

Grouping on the other hand is where modeling often gets tricky and results
in hard to reason about structures that often lead to inefficiencies.


https://cdnjs.com/libraries/babel-core
  https://cdnjs.cloudflare.com/ajax/libs/babel-core/6.1.19/browser.js
  https://cdnjs.cloudflare.com/ajax/libs/babel-core/6.1.19/browser.min.js

https://cdnjs.com/libraries/popper.js
  https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.4/esm/popper.js

https://cdnjs.com/libraries/xregexp
  https://cdnjs.cloudflare.com/ajax/libs/xregexp/3.2.0/xregexp-all.js
  https://cdnjs.cloudflare.com/ajax/libs/xregexp/3.2.0/xregexp-all.min.js

Stupid
  https://raw.githubusercontent.com/lappang-cheung/pholio/master/lib/api/routes/profile.js!javascript
-->
