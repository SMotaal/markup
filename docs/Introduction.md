# Markup Experiments by Saleh Abdel Motaal

## About the Author

As developers often discover, we each have particular aspect that pull us in irrespective of the project we are working on. Markup has always been one such aspect which I am fascinated by deeply. Over the past few years, while experimenting with the new features of ECMAScript, I felt that how we process code today feels like it has not changed with how the language itself has evolved.

Some will validly argue that tooling which deals with code needs to work with legacy runtimes, however, I am inclined to thing differently. At the very least, I feel that this argument should not prevent us from looking at new ways to process markup, especially if we can use those very same tools to recompile our implementations down to make them work in such legacy environments.

It took me at least two years to understand and appreciate in depth the various language features which were maturing from ES2015 onwards. Amoung those are obviously the additions to RegExp and everything related to the Iterator protocol, and just like markup, the easily discouraging topic of Generators kept pulling me in.

## Scope

Markup can loosely describe a number of things. Commonly, it is used to refer to the contents we put in some files, like HTML. Less commonly, it is used to refer to highlightable syntaxes. Here, markup broadly refers to texts in which patterns have certain meanings, ie particular syntaxes, and with which it can be parsed, analyzed, and transformed.

*Relating to Syntax*

Syntax is sometimes loosely used to refer to patterns of code. Less commonly, it refers to the set of rules with which a text is produced or consumed. Here, syntax strictly refers to either the name associated with such rules as well as those specific set of rules which can be reduced to declarative data structures and may include deterministic algorithms, excluding by definition all volatile structures and non-determinisitic logic.

By such stipulations, markup and syntax are not synonyms, they are merely related and in large they both relate to many shared concepts. However, while syntax is rooted in linguistics, markup in distinction is more oriented towards the modeling and processing dimensions of text efficiently and effectively.

*Relating to Markup Languages (ML)*

Markup Languages are languages used to declaratively compose texts which rely on nested syntaxes to inline non-textual features such as formatting, sematic artifacts, as well as embed or linked rich media content.

While the syntaxes of ML versus non-ML languages often differ significantly, such differences hardly factor in when contrasted from a markup perspective.

*Relating to Parsing*

Parsing loosely refers to the systematic and deterministic processing of sequential data streams in order to efficiently achieve a specific intent.

In the realm of markup, a singular intent for parsing is assumed, which is to segment texts into meaningful tokens allowing them to be further processed to efficiently achieve a wider range of intents.

While parsing generally relies on intent-driven models, like syntax trees, markup parsing produces a linear stream of tokens, which serves as the lowest layer on top of which one can model a virtually infinite set of structures.

*Relating to Tokenization*

In markup, texts are segmented into non-overlapping sequences of one or more characters, arbitrarily determined by some prescribed effective tokenization mode.

Modes in markup refer to the volatile state for a given parsing goal. One class of modes deals with the top level rules of a particular syntax, like EMCAScript, CSS, or HTML… etc. Additional classes of modes are nested into each syntax to augment or replace rules which apply to nested sequential groupings marked by opening and closing rules.

Sequences make it possible to efficiently handle contextual patterns, like escaped sequences, punctuators, whitespace, keywords, literals and other expressions which occure within a mode, including the openers of other modes and the closer of the current one.

Groupings making it possible to effectively handle contextual patterns, like quotes, comments, and closures, as well as other complex or ambigious patterns which do not translate easily to regular expressions.

The ideal way to capture patterns also depends on the parent modes within which they occure, the inherent potential for finer granuality... etc. For instance, regular expressions can theoretically be captured as sequences or groupings denoted by the first and last `/` characters, both of which may even be equally effective from an implementation standpoint. The ideal way becomes obvious only with the consideration of the parent modes in which they will be captured.

*Relating to Language Specifications*

While markup has no direct relation to specifications like ECMAScript, it is theoretically feasible to construct modes that can adhere to such specification.

Some concepts like closures, comments, quotes… etc., may not directly translate to the same markup classifications as those described in specifications, which normally convey syntactical classications instead.

In essence, specification compliance is more suitably addressed in higher layers of markup structures where non-linear parsing can take place.

## Experimental Design

**Why I ended up using Generators**

I was fascinated by Generators, and while I found them initially slow, I eventually discovered that they continue to receive a lot of attention from the optimization folks who work on JSC, SpiderMonkey, and more so for V8 which powers Chrome and Node.js today. Between those engines which power over 90% of today's ecosystem, one can now challenge popular myths about Generates and try to argue that an implementation that is designed to make use of Generators can be desirable and not only on it's code clarity but also on performance and memory footprint.

So just like markup, Generators kept pulling me in. But those things are extremely complicated to learn and once you stop using them you can forget things. So you end up having to relearn things and in every time I did I always discovered things. Some are things I just I missed before, others were subtle changes in implementations, refinements made to the specification, not to mention the many additions made in subsequent years.

Maybe I am not ready to argue that Generators should be something that everyone uses. I am certainly arguing that those who only avoid them due to performance concerns should continue to experiment sparesly. In doing that, you may gain deeper insights on how code optimization can be leveraged in this completely different paradigm. More importantly, you will end up discovering completely new ways to structure complicated algorithms, like those used to deal with markup, and be able to reason about very complicated problems faster, in greater depth, amoung other things that spell out appreciation for a problem solver like yourself.
