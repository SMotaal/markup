# Markup Elements

> **TODO** — Compartmentalize reusable components from [demo](../experimental/).

---

## Compositional Structure

Elements are structured in order to progressively work towards specific [use cases](#use-cases).

- [ ] Customizable `markup-block` for fenced code
  - [ ] Encapsulated `markup-content`
    - [ ] Slotted `markup-content-decoration`
    - [ ] Encapsulated `markup-line`
      - [ ] Slotted `markup-line-decoration`
      - [ ] Encapsulated `markup-span`
        - [ ] Slotted `markup-span-decoration`
  - [ ] Slotted `markup-block-editor` for editing
- [ ] Customizable `markup-container` for encapsulation
  - [ ] Slotted `markup-editor` for editing

---

## Use Cases

<div float:=left>

- [ ] Render code blocks with syntax highlighting <small>`●`</small>
  - [ ] Harmonize styles across code blocks for syntax highlighting <small>`●`</small>
- [ ] Decorate a code block <small>`●`</small>
  - [ ] Decorate specific lines of a code block <small>`● ●`</small>
  - [ ] Decorate specific spans of a code block <small>`● ●`</small>
- [ ] Mutate layout state of a code block <small>`● ● ●`</small>
  - [ ] Save/Restore layout states of a code block <small>`● ●`</small>
  - [ ] Harmonize layout state across code blocks <small>`● ● ●`</small>
    - [ ] Save/Restore layout states across code blocks <small>`● ● ● ● ●`</small>
- [ ] Mutate content state of a code block <small>`● ● ● ● ●`</small>
  - [ ] Replace all content of a code block <small>`● ● ●`</small>
    - [ ] Save/Restore content state of a code blocks <small>`● ● ● ● ●`</small>
  - [ ] Control editing operations of a code block <small>`● ● ● ●`</small>
  - [ ] Harmonize content state across code blocks <small>`● ● ● ● ●`</small>
    - [ ] Save/Restore content states across code blocks <small>`● ● ● ● ●`</small>

</div>

<!--prettier-ignore-start-->
<div float:=right>
<small><pre>
<code>  simple |<small><code>●</code></small>|</code>
<code>moderate |<small><code>● ● ●</code></small>|</code>
<code>advanced |<small><code>● ● ● ● ●</code></small>|</code>
</pre></small>
</div>
<!--prettier-ignore-end-->

<div clear:=both /></div>

---
