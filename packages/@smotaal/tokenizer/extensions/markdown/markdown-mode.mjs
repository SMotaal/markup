import {previousTextFrom, indenter, Closures, sequence, all, raw} from '../helpers.mjs';

const defaults = {syntax: 'markdown', aliases: ['md'], requires: ['html']};

const BLOCK = '```…``` ~~~…~~~';
const INLINE = '[…] (…) *…* **…** _…_ __…__ ~…~ ~~…~~';
const CLOSURES = `${BLOCK} ${INLINE}`;

const EMBEDDED = true;
// const SYNTAX = /^\w+$/;

const WHITESPACE = /^\s+|\s+$|\n/;

const ESCAPES = /\\./;
const ENTITIES = /&#x?[a-f0-9]+;|&[a-z]+;/;
// const FENCES = /```/;
// const FENCES = /[`]{3,}(?=[a-z]* \n|\n?)/;
const FENCES = /(?:\x60{3,}|\x7E{3,})(?=\b| |$)/;
// const RULES = /--+|==+/;
// const RULES = /(?:--+|==+)(?=\s*$)/;
const RULES = /(?:[\-]{2,}|[=]{2,})(?=\s*$)/;
// const BLOCKS = /\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\./;
const BLOCKS = /(?:\#{1,6}|\-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S)/;
const TYPOGRAPHS = /\B[–—](?=\ )|"|'|=/;
const TAGS = /\/>|<%|%>|<!--|-->|<[\/\!]?(?=[a-z]+\:?[a-z\-]*[a-z]|[a-z]+)/;
const BRACKETS = /<|>|\(|\)|\[|\]/;
// const INLINES = /__?|\b([*~`])\3?\b|(?:\b|\b\B|\B)([*~`])\4?/;
const INLINES = /\b([*~_])(?:\3\b(?=[^\n]*[^\n\s\\]\3\3)|\b(?=[^\n]*[^\n\s\\]\3))|(?:\b|\b\B|\B)([*~_])\4?/;
// const INLINES = /\B([*~`_])\3(?=[^\n]*[^\n\s\\]\3\3)\b|([*~`_]{1,2})(?!\b)/;
// const INLINES = /__?|([*~])\3?\b|(?:\b|\B)([*~])\4?|([^\s\w])\5*?/;
// const INLINES = /__?|([*~])\3?|([^\s\w])\5*?/;
// const INLINES = /([*~_])\3?/;
// const INLINES = /\*\*?|\~\~?|__?/;
const SPANS = /(``?(?![`\n]))[^\n]*?[^\\`\n]\5/;
// const SPANS = /\B``(?![`\n])[^\n]*?[^\\`\n]``\B|\B`(?![`\n])[^\n]*?[^\\`\n]`\B/;
// const SPANS = /```|(?:\B|^)(``*)(?=[^\n]+`|[^`]*$)(?:.*?\4)?/;
const INDICIES = /\b(?:[\da-zA-Z]+\.)+[\da-zA-Z]+\.?/;
const DECIMAL = /[+\-]?\d+(?:,\d{3})*(?:\.\d+)?|[+\-]?\d*\.\d+/;
const EXPONENTIAL = /\d+[eE]\-?\d+|\d+\.\d+[eE]\-?\d+/;
const FRAGMENTS = /\b[^\n\s\[\]\(\)\<\>&`]*[^\n\s\[\]\(\)\<\>&_`]\b|[^\n\s\[\]\(\)\<\>&`]+(?=__?\b)/;

export const markdown = Object.defineProperties(
  ({syntax} = defaults, {html}) => {
    const matcher = ((...matchers) => {
      let matcher = matchers[matchers.length - 1];
      try {
        matchers.push(
          (matcher = sequence`${all(
            sequence`(${WHITESPACE})`,
            sequence`(${all(
              ESCAPES,
              ENTITIES,
              RULES,
              BLOCKS,
              INLINES,
              TYPOGRAPHS,
              TAGS,
              BRACKETS,
              FENCES,
              SPANS,
              // sequence`(?:${FENCES}|(?:${RULES})(?=\s*$)|(?:${BLOCKS})(?=\s+\S*))`
            )})`,
            INDICIES,
            DECIMAL,
            EXPONENTIAL,
            FRAGMENTS,
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
      sequence`(${WHITESPACE})|(${ENTITIES}|(?:${FENCES}|(?:${RULES})(?=\s*$)|(?:${BLOCKS})(?=\s+\S*))|${TYPOGRAPHS}|${TAGS}|${BRACKETS}|${INLINES})|${FRAGMENTS}|${ESCAPES}${'/gim'}`,
    );

    // matcher.matchers && console.log('\n\n%s'.repeat(matcher.matchers.length), ...matcher.matchers);

    const markdown = {
      syntax,
      comments: Closures.from('<!--…-->'),
      quotes: [],
      closures: Closures.from(html.closures, CLOSURES),
      // patterns: {...html.patterns},
      matcher: matcher,
      spans: Closures.from('``…`` `…`'),
      matchers: {comment: /(\n)|(-->)/g},
    };

    const open = (parent, state, grouper) => {
      const {source, index: start} = state;
      const fence = parent.text;
      const fencing = previousTextFrom(parent, '\n');
      const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
      // let end = source.indexOf(`\n${fencing}`, start);
      let end = source.indexOf(`\n${fencing}`, start);
      const INDENT = (indenting && indenter(indenting)) || /^/m;
      // const CLOSER = new RegExp(raw`\n${INDENT.source.slice(1)}${fence}`, 'g');
      // const CLOSER = new RegExp(raw`\n${indenting ? INDENT.source.slice(1) : ''}${fence}`, 'g');
      const CLOSER = new RegExp(raw`^${INDENT.source.slice(1) || ''}${fence}`, 'mg');

      CLOSER.lastIndex = start;
      let closerMatch = CLOSER.exec(source);
      // console.log({INDENT, indenting, fence, start, closerMatch});
      if (closerMatch && closerMatch.index >= start) {
        // end = closerMatch.index + (indenting ? 1 : 0);
        end = closerMatch.index;
      } else {
        // const FENCE = new RegExp(raw`\n?[\>\|\s]*${fence}`, 'g');
        // const FENCE = new RegExp(raw`\n[\>\|\s]*${fence}`, 'g');
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
              console.log(line, indent, INDENT);
            }
          }
          // } else {
          //   for (const line of lines) {

          //   }
          //   text = lines.join('');
          //   tokens.push({text, type: 'code', offset, parent})
          //   offset += text.length;
          // }
        }

        // console.log({fencing, body, start, end, offset, head, lines, tokens});
        if (tokens.length) {
          const last = tokens[tokens.length - 1];
          if (!last.text) tokens.pop();
          // if (last.text === '\n') tokens.pop();
          return tokens;
        }
      }
      // console.log({end, start, closerMatch});
    };

    {
      const quotes = html.closures.get('<').quotes;
      for (const opener of ['```', '~~~']) {
        const FenceClosure = markdown.closures.get(opener);
        if (FenceClosure) {
          FenceClosure.matcher = new RegExp(
            // raw`/(\s*\n)|(${opener}(?=${opener}\s|${opener}$)|^(?:[\s>|]*\s)?\s*)|.*$`,
            raw`/(\s*\n)|(${opener}(?=\s|$)|^(?:[\s>|]*\s)?\s*)|.*$`,
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
