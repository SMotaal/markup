# Requirements

*ES·PRESSIONS* leverages the power of modern ECMAScript language features to solve a lot of the same problems solved by other tools in ways that make it portable and efficient enough to be used in production.

<!--
The tool itself is written in ESM syntax and uses it's own code to allow it to execute in environments that do not natively support ECMAScript Modules without the need for ahead of transpilation (AOT) or bundling when used in certain environments.
-->

> **Backwards Compatibility Disclaimer**
>
> It is possible to back-port *espressions* to runtimes that do not support some of the modern language features, but only to a degree and is generally discouraged.
>
> If you choose to explore this further, keep in mind that certain features like Promises, Generators and Regular Expressions which are used heavily may lead to significant preformance problems when polyfilled assuming that a sufficiently conforming implementation is even feasible, like in the case of generators.


<!--
The motivation for this comes from the need for lightweight alternatives to tried and tested tooling to make them suitable to work with at runtime. While most tools provide the infrastructure to make them accessable in the browser, they are often designed first and foremost to fill development-time needs.

Runtime-first design differs in many ways that go beyond implementation. It is a different problem solving space all together with it's own problems and priorities.
-->
