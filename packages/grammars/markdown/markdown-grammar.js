import {previousTextFrom, indenter, Symbols, Closures, sequence, escape, all, raw} from '../common/helpers.js';

export const markdown = Object.defineProperties(
  ({syntax} = defaults, {html}) => {
    const EMBEDDED = true;
    const matcher = new RegExp(markdown.MATCHER.source, markdown.MATCHER.flags);

    const mode = {
      syntax,
      comments: Closures.from('<!--…-->'),
      quotes: [],
      operators: markdown.OPERATORS,
      closures: Closures.from(html.closures, markdown.CLOSURES),
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
          last.text || tokens.pop();
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
  markdown.INLINE = '[…] (…)'; // *…* **…** _…_ __…__ ~…~ ~~…~~
  markdown.CLOSURES = `${markdown.BLOCK} ${markdown.INLINE}`;

  // Partials are first character used in production forms (like `###`)
  //   which need to be properly typed by the tokenizer
  markdown.PARTIALS = Symbols.from(raw`< # >`);

  // Punctuation is used to define both ESCAPES and OPERATORS which
  //   requires the fine-grained intersection that excludes partials.
  markdown.PUNCTUATION = Symbols.from(raw`< # > ! " $ % & ' ( ) * + , - . / : ; = ? @ [ \ ] ^ _ ${'`'} { | } ~`);

  // Operators are productions and their escaped forms.
  markdown.OPERATORS = Symbols.from(
    raw`** * ~~ ~  __ _ ###### ##### #### ### ## # [ ] ( ) ${[...markdown.PUNCTUATION].map(s => `\\${s.repeat(2)} ${s.repeat(2)} \\${s}`).join(' ')}`,
  );

  markdown.MATCHER = sequence`${all(
    sequence`(${(markdown.WHITESPACE = /^\s+|\s+$|\n+/)})`,
    sequence`(${all(
      (markdown.ESCAPES = sequence`${all(
        ...[...markdown.PUNCTUATION].map(s => raw`\\${escape(s).repeat(2)}|\\${escape(s)}`),
      )}|\\.${'/gu'}`),
      (markdown.ENTITIES = /&#x?[a-f0-9]+;|&[a-z]+;/u),
      (markdown.INLINES = /((?:\b|\B)[*~]{1,2}|[*~]{1,2}(?:\b|\B)|\b_{1,2}|_{1,2}\b)/u),
      (markdown.RULES = /(?:[-]{2,}|[=]{2,})(?=\s*$)/u),
      (markdown.BLOCKS = /(?:\B#{1,6}|-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S)/u),
      (markdown.TYPOGRAPHS = /\B–(?= )|"|'|=/u),
      (markdown.TAGS = /\/>|<\?|\?>|<!--|-->|<[/!]?(?=[a-z]+:?[-a-z]*[a-z]|[a-z]+)/u),
      (markdown.BRACKETS = /<|>|\(|\)|\[|\]/u),
      (markdown.FENCES = /(?:\x60{3,}|\x7E{3,})(?=\b| |$)/u),
      (markdown.SPANS = /(``?(?![`\n]))[^\n]*?[^\\`\n]\4/),
    )})`,
    (markdown.INDICIES = /\b(?:[\da-zA-Z]+\.)+[\da-zA-Z]+\.?/u),
    (markdown.DECIMAL = /[-+]?\d+(?:,\d{3})*(?:\.\d+)?|[-+]?\d*\.\d+/u),
    (markdown.EXPONENTIAL = /\d+[eE]-?\d+|\d+\.\d+[eE]-?\d+/u),
    (markdown.FRAGMENTS = /\b[^\\\n\s\][)(><&`"*~]*[^\\\n\s\][)(><&`"*~_]\b|[^\\\n\s\][)(><&`"*~]+?(?=__?\b)/),
  )}${'/guim'}`;
}
