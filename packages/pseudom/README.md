# @smotaal/pseud·om

Featherweight compositional DOM for document/less runtimes.

**Why?**

Document composition using the standard DOM can be boggled down by unrelated operations and behaviors, which essentially boil down to being able to create and nest `Element` and `Text` nodes to generate HTML output.

**How?**

- Provide purely compositional APIs independent from the DOM.
  1. Reduced overhead by reusing elements (**being explored**).
  2. Fast HTML rendering (**work in progress**).
- Provide interoperability APIs for operating directly on the DOM.
  1. Reduced overhead by reusing elements (**being explored**).
  2. Fast HTML rendering (**being explored**).

> **Important Note:** This package is designed for ECMAScript module supporting runtimes, including all major browsers and Node.js 12 or later.

See [<samp>Changelog</samp>][changelog].

## Intended Uses

### **`native`** mode

One use case is when you prefer using the abstract APIs directly on the native DOM. The `pseudom.native.…` APIs provide the mirrored abstractions, however, it **does not** automatically clone elements at this time but is planned future releases after addressing the various edge cases.

```js
import {native} from '@smotaal/pseudom';

console.log(native.createElement('div', null, native.createText('Real DIV')));
```

#### Manually Creating `native` API instances

You can also manually create a private instance of the **`native`** APIs where you only pass in either a **`global`** object or just the specific set of constructors as the **`endowments`** argument, which may be used to provide specific `document` instance and constructors for `Object`, `DocumentFragment`, `Element`, `Node`, `Text`.

```js
import {createNativeDOM} from '@smotaal/pseudom/native.js';

const endowments = {Object, document, DocumentFragment, Element, Node, Text};
const native = createNativeDOM(endowments);

console.log(native.createElement('div', null, native.createText('Fake DIV')));
```

> **Note**: While the API can function without including the specific node constructors, they are always useful to include specifically for type checking when working with multiple APIs instances across frames.

---

### **`pseudo`** mode

The more ideal use case is when you want to compose HTML fragments and repeatedly rely on one or more recurring elements. The standard DOM approach would require normally making deep clones of those elements. The `pseudom.pseudo.…` APIs provide the most basic abstractions to a compose fake elements to generate the HTML output.

```js
import {pseudo} from '@smotaal/pseudom';

console.log(pseudo.createElement('div', null, pseudo.createText('Fake DIV')));
```

#### Manually Creating `pseudo` API instances

You can also manually create a private instance of the **`pseudo`** APIs where you only pass in either a **`global`** object or just the specific set of constructors as the **`endowments`** argument, which may be used to provide specific constructors for `Object`, `Set`, `String` and `Symbol`.

```js
import {createPseudoDOM} from '@smotaal/pseudom/pseudo.js';

const endowments = {Object, Set, String, Symbol};
const pseudo = createPseudoDOM(endowments);

console.log(pseudo.createElement('div', null, pseudo.createText('Fake DIV')));
```

> **Note**: While the API can function without including the specific primordial constructors, they are always useful to include specifically for type checking when working with multiple contexts or realms.

---

### **`default`** mode

Another ideal use case is when the DOM may not be available, more so if the application needs transparently adapt to its presence or abscense while composing fragments. This `pseudom.…` automatically expose the right API based on the precense or absence of a valid `document` in on the global object.

```js
import * as pseudom from '@smotaal/pseudom';

console.log(
  pseudom.createElement(
    'div',
    {className: 'awesome'},
    pseudom.createElement('span', null, pseudom.createText('Awesome')),
    pseudom.createElement('span', null, pseudom.createText('Text')),
  ),
);
```

> **Note**: If you want to use the `default` API in multiple contexts or realms, you must directly import from `@smotaal/pseudom` which will create a new instance of the namespace with the correct bindings.

---

If you find pseud·om suitable for your particular case, please don't hesitate to contribute to this project. If not, please let me know why.

[package:repository]: https://github.com/SMotaal/markup/tree/master/packages/pseudom
[changelog]: ./CHANGELOG.md
