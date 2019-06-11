## Syntax

### Solidus

<details><summary>Tim Disney's Take</summary>

```
𝑡 ∈ Token     ∷=   𝑥 | Punctuator | Keyword
               | /𝑟/ | (𝑇̲) | {𝑇̲}
𝑟 ∈ RegexPat  ∷=   𝑥 | { | } | ( | )
𝑇, 𝑃           ∈ Token*
```

</details>

<details><summary>Example (from the spec)</summary>

<blockquote>

There are no syntactic grammar contexts where both a leading division or division-assignment, and a leading RegularExpressionLiteral are permitted. This is not affected by semicolon insertion (see [11.9](http://www.ecma-international.org/ecma-262/#sec-automatic-semicolon-insertion)); in examples such as the following:

```
a = b
/hi/g.exec(c).map(d);
```

where the first non-whitespace, non-comment code point after a LineTerminator is U+002F (SOLIDUS) and the syntactic context allows division or division-assignment, no semicolon is inserted at the LineTerminator. That is, the above example is interpreted in the same way as:

```
a = b / hi / g.exec(c).map(d);
```

— <cite>[ECMAScript Specification - Lexical Grammar](http://www.ecma-international.org/ecma-262/#sec-ecmascript-language-lexical-grammar)</cite>

</blockquote>

</details>

### Automatic Semicolon Insertion

<details><summary>Rules (from the spec)</summary>

<blockquote>

There are three basic rules of semicolon insertion:

1. When, as the source text is parsed from left to right, a token (called the _offending token_) is encountered that is not allowed by any production of the grammar, then a semicolon is automatically inserted before the _offending token_ if one or more of the following conditions is true:

   - The _offending token_ is separated from the previous token by at least one LineTerminator.
   - The _offending token_ is `}`.
   - The previous token is `)` and the inserted semicolon would then be parsed as the terminating semicolon of a do-while statement ([13.7.2](http://www.ecma-international.org/ecma-262/#sec-do-while-statement)).

2. When, as the source text is parsed from left to right, the end of the input stream of tokens is encountered and the parser is unable to parse the input token stream as a single instance of the goal nonterminal, then a semicolon is automatically inserted at the end of the input stream.

3. When, as the source text is parsed from left to right, a token is encountered that is allowed by some production of the grammar, but the production is a restricted production and the token would be the first token for a terminal or nonterminal immediately following the annotation “[no LineTerminator here]” within the restricted production (and therefore such a token is called a restricted token), and the restricted token is separated from the previous token by at least one LineTerminator, then a semicolon is automatically inserted before the restricted token.

— <cite>[ECMAScript Specification - Automatic Semicolon Insertion](http://www.ecma-international.org/ecma-262/#sec-automatic-semicolon-insertion)</cite>

</blockquote>

</details>

## Links

- https://github.com/tc39/test262-parser-tests
- https://github.com/standard-things/esm/blob/master/test/compiler-tests.mjs#L562-L665

- https://inimino.org/~inimino/blog/javascript_semicolons
- https://github.com/guybedford/es-module-shims/blob/master/src/lexer.js
- https://github.com/sweet-js/sweet-core/wiki/design

<!--

/ is reg ex

if t-1 === `(…)`
  regex if <if|while|for|with> (…) <expression statement>
  div otherwise

else if t-1 === `{…}`
  div if
    (<function> ‹identifier›? (…) {…})
    (<class> ‹identifier›? (…) {…})
    ({…})
  regex if
    <if|while|for|with> (…) {…}
    <function> <identifier?> (…) {…}
    <class> <identifier?> {…}
    <class> <identifier?> <extends> <identifier> {…}
    <label>: {…}

-->
