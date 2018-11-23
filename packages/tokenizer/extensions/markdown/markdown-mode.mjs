import {previousTextFrom, indenter} from '../helpers.mjs';

const defaults = {syntax: 'markdown', aliases: ['md'], requires: ['html']};

const BLOCK = '```…``` ~~~…~~~';
const INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
const CLOSURES = `${BLOCK} ${INLINE}`;

const EMBEDDED = true;
// const SYNTAX = /^\w+$/;

export const markdown = Object.defineProperties(
  ({Symbols, Closures, raw}, {aliases, syntax} = defaults, {html}) => {

    const markdown = {
      syntax,
      comments: Closures.from('<!--…-->'),
      quotes: [],
      closures: Closures.from(html.closures, CLOSURES),
      patterns: {...html.patterns},
      matcher: /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|--+|==+|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S+))|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|\b([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)/gim,
      spans: undefined,
      matchers: {comment: /(\n)|(-->)/g},
    };

    const open = (parent, state, grouper) => {
      const {source, index: start} = state;
      const fence = parent.text;
      const fencing = previousTextFrom(parent, '\n');
      const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
      let end = source.indexOf(`\n${fencing}`, start);
      const INDENT = indenter(indenting);
      const CLOSER = new RegExp(raw`\n${INDENT.source.slice(1)}${fence}`, 'g');

      CLOSER.lastIndex = start;
      let closerMatch = CLOSER.exec(source);
      if (closerMatch && closerMatch.index >= start) {
        end = closerMatch.index + 1;
      } else {
        const FENCE = new RegExp(raw`\n?[\>\|\s]*${fence}`, 'g');
        FENCE.lastIndex = start;
        const fenceMatch = FENCE.exec(source);
        if (fenceMatch && fenceMatch.index >= start) {
          end = fenceMatch.index + 1;
        } else return;
      }

      if (end > start) {
        let offset = start;
        let text;

        const body = source.slice(start, end) || '';
        const tokens = [];
        tokens.end = end;
        if (!EMBEDDED) {
          text = body;
          tokens.push({text, type: 'code', offset, parent});
          offset += body.length;
        } else {
          const [head, ...lines] = body.split(/(\n)/g);
          if (head) {
            tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
          }
          for (const line of lines) {
            const [indent] = INDENT.exec(line) || '';
            const inset = (indent && indent.length) || 0;
            if (inset) {
              for (const text of indent.split(/(\s+)/g)) {
                const type = (text.trim() && 'sequence') || 'whitespace';
                tokens.push({text, type, offset, parent});
                offset += text.length;
              }
              text = line.slice(inset);
            } else {
              text = line;
            }
            tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
          }
        }
        // console.log({fencing, body, start, end, offset, lines, tokens});
        if (tokens.length) return tokens;
      }
    };

    {
      const quotes = html.closures.get('<');
      for (const opener of ['```', '~~~']) {
        const FenceClosure = markdown.closures.get(opener);
        if (FenceClosure) {
          FenceClosure.matcher = new RegExp(
            raw`/(\s*\n)|(${opener}(?=${opener}\s|${opener}$)|^(?:[\s>|]*\s)?\s*)|.*$`,
            'gm',
          );
          FenceClosure.quotes = quotes;
          FenceClosure.open = open;
        }
      }
    }

    return markdown;
  },
  {
    defaults: {get: () => ({...defaults})},
  },
);
