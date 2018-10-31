# Markup (_Experimental_)

Semi-contextual parsing experiments, which fall somewhere between the scope of regular expressions and the more much more advanced realms of source code parsing.

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

> **Notation**
>
> > <pre>markup.html#<samp>specifier</samp>!<samp>mode</samp>*<samp>repeat</samp>**<samp>iterations</samp></pre>
>
> **Specifiers**
>
> > [#./lib/markup.js](./markup.html#./lib/markup.js)
> >
> > [#https://unpkg.com/acorn](./markup.html#https://unpkg.com/acorn)
>
> **Modes**
>
> > _Automatic Mode_ — per content-type or preset
> >
> > [#markup](./markup.html#markup) <kbd>auto=es</kbd>
> >
> > [#./markup.html](./markup.html#./markup.html) <kbd>auto=html</kbd>
> >
> > [#./markup.css](./markup.css#./markup.css) <kbd>auto=css</kbd>
>
> > _Syntax Modes_ — `html`, `css`, and `js` (aka `es` or `javascript`)
> >
> > [#./markup.html!html](./markup.html#./markup.html!html) <kbd>html</kbd>
> >
> > [#./markup.css!css](./markup.html#./markup.css!css) <kbd>css</kbd>
> >
> > [#./lib.markup.js!js](./markup.html#./lib.markup.js!js) <kbd>es</kbd>
>
> > _Inspection Modes_ — `esm`, `cjs`, `esx`
> >
> > [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd> — EMCAScript® Module features
> >
> > [#acorn-cjs](./markup.html#acorn-cjs) <kbd>preset=cjs</kbd> — CommonJS Module features
> >
> > [#acorn-cjs!esx](./markup.html#acorn-cjs!esx) <kbd>esx</kbd> — EMCAScript® and CommonJS Module features
>
> **Iterations**
>
> > [#markup](./markup.html#markup) — Render&times;1 and Tokenize&times;1
> >
> > [#markup\*2](./markup.html#markup*2) — Render&times;2 and Tokenize&times;1
> >
> > [#markup\*0](./markup.html#markup*0) — Render&times;0 and Tokenize&times;1
> >
> > [#markup\*0\*\*100](./markup.html#markup*0**100) — Render&times;0 and Tokenize&times;100
> >
> > [#markup\*2\*\*2](./markup.html#markup*2**2) — Render&times;2 and Tokenize&times;2
>
> **Presets**
>
> > [#markup](./markup.html#markup) <kbd>auto=es</kbd>
> >
> > [#acorn](./markup.html#acorn) <kbd>auto=es</kbd>
> >
> > [#acorn-esm](./markup.html#acorn-esm) <kbd>preset=esm</kbd>
> >
> > [#acorn-cjs](./markup.html#acorn-cjs) <kbd>preset=cjs</kbd>
> >
> > [#esprima](./markup.html#esprima) <kbd>auto=es</kbd>
> >
> > [#babel](./markup.html#babel) <kbd>auto=es</kbd>

## Packages

The following are extracted packages which can serve other potential work.

### pseu·dom

This package extracts the APIs used to provide a mirrored pipeline to compose DocumentFragments in workers. Due to the improved performance and modularity, a shift to a more complete implementation that could be use in the main thread, workers, and Node.js was more than justified. See [packages/pseudom](./packages/pseudom/) for details.

### perpetra

This package provides free fall alternatives to common tooling functions. It is more of a philosophy than actual code at the moment. This philosophy states that a particular functionality should be decoupled from any other, including ones that make the functionality more functional, so long as the functionality is implemented to be adequately functional without depending on another and it is designed to be extended by another without depending on a particular loading mechanism. Yeah, it's best to wait on this one.

### perpet·ui

This package takes a perpetra philosophy into the paradigm of Web Components.

## Updates

> ### 2018
>
> **_September_**
>
> After exploring the paradigm of implementations dealing with markup and the resulting rants, a motivation for a new take on this topic resulted in the Markup experiment.
>
> > **Problem Space**
> >
> > The goal is to avoid the obvious pitfalls of coupling creative problem solving with one particular tool (like ASTs).
> >
> > While they often times result in improved solutions down the road, they make it impossible to actually break from limitations of such tools. More importantly, they shift the focus from the actual problem space to that of the tool.
>
> > **Symbols and Patterns**
> >
> > Those are essentially the two building blocks of any markup.
> >
> > Symbols are notoriously ambigious in their definition, but here, symbols are basically one or more characters of a unique and constant order, occuring in a place to be expected. Patterns are just like symbols, except they interlace with entities which are either not constant or not unqiue, or both.
> >
> > A symbol translates to a sequence. A pattern translates to a group of many sequences or groups. This implies that only symbols will have tokens, and patterns may need other abstractions (like AST nodes).
> >
>
> **_October_**
>
> Now we have a good starting point for a playground, it looks just like another highlighter, it can be if you want, but it is not. Highlighting is just the best way to debug all things markup.
>
> > **Tokens and Fragments**
> >
> > Those are roughly the two pipelines often used to deal with markup.
> >
> > Tokens are source aspects, not merely the stream of characters, but rather the stream resulting from any level of syntax-related segementation. Fragments come from the other end of the chain, they are generated from tokens, their particular purposes range from basic rendering (highlighters) to any number of things.
> >
> > Those two streams are fundamentally how markup is handled today, actually names notwithstanding. While it is easier to suppose that tokenization is where the bulk of waste can take place, it is interesting to note that packages often shy away from downstream access to this process.
> >
> > The myths are many, so the thought that its optimized code that is too complex for anyone to fiddle around with, I guess is a nice way of passively saying to developers that you can be creative but you are not clever enough to actually do it without our magic. So, naturally I explored inverting control of this pandora, taking out the synchronous iteration and replacing it with an iterable.
> >
> > That is to say, your tokenizer does not incure any overhead, including ones related to syntaxes that have not yet been initialized, until your downstream processing of a fragment is ready to pull the next token. A mouth full best explained through the following example of a baseline fragmenter that performs on par with most eager tokenizers out there:
> >
> > ```js
> > export const skim = tokens => Array.from(tokens);
> > ```
> >
> > This creates a fragment which is the array of all tokens, which makes this pipeline identical in principle to that of the synchronous iteration of an eager tokenizer scanning the same source.
> >
> > With this, tokenization really takes the form of a stream, it literally reads from a stream and pipes into another. It is not asynchronous per say, because while source streams may be asynchronous, tokenization should decouple from any such burdens which better factors in the problem domain of fragments. When it's source starts, so does the tokenizer, when it's source pauses, so does the fragment's attempts to pull tokens, until it resumes and eventually concludes.
