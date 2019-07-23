# Markup Testing

## Manual Checking of Exposed Types

TypeScript's support for `jsdoc` type annotations are sometimes mysterious to work with, requiring effort to make sure they are working externally. This is best testing with TypeScript files.

### Matcher

Matcher relies on module augmentation to agument the namespace of the `Matcher` class with some of the internal `Matche`-prefixed types and interfaces, sans prefix.

- [Exposed Checks](./types/matcher.ts)
- [External Definitions](../matcher/types.d.ts)
- [Internal Definitions](../matcher/matcher/types.d.ts)
