# SMotaal's Tokenizer Concepts

## Sequences

The smallest units of this tokenizer design is sequences, which are the set of every sequence of one or more characters that are meaningful for a given stream of text to be scanned.

### `Words` ／<samp>\b[\p{ID_Start}][\p{id_continue}]\*\b</samp>／

| `Words`       | Alphanumeric sequences                       |
| ------------- | -------------------------------------------- |
| `Keywords`    | Defining a structure<sup>\*</sup>            |
| `Identifiers` | Following a defined structre                 |
| `Constants`   | Representing a special quantity or reference |

_\* Keywords refer to a predefined set of words which may be classified as keywords, operators, modifiers... etc. in the official grammars of a given syntax._

### `Literals` ／<samp>\b\w+\b|[\p{Ps}"].\*[\p{Pc}"]</samp>／

| `Literals`    | Special patterns                             |
| ------------- | -------------------------------------------- |
| `Numbers`     | Representing a specific quantity             |
| `Strings`     | Representing a static text<sup>\*</sup>      |
| `Expressions` | Representing special expressions (ie RegExp) |

_\* Strings including interpolations are expression groups._

### `Punctuators` ／<samp>\p{Ps}.\*\p{Pc}</samp>／

| `Punctuators`       | Qualified characters defining the boundaries         |
| ------------------- | ---------------------------------------------------- |
| `Operators`         | Marking associations between constructs<sup>\*</sup> |
| `Nonbreakers`       | Marking a continuation of a construct                |
| `Breakers`          | Marking the end of a construct                       |
| `Assigners`         | Marking the sides of an assignment construct         |
| `Combinators`       | Marking the sides of a quantitative construct        |
| `Openers`/`Closers` | Marking boundaries of nested context                 |

_\* Constructs refer to isolated, associated and/or groupped expressions_

## Groups

Sequences inside the boundaries of a paired Opener and Closer all together form a single group, which is a series of sequences and/or groups that belong to an independent parsing goal (context) belonging to the same syntax (mode) of its parent contexts.

| `Groups`     | Ranges of sequences and/or groups |
| ------------ | --------------------------------- |
| `Comments`   | Annotations                       |
| `Enclosures` | Evaluated expression              |
| `Quotes`     | Static or dynamic text            |
| `Spans`      | Interpolated expressions          |

## Contexts (parsing goals)

Each syntax (mode) has a top level context and zero or more nested contexts, which include the subset of sequences and groups that are used by the tokenizer while scanning the respective segment of a stream. A single context instance is constructed for each unqiue group, and each context retains a single unqiue instance of it's primed token generator.

### Mode

<style>
code:first-child { background-color: rgba(0,0,0,.05); border-radius: 0.25ex; box-shadow: 0 0 0 2px rgba(0,0,0,.05); padding: 0 0.25ex; }
/* border: 0.25ex transparent rgba(0,0,0,.02); */
</style>
