# Expressions

The idea here is to extend the builtin RegExp interface to allow it to operate on the normalized syntax of source texts. This will make it possible to bridge the gap between choosing between ridged expressions like `/export function/` and their safe-guarded counterparts `/\bexport\s+function\b(?=[$_\p{ID_START}][$_\d\p{ID_CONTINUE}]*)/u`.

Bridging this gap is not as simple as rewriting the expressions, because safe-guards are determined by intent. In fact, the above example is only one of possibly infinite permutations of safe-guarding the intended expression for a particular intent. Solving this problem by trying to orchastrate declarative constructs for every intent is not ideal to say the least.

An alternative approach used by *espressions* to solve this is to rewire matching to work on tokens instead of the literal string, where an optimized engine can hide away the heavy lifting needed for tokenization of segments of strings. Such an approach a much more tenable problem space that lends to more finite permutations.

What we do instead is use lazy tokenization coupled with an optimized sequence matching based on tokens.

## Trade-offs

The trade-offs here are clear cut, the more tokens you need to work with based on the boundaries of your expressions the bigger the memory footprint and the slower the matching. This intern requires some deeper examination of extreme cases where trade-offs will be of significance.

### Source Length

The painful extreme is for working with large source texts, where the memory footprint of **essential** tokens will surpass the thresholds of engine in terms of real memory or even efficient garbage collection (often solved by workers).

The graceful extreme is working with smaller source texts where the memory of **all** tokens is more affordable than the cost of subsequent reparsing of the text leaving only the challenge of ensuring that obsolete models are unreferenced for optimal memory management and garbage collection.

### Expression Boundaries

The painful extreme is to try to work with expressions that require longer

<!-- Working with smaller source texts -->
