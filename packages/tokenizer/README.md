# SMotaal's Tokenizer

Nestable syntax tokenizer using Regular Expressions.

**Why?**

While Regular Expressions can be confusing to work with sometimes, they come with certain optimization benefits that can be leveraged to minimize overhead costs for scanning texts. While some argument against their ability to safely guard against melicious patters, this argument equally applies to any and all existing ways of scanning texts. The problem is not Regular Expressions, it is simply those particular regular expressions that not well guarded.

**What it tries to do**

- Provide simplified mechisms for defining syntaxes.
- Provide a way to work with tokens directly from strings.

**What it does NOT try to do**

- Everything else for now
