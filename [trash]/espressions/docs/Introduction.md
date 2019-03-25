# ES·PRESSIONS

*ES·PRESSIONS* (*espressions*) is a runtime-optimized markup parsing tool for ECMAScript source texts.

It leverages the power of modern ECMAScript language features to solve a lot of the same problems solved by other tools in ways that make it portable and efficient enough to be used in production, see [Requirements](Requirements.md).

## Scope

A core objective for *ES·PRESSIONS* is to devise ways that allow JavaScript developers to reason about working with source text using concepts that are familiar them, like Regular Expressions. The motivation here is to make it possible to think of notion of an expression like `/export function/` being used in places where AST is not ideal but where normal regular expressions are just not enough. Bridging this gap is not as simple as rewriting expressions.
