# ECMAScript Tokenizer

## Abstractions

The scanning aspects of this design are accomplished by specialized extensions of the ECMAScript RegExp object, designed to provide the missing contextual aspects needed for proper tokenization.

Actual tokenization is done using a generator approach, which aligned in retrospect with the new `RegExp.prototype.matchAll` methods, along with other abstractions for partial modeling of tokenized output for different intents, including the accurate tokenization process itself.

<!--prettier-ignore-start-->

```js markup-mode=es
                        // ===================================================
                        //
const match =           // ENTITY CAPTURE
  matcher.exec(         // All state related to entity capture for a single
    sourceText          // sub-expression match as determined by the specific
  );                    // matcher state at the begining of the operation.
                        //
                        // ===================================================
                        //
                        // TOKEN DEFINITION
                        // Generated state autonomously and exclusively
                        // associating to range of consecutive characters of
                        // a given text for which it is the manifestation of
                        // in the asymmetrical equivalent set of definitions
                        // yielded by the set of all its characters.
                        //
const = {               // Token        ≈ matcher.state.lastToken
                        //
  text,                 // string?      associated sub-string (always used)
  type,                 // string       ≈ fault, opener, closer…
  construct,            // string?      ≈ context.currentConstruct.text
  offset,               // number       position of the first character
  length,               // number?      count of unique characters (not used)
  sourceText,           // string?      associated text string (not used)
                        //
                        // –––––––––––––––––––––––––––––––––––––––––––––––––––
                        //
                        // LEXICAL DEFINITION
                        // Predefined state that drives entity capturing
                        // operations.
                        //
  context: {            // Context      ≈ matcher.state.lastTokenContext
                        //
    goal: {             // Goal         ≈ matcher.goal
                        //
      groups,           // Groups       = Record<string, Group>
                        //
      punctuators,      // Punctuators  = Record<string, boolean>
                        //
      openers,          // Delimiters   = Punctuators & Array<string>
      closers,          //
                        //
      opener,           // string?      explicit delimiters defining
      closer,           //              the boundaries of a nested goal
                        //              where the parent.groups[opener]
                        //              retains a matching record.
                        //
                        //
      type,             // string?      coerced token type used by
                        //              coarser-gained nested goals
                        //              ≈ pattern, string… etc.
                        //
      fold,             // boolean?     coerced entity merging behaviour
                        //              for combining consecutive captures
                        //              of the goal.type.
                        //
      flatten,          // boolean?     default entity merging behaviour
                        //              for combining consecutive captures
                        //              intended for the same token, which
                        //              is preceded by explicitly defined
                        //              match.flatten values.
    },                  //
                        //
    group: {            // Group        ≈ goal.groups[group.opener]
                        //
      opener,           // string       explicit delimiters defining
      closer,           //              the boundaries of this nested
                        //              context.
                        //
      goal,             // Goal         lexical definitions driving all
                        //              entity captures of this nested
                        //              context.
                        //
      parentGoal,       // Goal?        reference to lexical definitions
                        //              driving entity captures preceding
                        //              and following this nested context,
                        //              when applicable.
                        //
    },                  //
                        // –––––––––––––––––––––––––––––––––––––––––––––––––––
                        //
                        // SYNTACTIC DEFINITION
                        // Generated state represtations of concluded entity
                        // captures operations leading to the formation of
                        // grammatically cohesive tokens.
                        //
                        // IN THE CURRENT CONTEXT
    lastToken,          // Token?   compositional   ≈ state.lastToken
    lastAtom,           //          contextual      ≈ state.lastAtom
    lastTrivia,         //          annotational    ≈ state.lastTrivia
                        //
                        //
    precedingToken,     // Token?   compositional   ≈ parentContext.lastToken
    precedingAtom,      //          contextual      ≈ parentContext.lastAtom
    precedingTrivia,    //          annotational    ≈ parentContext.lastTrivia
                        //
                        // –––––––––––––––––––––––––––––––––––––––––––––––––––
                        //
                        // SEMANTIC DEFINITION
                        // Predetermined state evolving along side entity
                        // capturing, potentially influencing such operations.
                        //
    currentConstruct,   // Construct?   = Array<string> { last, text }
    parentConstruct,    //              ≈ parentContext.currentConstruct
    openingConstruct,   //              ≈ freeze(parentConstruct.clone())
                        //
  },                    //
} = createToken(        //
  match,                //
  matcher.state         //
);                      //
                        // ===================================================
```

To be continued
