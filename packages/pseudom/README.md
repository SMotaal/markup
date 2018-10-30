# pseu·dom (_experimental_)

Documentless OM for markup.

**Why?**

While in most cases, it is best to rely on the DOM directly, there are times when the DOM may not be available, sluggish, or simply hitting edge cases where the overhead is unpredictable or undesirable.

This package was extracted from such a project, where the DOM was just not right. The intent was to provide a mirrored pipeline to compose DocumentFragments in workers. However, due to the improved performance and modularity, a shift to a more complete implementation that could be use in the main thread, workers, and Node.js was more than justified.

If you find pseu·dom suitable for your particular case, please don't hesitate to contribute to this project. If not, please let me know why.

**What it tries to do**

- Provide a lightweight OM alternative for markup composition.
- Provide a mirrored DOM wrapper for transparent interoperability.
- Reduce overhead by allowing elements to belong to multiple parents.
- Seemlessly go where the DOM can't.
- Promote fast rendering into the DOM (ie HTMLTemplateElement or innerHTML).

**What it does NOT try to do**

- Work with actual documents or elements (ie either or).
- Act like a DOM or a virtual DOM (ie events and such).
- Adhere to the standards (ie completeness).

