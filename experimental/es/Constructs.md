# ECMAScript Constructs

<blockquote align=center border:=none><details open><summary>Attribution</summary>

The work is the result of a lot of input and inspiration from many [SES Strategy](https://groups.google.com/group/ses-strategy) members, with special gratitude to M. S. Miller, J. D. Dalton, M. Fig, R. Gibson, and, as well to T. Disney, who indirectly contributed, through his exceptional work where he pioneered intuitive ways to accurately reason about the fine-grained aspects of ECMAScript grammar.

</details></blockquote>

This document addresses the underlying theory behind an experimental ECMAScript tokenizer that is designed from the ground up to meet the challenges of working with source text at runtime.

The main contribution of this work is that it aims to make it possible to minimize on expansive operations that conventionally relied on full AST generation to instead rely on conceptual abstractions, ie constructs and planes, designed to mimic a partial AST approach.

A lot of experimental work is also incorporated in this effort, [demonstrated here](https://smotaal.io/markup/experimental/es) and [maintained here](https://github.com/SMotaal/markup/tree/master/experimental/es).

## Constructional Planes

This section takes a constructional perspective of the ECMAScript grammar which, when compared to the hierarchical perspective of AST, considers a closure of prescribed delimiters and semantics to be a balanced and cohesive flat node representative of the infinite set of possible token nodes (things) that would be contained within it.

This notion of flat node or fat token is also referred to as a constructional plane and is signified by a single `…` denoting its things.

### Primary and Secondary Planes

ECMAScript grammar can be divided into two primary planes:

- `((…))` [Expression][ecma-script-expression-statement] stuff
- `{{…}}` [Statements][ecma-script-statements] stuff

<blockquote align=center border:=none><details open><summary>Notation</summary>

Throughout this document we're using two parallel notations for both clarity and brevity.

For instance, the symbolic notations `((…))` and `{{…}}` shown here, both meant to convey things (ie `…`) belonging inside of a valid construction of the respective closures — where incidentally such things can wrap indefinitely in the respective delimiters.

However, when those aspects are represented in abstract syntax forms, they will instead be denoted using a metaphorical notation that is also valid ECMAScript syntax for the intended effect.

</details></blockquote>

While this is an extremely shallow view of the ECMAScript grammar, it only serve as the most fundamental building blocks of distinction to keep in mind as we move forward.

And absolutely, `Expression` is what the spec calls `ExpressionStatement` (mostly) and, yes, an `Expression` is a thing of the `Statements` stuff, yet as will be shown, it is special enough of a thing that you can neither resist nor should you want to treat it as such.

One important aspect to in mind is that such delimiters are sometimes forced or implied by the grammar, and in some cases, where they would be allowed, will be optionally introduced for style or effect — for instance where `= …` normally does not need to be wrapped, one might opt for `= (…);` which would wrap the entire expression aspect merely for stylistic reasons or `= (…, …);` which is not stylistic and is for effect.

There is at least a few more stuff that we did not touch upon yet, and that is because, like everything else, they are considered secondary stuff, they are mostly things that happens around the primary stuff, some of which are also important to outline here, while others will fall in place as we move forward.

The list of "significant and magical planes" includes:

- `…{…}…` [Module](ecma-script-module-item) things
- `⟨...⟩` [Destructuring][ecma-script-destructuring-patterns] things

A working assumption here is that aside from the above everything else in the ECMAScript grammar will always be a thing that belongs to exactly one of those planes — except where `Module` overlaps with `Statements` as will be shown later on.

Let's explore all four planes in more detail to see if this actually holds up, and to identify where other complex planes like literals actually fall in place in the body of this work.

### `((…))` Expression Plane

In an expression, you do `Expression` things:

<!--prettier-ignore-start-->

```js markup-mode=es
                     ObjectLiteral: (                            {...$$}   );
                      ArrayLiteral: (                            [...$$]   );
                     RegExpLiteral: (                            /[{*}]/   );
           ArrowFunctionExpression: (                 (...$$) => {{ ; }}   );
                                    (                 (...$$) => (( $ ))   );
      AsyncArrowFunctionExpression: (           async (...$$) => {{ ; }}   );
                                    (           async (...$$) => (( $ ))   );
                FunctionExpression: (        function $$ (...$$) {{ ; }}   );
           AsyncFunctionExpression: (  async function $$ (...$$) {{ ; }}   );
       GeneratorFunctionExpression: (       function* $$ (...$$) {{ ; }}   );
  AsyncGeneratorFunctionExpression: ( async function* $$ (...$$) {{ ; }}   );
                   ClassExpression: (                   class $$ {/***/}   );
                                    (   class $$ extends (( $ )) {/***/}   );
                 SpecialExpression: (                      await (( $ ))   );
                                    (                     delete (( $ ))   );
                                    (                   import ( (( $ )) ) );
                                    (         (( $ )) instanceof (( $ ))   );
                                    (                        new (( $ ))   );
                                    (              new (( $ )) ( (( $ )) ) );
                                    (                        this[( $ )]   );
                                    (                     typeof (( $ ))   );
                                    (                      yield (( $ ))   );
                                    (                     yield* (( $ ))   );
                                    (                       void (( $ ))   );
```

<!--prettier-ignore-end-->

#### Noteworthy aspects for `Expression` things:

- Every expression is metaphorically wrapped `(…);` to signify that it is an `Expression` (ie `((…))`) and that it is completely separate from others, hence the `;`.

- There is only one place where you can leave the current `Expression` context and immediately enter into a **nested** `Statements` context, which per specs today is always some form of a [Function Body `{{ ; }}`][ecma-script-function-body] other than [Methods][ecma-script-method-definition] as those are always nested further down somewhere.

- The counterpart to this are places where you leave the current `Expression` context and immediately enter into another **nested** `Expression` of a respective [LeftHandSideExpression denomination `(( $ ))`][ecma-script-left-hand-side-expression].

- Another unique aspect of an `Expression` context is that it can have no declarations, and as such in places (not omitted above) where you would expect a [Binding Identifier `$$`][ecma-script-binding-identifier], they will _always be optional_ and _may never_ take a [Computed Property `[( $ )]`][ecma-script-computed-property-name] form or any wrapped `Expression`form.

- To further articulate on the above point, it would specifically exclude omitted forms of arrow functions having a single unwrapped argument, ie the `$$ =>` form, which while not presenated are still like many undeniably `Expression` things per the spec, just not significantly relevant to the matter at hand.

- The remaining cases where you leave the current `Expression` context and enter into **nested** contexts of a clear intent include things like [Literal Object `{...$$}`][ecma-script-object], [Literal Array `[...$$]`][ecma-script-array], [Literal Pattern `/[{*}]/`][ecma-script-regular-expression], [Class Body `{/***/}`][ecma-script-class-body], and [Arguments `(...$$)`][ecma-script-arguments-list] which specifically excludes omitted forms of arrow functions with a single unwrapped argument.

- The non-spec thing introduced here (ie `SpecialExpression`) is simply to present `Expression` context forms for the set of keywords that are applicable in that context:

  <blockquote>

  **Note**: Please consult the spec for any additional details relating to the specific set of keywords presented here not addressed in this summary.

  </blockquote>

  - In most cases, such keywords are of an operative, and they can in fact repeat indefinitely, like `yield yield $` and so fourth.

  - Keywords that will not work that way include `this`, `import`, `instanceof`, and `new`, but each for different reasons, and some of those are more of technical impracticality than absolutes.

  - Also worth noting is that the contextually-sensitive keyword `super` which is omitted from this presentation and is closer in nature to `this`, ie are contextually bound identifiers relative to where they are used and nothing else.

  - So in that regard, it is fair to also point out that `this[( $ )]` is actually omitting forms like `this(...$)` or `this.$`… etc., which will be addressed later on along with meta-properties that are applicable to `new` and `import`.

### `{{…}}` Statements Plane

In statements, you do `Statements` things:

<!--prettier-ignore-start-->

```js  markup-mode=es

              FunctionDeclaration: {        function $$$ (...$$) {{ ; }}   };
         AsyncFunctionDeclaration: {  async function $$$ (...$$) {{ ; }}   };
     GeneratorFunctionDeclaration: {       function* $$$ (...$$) {{ ; }}   };
AsyncGeneratorFunctionDeclaration: { async function* $$$ (...$$) {{ ; }}   };
                 ClassDeclaration: {                    class $$ {/***/}   };
                                   {    class $$ extends (( $ )) {/***/}   };
              VariableDeclaration: {                   var $$$ = (( $ ))   };
                                   {               var [{$$$}] = (( $ ))   };
                ControlStatements: {                 for (/***/) {{ ; }}   };
                                   {           while ( (( $ )) ) {{ ; }}   };
                                   {          do {{ ; }} while ( (( $ )) ) };
                                   {          switch ( (( $ )) ) {/***/}   };
                                   { if ( (( $ )) ) {{ ; }} else {{ ; }}   };
                                   {      try {{ ; }} catch ($$) {{ ; }}   };
                                   {         try {{ ; }} finally {{ ; }}   };
                BindingStatements: {            with ( (( $ )) ) {{ ; }}   };
```

<!--prettier-ignore-end-->

#### Noteworthy aspects for `Statements` things:

- Every expression is metaphorically wrapped `{…};` to signify that it is an `Statements` (ie `{{…}}`) and that it is completely separate from others, hence the `;`.

- A new `$$$` binding identifier is used to indicate potential effects beyond the scope of a block, where applicable by the with the spec (aka hoisting). _TBD_

- The `for` statement is odd because it includes very unique `(/***/)` things which fall closer to being `Statements` than `Expression` things.

- While things are far less distorted in a `switch` block, it is far enough from `Statements` due to the special clauses for `case (( $ )):` and `default:` which must precede any `Statements` stuff that is also not just `Statements`.

- To further elaborate on the above point, `Statements` stuff in `switch` blocks along with `for`, `do`, and `while`, all introduce and/or affect the contextual significance of certain keywords like `continue`, not only in their immediate scope, but further down into other `ControlStatements`, where those keywords may or may not be expected normally, and are often also closely relate to [Label `$:…`][ecma-script-labelled-statement] things of `Statements` omitted here.

- The rules for `function` and `class` that is directly in `Statements` are always declarations not expressions, so if they fall in an `AssignmentExpression` position, we can think of them as being implicitly `(( $ ))` wrapped from a constructional standpoint, and this way they remain strictly speaking `Expression` things in comparison.

- When you use operators like `=` in statements, don't forget, everything that follows is also a metaphorically wrapped `(( $ ))`.

- In fact, when you write an unwrapped expression thing (per the previous section), don't think of it as `Statements` because it is a metaphorically wrapped `Expression` and that will always be identical to the same physically wrapped `(( $ ))`.

- Last thing to note, from the perspective of this work, is that any form of SourceText that is not a `Module` is considered to be `Statements`.

### `…{…}…` Module Plane

In a module, you do `Module` things:

<!--prettier-ignore-start-->

```js  markup-mode=es
            ImportDeclaration:                        import 'ModuleSpecifier';
                                              import $$ from 'ModuleSpecifier';
                                     import $$, {/***/} from 'ModuleSpecifier';
                                         import {/***/} from 'ModuleSpecifier';
            ExportDeclaration:           export {/***/} from 'ModuleSpecifier';
                                         export * as $$ from 'ModuleSpecifier';
                                                                export {/***/};
                                                        export default (( $ ));
                                                       export var $$ = (( $ ));
                                                   export var { $$ } = (( $ ));
                                                       export class $$ {/***/};
                                       export class $$ extends (( $ )) {/***/};
                                            export function  $$(...$$) {{ ; }};
                                            export function  $$(...$$) {{ ; }};
                                      export async function  $$(...$$) {{ ; }};
                                            export function* $$(...$$) {{ ; }};
                                      export async function* $$(...$$) {{ ; }};
```

<!--prettier-ignore-end-->

#### Noteworthy aspects for `Module` things:

- `Module` stuff being [that][ecma-script-module-item], it stands out because it seems to have all the things of `Statements` along with [`Imports`][ecma-script-import-declaration] and [`Exports`][ecma-script-export-declaration].

- The same rules for `function` and `class` in `Statements` also apply to `Module` (ie top-level code), where they will always be declarations, exported or otherwise.

- Additionally important to note here is that what follows an `export default` is also `Expression` and never `Module` and so here too any `function` or `class` forms are strictly `Expression` things.

- A given fact mentioned for completeness, is that any `{{ ; }}` in the current `Module` context begins a `Statements` context, and that's not reciprocative in that you cannot per the spec today have **nested** `Module` contexts, they are either the top-level or otherwise lexically irrelevant.

### `⟨...⟩` Destructruing Plane

In destructuring, you do `Destructruing` things:

<!--prettier-ignore-start-->

```js
// For now just consult the spec!
```

<!--prettier-ignore-end-->

#### Noteworthy aspects for `Destructruing` things:

- Compared to all things we've seen so far `Destructuring` stands out because it is actually both a `Statements` and `Expression` thing, where in both cases they are meant to make deeply nested references that will initialize or simply assign against binding identifiers available in scope.

## Constructs

This section explores various contextually relevance of constructs of the grammar in an effort to formalize the necessary rules to effectively define effective constructs (work in progress).

### Modules

- [ ] Import Constructs
- [ ] Export Constructs
- [ ] Declaration Constructs

### SES

- [ ] In/Direct Eval Constructs
- [ ] Assignments of Eval Constructs

To be continued.

[ecma-script-expression-statement]: https://tc39.es/ecma262/#sec-expression-statement
[ecma-script-statements]: https://tc39.es/ecma262/#sec-expression-statement
[ecma-script-module-item]: https://tc39.es/ecma262/#prod-ModuleItem
[ecma-script-import-declaration]: https://tc39.es/ecma262/#prod-ImportDeclaration
[ecma-script-export-declaration]: https://tc39.es/ecma262/#prod-ExportDeclaration
[ecma-script-destructuring-patterns]: https://tc39.es/ecma262/#sec-destructuring-binding-patterns
[ecma-script-left-hand-side-expression]: https://tc39.es/ecma262/#prod-LeftHandSideExpression
[ecma-script-binding-identifier]: https://tc39.es/ecma262/#prod-BindingIdentifier
[ecma-script-computed-property-name]: https://tc39.es/ecma262/#prod-ComputedPropertyName
[ecma-script-function-body]: https://tc39.es/ecma262/#prod-FunctionBody
[ecma-script-class-body]: https://tc39.es/ecma262/#prod-ClassBody
[ecma-script-object]: https://tc39.es/ecma262/#prod-ObjectLiteral
[ecma-script-array]: https://tc39.es/ecma262/#prod-ArrayLiteral
[ecma-script-regular-expression]: https://tc39.es/ecma262/#prod-RegularExpressionLiteral
[ecma-script-method-definition]: https://tc39.es/ecma262/#prod-MethodDefinition
[ecma-script-arguments-list]: https://tc39.es/ecma262/#prod-ArgumentList
[ecma-script-labelled-statement]: https://tc39.es/ecma262/#prod-LabelledStatement
