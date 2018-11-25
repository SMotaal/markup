# SMotaal's Tokenizer Concepts

## Sequences

The smallest constructs of this tokenizer design are sequences, which are the set of every chain of one or more characters that are _potentially meaningful_ for a given stream of text to be scanned.

### `Words` ／<samp>\b[\p{𝙸𝙳_𝚂𝚝𝚊𝚛𝚝}][\p{‌𝙸𝙳_𝙲𝚘𝚗𝚝𝚒𝚗𝚞𝚎}]\*\b</samp>／

| `Words`       | Alphanumeric sequences                       |
| ------------- | -------------------------------------------- |
| `Keywords`    | Defining a structure<sup>\*</sup>            |
| `Identifiers` | Following a defined structre                 |
| `Symbols`     | Representing a special quantity or reference |

_\* Keywords refer to a predefined set of words which may be classified as keywords, operators, modifiers... etc. in the official grammars of a given syntax._

**`Keywords`**

Keywords are a prescribed set of words, which, in the context of markup, are only there to define a syntax structure.

In languages like JavaScript, the keyword `function` and the class `Function` are separate words. However, there can be languages that have an overlap between a keyword and the binding name to it's respective builtin representation which would be chosen carefully to lend to a synthetic style that is syntactically disambigious.

In rare case, there will be languages with syntaxes that will unintentionally lead to cases where a keyword and binding name may overlap and maybe even wiuthout syntactical disambiguity, where it is left to the mechanics of the language sort such confusions, beyond the purview of tokenization nonetheless.

The important thing to note though is that a keyword from a tokenizer's perspective may be different from what the language references themselves are choosing to refer to as keywords. In many of them, keywords are a subset of the Keywords used here which includes those keywords and other words like reserved words and even operator words, but not words that are Symbols (below).

**`Identifiers`**

Identifiers are non-prescribed words which follow a set of rules:

1. They must be declared and sometimes this is as simple as assigning to them.

2. They can be assigned to (constants don't fall in the tokenizer's purview).

3. They can be referenced directly or indirectly.

4. They can be used as values or assigned by reference to other identifiers.

**`Symbols`**

Many languages also have a prescribed set of words which follow some of the rules of identifiers. This applies to a degree to the class `Function` in JavaScript, however, some better examples may include `this` and `arguments`.

A distinction will exist between symbols that are constants of a particular scope and symbols that are overridable, like in JavaScript, where `Function` `undefined` are merely identifiers cascading into the current scope, which unless otherwise defined in a parent scope refer directly to properties of the global object.

While setting a hard separation between Symbols and Identifiers is a slippery slope, it is useful to abort on early errors in invalid syntaxes. But simply adding a word to Symbols does not attribute to it any reserved qualities during lexing.

### `Literals` ／<samp>\b\w+\b|[\p{Ps}"].\*[\p{Pc}"]</samp>／

| `Literals`    | Special sequence patterns                    |
| ------------- | -------------------------------------------- |
| `Numbers`     | Representing a specific quantity             |
| `Strings`     | Representing a static text<sup>\*</sup>      |
| `Expressions` | Representing special expressions (ie RegExp) |

_\* Strings including interpolations are groups and not literals._

**`Numbers`** (_literal_)

Languages usually include more than one notation for numbers, sharing the same qualities for pattern matching that make them easy to test against regular expressions. If this is not the case, then those numbers are not considered literals and more likely than not they are are not sequences.

**`Strings`** (_literal_)

Literal strings are a special subset of Strings which have the following qualities:

1. They start with a quote and end with quote (same or different).

2. The end quote may not appear inside the string (or is escaped).

3. They do not include spans (only literal references).

**`Expressions`** (_literal_)

Literal expressions are primarily used for Regular Expressions or Set Notations.

### `Punctuators` ／<samp>\p{Ps}.\*\p{Pc}</samp>／

| `Punctuators`    | Qualified characters defining the boundaries         |
| ---------------- | ---------------------------------------------------- |
| `Nonbreakers`    | Marking a continuation of a construct                |
| `Breakers`       | Marking the end of a construct                       |
| 1. `Openers`     | Marking the opening boundary of a nested context     |
| 2. `Closers`     | Marking the closing boundary of a nested context     |
| `Operators`      | Marking associations between constructs<sup>\*</sup> |
| 1. `Assigners`   | Marking the sides of an assignment construct         |
| 2. `Combinators` | Marking the side(s) of a quantitative construct      |

_\* Constructs refer to isolated, associated and/or groupped expressions_

**`Nonbreakers`** (_punctuator_)

Nonbreakers are special punctuators with future reserved use. Some potential uses may include complex escape sequences or adjoining words.

**`Breakers`** (_punctuator_)

Breakers are tokens that signal the end of a construct (ie statements).

Those include but are not restricted to statement and list breaks, but also includes individual quotes, brackets… etc. that are used to signal the opening or closing of a nested context (ie with it's own parsing goal).

_Special Note_: A distinct aspect of a sequence-based tokenizer compared to conventional tokenizers, is that it may be able to avoid looking for openers and closers for constructs that are more efficiently matched by a pattern, ie no matter how complicated the construct itself is a continuous sequence.

1. **`Openers`** (_breaker_, _punctuator_)

   A special breaker which defines the opening of a nested context.

2. **`Closers`** (_breaker_, _punctuator_)

   A special breaker which defines the closing of a nested context.

**`Operators`** (_punctuator_)

Punctuating operators are the subset of non-word sequences of all operators.

Unlike other operators, punctuating operators will in most languages require a syntax where they have either or both left- and right-hand-sides explicity filled. A good example from JavaScript is the fact that `(+)` is invalid while `(yield)` is.

From a tokenizer's perspective, the above criteria is also what distinguishes an Operator punctuator from other types of punctuators.

In that sense, it is possible to further classify two important forms of operators which lead to fast and more verbose tokenization:

1. **`Assigners`** (_operator_, _punctuator_)

   Assigners are special operators which define an assignment relationship between a left- and right-hand-side. It does not apply to postfixed notation.

   _Note_: while `++i` and `i++` are assignment expressions, from a tokenizer's perspective, they are not assigners, and are merely operators.

2. **`Combinators`** (_operator_, _punctuator_)

   Combinators are special operators which define a non-assignment relationship between a left- and right-hand-side, where the left-hand-side may either be implicit but it is there (ie `-1` is actually `0 - 1`). It does not apply to postfixed notation.

   Combinators do not include constructs like `i++` which constitutes to `let v = 1; i = v + 1; return v` or `++i` which constitutes to `i = i + 1;` or any other constructs for which the constitutions are not merely an implied prefix of a particular value.

## Groups

Sequences inside the boundaries of a paired Opener and Closer all together form a single group, which is a series of sequences and/or groups that belong to an independent parsing goal (context) belonging to the same syntax (mode) of its parent contexts.

| `Groups`     | Ranges of sequences and/or groups |
| ------------ | --------------------------------- |
| `Comments`   | Annotations                       |
| `Enclosures` | Evaluated expression              |
| `Quotes`     | Static or dynamic text            |
| `Spans`      | Interpolated expressions          |

> … (more to follow)

## Contexts (parsing goals)

Each syntax (mode) has a top level context and zero or more nested contexts, which include the subset of sequences and groups that are used by the tokenizer while scanning the respective segment of a stream. A single context instance is constructed for each unqiue group, and each context retains a single unqiue instance of it's primed token generator.

> … (more to follow)
