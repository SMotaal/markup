# SMotaal's Tokenizer Concepts

## Sequences

The smallest units of this tokenizer design is sequences, which are the set of every sequence of one or more characters that are meaningful for a given stream of text to be scanned.

### `Words` ／<samp>\b[\p{𝙸𝙳_𝚂𝚝𝚊𝚛𝚝}][\p{‌𝙸𝙳_𝙲𝚘𝚗𝚝𝚒𝚗𝚞𝚎}]\*\b</samp>／

| `Words`       | Alphanumeric sequences                       |
| ------------- | -------------------------------------------- |
| `Keywords`    | Defining a structure<sup>\*</sup>            |
| `Identifiers` | Following a defined structre                 |
| `Symbols`     | Representing a special quantity or reference |

_\* Keywords refer to a predefined set of words which may be classified as keywords, operators, modifiers... etc. in the official grammars of a given syntax._

**`Keywords`**

Keywords are a prescribed set of words, which, in the context of markup, are only there to define a semantic structure.

In languages like JavaScript, the keyword `function` and the class `Function` are separate words. However, there can be languages that have an overlap between a keyword and a value which may represent a primitive for the keyword, chosen carefully to lend to a synthetic style. There can also be languages where unintentional iterations lead to such cases where a keyword and a value may share the name and the mechanics of the language eliminate the confusion.

The important thing to note though, is that a keyword from a tokenizer's perspective may be different from what the language references themselves are choosing to refer to as keywords. In many of them, keywords are a subset of the Keywords used here which includes those keywords and other words like reserved words and even operator words, but not words that are Symbols (below).

**`Identifiers`**

Identifiers are non-prescribed words which follow a set of rules:

1. They must be declared and sometimes this is as simple as assigning to them.

2. They can be assigned to unless they are declared as constants.

3. They can be referenced directly or indirectly.

4. They can be used as values or assigned by renference to other identifiers.

**`Symbols`**

Many languages also have a prescribed set of words which follow some of the rules of identifiers. This applies to a degree to the class `Function` in JavaScript. However, a better example is the word `this` which may or may not be defined in the scope a statement that appears in a function dependeing on how the function was called. But, the class `Function`, while qualifies as a Symbol, it is in fact also an Identifier which is predefined onto the global scope.

In reality, setting a hard separation between Symbols and Identifiers is very messy, same as adding additional bins for each special case. So simply adding a word to Symbols does not attribute to it any reserved qualities during lexing.

### `Literals` ／<samp>\b\w+\b|[\p{Ps}"].\*[\p{Pc}"]</samp>／

| `Literals`    | Special patterns                             |
| ------------- | -------------------------------------------- |
| `Numbers`     | Representing a specific quantity             |
| `Strings`     | Representing a static text<sup>\*</sup>      |
| `Expressions` | Representing special expressions (ie RegExp) |

_\* Strings including interpolations are expression groups._

**`Numbers`**

Languages usually include more than one notation for numbers, sharing the same qualities for pattern matching that make them easy to test against regular expressions.

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

Nonbreakers are special punctuators with future reserved use.

**`Breakers`** (_punctuator_)

Breakers are tokens that signal the end of a construct (ie statements).

1. **`Openers`** (_breaker_, _punctuator_)

   A special breaker which defines the opening of a nested context.

2. **`Closers`** (_breaker_, _punctuator_)

   A special breaker which defines the closing of a nested context.

**`Operators`** (_punctuator_)

Punctuating operators are the subset of non-word sequences of all operators.

1. **`Assigners`** (_operator_, _punctuator_)

   Assigners are special operators which define an assignment relationship between a left- and right-hand-side. It does not apply to postfixed notation.

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

<style>
code:first-child { background-color: rgba(0,0,0,.05); border-radius: 0.25ex; box-shadow: 0 0 0 2px rgba(0,0,0,.05); padding: 0 0.25ex; }
/* border: 0.25ex transparent rgba(0,0,0,.02); */
</style>
