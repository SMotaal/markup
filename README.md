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

**Notation**

> <code>#[<b>url</b>]![<b>mode</b>]*[<b>replicates</b>]**[<b>iterations</b>]</code>

**Syntax Modes** — html, css, es (js or javascript)

> [markup.html#./markup.html!html](./markup.html#./markup.html!html)
>
> [markup.html#./markup.css!css](./markup.html#./markup.css!css)
>
> [markup.html#./lib.markup.js!js](./markup.html#./lib.markup.js!js)

**Additional Modes** — esm, cjs, esx, (syntax detection model)

**Specifiers** — URL or "bare" specifiers

> [markup.html#https://unpkg.com/acorn](./markup.html#https://unpkg.com/acorn)
>
> [markup.html#./lib/markup.js](./markup.html#./lib/markup.js)
>
> [markup.html#markup](./markup.html#markup)
>
> [markup.html#acorn](./markup.html#acorn)
>
> [markup.html#acorn-esm](./markup.html#acorn-esm)
>
> [markup.html#acorn-cjs](./markup.html#acorn-cjs)
>
> [markup.html#esprima](./markup.html#esprima)
>
> [markup.html#babel](./markup.html#markup)

**Other Parameters**
>
> [markup.html#markup!es*0**10](./markup.html#markup!es*0**10)
>
> [markup.html#markup!html**100](./markup.html#markup!html**100)
>
> [markup.html#markup!esm*2**10](./markup.html#markup!esm*2**10)


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
