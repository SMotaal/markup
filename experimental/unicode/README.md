# Markup › Unicode

While the ECMAScript specs incorporates first-class Unicode support directly in features like RegExp, some implementations continue to lag behind.

A minimal fallback approach that avoids a need for complete shim is explored to make it possible for a tokenizer to remain safely isolated from other runtime code.

_Key Considerations_

1. Unicode support depends on large character mapping data:
   - Shared data must not be mutable.
   - Shared data must not be redundantly wasteful.
2. Unicode data requires routine updates:
   - Generated data must be updated.
   - Generated data must reflect the most logical release of unicode (ie multi-versioning is suboptimal if it is not optimal).

## Classes

### `ID_Start` and `ID_Continue`

Identifiers are front-and-center to any valid HTML, CSS, and ECMAScript parsing, all of which use some derivation of [`\p{ID_Start}`](./ID_Start.txt) and [`\p{ID_Continue}`](./ID_Start.txt) to denote what a valid identifier is.

## Manual Operations

### Sorting and Merging

1. You can quickly separate ranges by matching /`((?:\\.[^-\\]*|[^-\\])(?:-(?:\\.[^-\\]*|[^-\\])|))`/ and replacing by something like `$1\n` (ie lines).

2. Grouping various range forms based on class and character index (especially `\x` and `\u`) helps keep ranges neatly sorted after merging.

3. Eliminating exact duplicates can be done by matching /`^([^-]+)(.*?)\n\1\2`/ and replacing with `$1$2`.

4. Matching **potential** redundancies:

   - Related unicode escaped ranges can be highlighted with variations of /`(\\u..)..(?=.*\n\1|[^-]*\n\1..)`/ like /`(\\u...)[9](?=.*\n\1|[^-]*\n\1[a])`/ (or /`^(?:(\\u..)..)(?:-(\\u..)..)\n(?=\1)`/)
