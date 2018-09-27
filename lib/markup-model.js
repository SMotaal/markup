/**
 * Markup Model
 *
 * Unlike static text, live text documents often require certain fixures to make
 * allow edits to happen efficiently without inconsistencies.
 *
 * The first fixture is that text editors adopt a 2D model compared to a simple
 * 1D stream of characters. However, since modifications impact all subsequent
 * positions, the idea of a push-style `{line, column}` state is absurd.
 *
 * The second fixture is that text editors highlight text edits occuring at the
 * cursor, and possibly around it. Predetermining the scope of recompuation from
 * the cursor is not absolute, it is progressive, because inserting a quote or
 * brace cannot simply force the rest of the text to be reformatted.
 *
 * The third fixture is that text editing is a human thing, it is predictable,
 * to the extent that a human might *replace*, *insert*, *delete*, *offset*, or
 * *implace* (move text). The absolute fact of those being a single stream of
 * sequential operations is the human quality to help reason about them. Yet,
 * if multiple humans are involved, add latency and responsiveness to that list.
 *
 * The fourth fixture is that text naturally segments, not necessarily into
 * coherent sentences with profound meaning, but beyond lines and columns.
 *
 * @see https://gist.github.com/SMotaal/8aea1b8eb5ce370e90d74c71073f74c5
 */
