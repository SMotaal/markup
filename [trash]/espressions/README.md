# es·pressions (_experimental_)

Lightweight ECMAScript SourceText processor.

**Why?**

This work stems from the need for fast and reliable runtime tooling designed to work without dependening on the myriad of packages conceived for development workflows.

This package was conceived while working on challenges specific to the runtime interoperability when working with ECMAScript Modules. It came from the notion that while AST transforms are the most granual and arguably (according to some) the only reliable way to work with source text, using them at runtime comes with a lot trade-off burdens that often lead to suboptimal outcomes.

**What it tries to do**

- Make it possible to look for disambiguating syntaxes.
- Safely scan for normalized expressions (ie whitespace or style neutral).
- Provide a starting point for manipulating source texts.

**What it does NOT try to do**

- Everything else for now
