import {previousTextFrom, indenter, Closures, sequence, all, raw} from '../common/helpers.js';

export const markdown = Object.defineProperties(
  ({syntax} = defaults, {html}) => {
    const EMBEDDED = true;
    const matcher = ((...matchers) => {
      let matcher = matchers[matchers.length - 1];
      try {
        matchers.push(
          (matcher = sequence`${all(
            sequence`(${markdown.WHITESPACE})`,
            sequence`(${all(
              markdown.ESCAPES,
              markdown.ENTITIES,
              markdown.RULES,
              markdown.BLOCKS,
              markdown.INLINES,
              markdown.TYPOGRAPHS,
              markdown.TAGS,
              markdown.BRACKETS,
              markdown.FENCES,
              markdown.SPANS,
            )})`,
            markdown.INDICIES,
            markdown.DECIMAL,
            markdown.EXPONENTIAL,
            markdown.FRAGMENTS,
          )}${'/gim'}`),
        );
        return matcher;
      } catch (exception) {
        matchers.push(exception.message.replace(/.*Invalid regular expression: /, ''));
        console.warn(exception);
      }
      matcher.matchers = matchers;
      return matcher;
    })(
      /(^\s+|\n)|(&#x?[a-f0-9]+;|&[a-z]+;|(?:```+|\~\~\~+|(?:--+|==+)(?=\s*$)|(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S*))|–|—|"|'|=|\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)|<|>|\(|\)|\[|\]|__?|([*~`])\3?\b|(?:\b|\b\B|\B)([*~`])\4?)|\b[^\n\s\[\]\(\)\<\>&]*[^\n\s\[\]\(\)\<\>&_]\b|[^\n\s\[\]\(\)\<\>&]+(?=__?\b)|\\./gim,
      sequence`(${markdown.WHITESPACE})|(${markdown.ENTITIES}|(?:${markdown.FENCES}|(?:${markdown.RULES})(?=\s*$)|(?:${
        markdown.BLOCKS
      })(?=\s+\S*))|${markdown.TYPOGRAPHS}|${markdown.TAGS}|${markdown.BRACKETS}|${markdown.INLINES})|${
        markdown.FRAGMENTS
      }|${markdown.ESCAPES}${'/gim'}`,
    );

    const mode = {
      syntax,
      comments: Closures.from('<!--…-->'),
      quotes: [],
      closures: Closures.from(html.closures, markdown.CLOSURES),
      operators: html.operators,
      matcher: matcher,
      spans: Closures.from('``…`` `…`'),
      matchers: {comment: /(\n)|(-->)/g},
    };

    const open = (parent, state, grouper) => {
      const {source, index: start} = state;
      const fence = parent.text;
      const fencing = previousTextFrom(parent, '\n');
      const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
      let end = source.indexOf(`\n${fencing}`, start);
      const INDENT = (indenting && indenter(indenting)) || /^/m;
      const CLOSER = new RegExp(raw`^${INDENT.source.slice(1) || ''}${fence}`, 'mg');

      CLOSER.lastIndex = start;
      let closerMatch = CLOSER.exec(source);
      if (closerMatch && closerMatch.index >= start) {
        end = closerMatch.index;
      } else {
        const FENCE = new RegExp(raw`^[\>\|\s]*${fence}`, 'mg');
        FENCE.lastIndex = start;
        const fenceMatch = FENCE.exec(source);
        if (fenceMatch && fenceMatch.index >= start) {
          end = fenceMatch.index;
        } else return;
      }

      if (end > start) {
        let offset = start;
        let text, head, lines;

        const body = source.slice(start, end) || '';
        const tokens = [];
        tokens.end = end;
        if (!EMBEDDED) {
          text = body;
          tokens.push({text, type: 'code', offset, parent});
          offset += body.length;
        } else {
          [head, ...lines] = body.split(/\r?(\n)\r?/g);
          if (head) {
            tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
          }
          for (const line of lines) {
            if (line === '\n') {
              text = line;
              tokens.push({text, type: 'whitespace', offset, parent}), (offset += text.length);
            } else {
              const [indent] = INDENT.exec(line) || '';
              const inset = (indent && indent.length) || 0;
              if (inset) {
                for (const text of indent.split(/(\s+)/g)) {
                  if (!text) continue;
                  const type = (text.trim() && 'sequence') || 'whitespace';
                  tokens.push({text, type, offset, parent});
                  offset += text.length;
                }
                text = line.slice(inset) || '';
              } else {
                text = line;
              }
              if (text) {
                tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
              }
            }
          }
        }

        if (tokens.length) {
          const last = tokens[tokens.length - 1];
          if (!last.text) tokens.pop();
          return tokens;
        }
      }
    };

    {
      const quotes = html.closures.get('<').quotes;
      for (const opener of ['```', '~~~']) {
        const FenceClosure = mode.closures.get(opener);
        if (FenceClosure) {
          FenceClosure.matcher = new RegExp(raw`/(\s*\n)|(${opener}(?=\s|$)|^(?:[\s>|]*\s)?\s*)|.*$`, 'gm');
          FenceClosure.quotes = quotes;
          FenceClosure.open = open;
        }
      }
    }

    return mode;
  },
  {
    defaults: {get: () => ({...markdown.DEFAULTS})},
  },
);

Definitions: {
  Defaults: {
    markdown.DEFAULTS = {syntax: 'markdown', aliases: ['md'], requires: ['html']};
  }

  markdown.BLOCK = '```…``` ~~~…~~~';
  markdown.INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
  markdown.CLOSURES = `${markdown.BLOCK} ${markdown.INLINE}`;
  markdown.WHITESPACE = /^\s+|\s+$|\n+/;
  markdown.ESCAPES = /\\./;
  markdown.ENTITIES = /&#x?[a-f0-9]+;|&[a-z]+;/;
  markdown.FENCES = /(?:\x60{3,}|\x7E{3,})(?=\b| |$)/;
  markdown.RULES = /(?:[\-]{2,}|[=]{2,})(?=\s*$)/;
  markdown.BLOCKS = /(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S)/;
  markdown.TYPOGRAPHS = /\B[\–](?=\ )|"|'|=/;
  markdown.TAGS = /\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)/;
  markdown.BRACKETS = /<|>|\(|\)|\[|\]/;
  markdown.INLINES = /\b([*~_])(?:\3\b(?=[^\n]*[^\n\s\\]\3\3)|\b(?=[^\n]*[^\n\s\\]\3))|(?:\b|\b\B|\B)([*~_])\4?/;
  markdown.SPANS = /(``?(?![`\n]))[^\n]*?[^\\`\n]\5/;
  markdown.INDICIES = /\b(?:[\da-zA-Z]+\.)+[\da-zA-Z]+\.?/;
  markdown.DECIMAL = /[+\-]?\d+(?:,\d{3})*(?:\.\d+)?|[+\-]?\d*\.\d+/;
  markdown.EXPONENTIAL = /\d+[eE]\-?\d+|\d+\.\d+[eE]\-?\d+/;
  markdown.FRAGMENTS = /\b[^\n\s\[\]\(\)\<\>&`"]*[^\n\s\[\]\(\)\<\>&_`"]\b|[^\n\s\[\]\(\)\<\>&`"]+(?=__?\b)/;
}
