// import {previousTextFrom, indenter, Symbols, Closures, sequence, escape, all, raw} from '../common/helpers.js';

// export const markout = Object.defineProperties(
//   ({syntax} = defaults, {html, markdown}) => {
//     const EMBEDDED = true;
//     const matcher = new RegExp(markout.MATCHER.source, markout.MATCHER.flags);

//     const mode = {
//       syntax,
//       comments: Closures.from('<!--…-->'),
//       quotes: [],
//       operators: Symbols.from(markdown.OPERATORS, markout.CLOSURES),
//       closures: Closures.from(html.closures, markdown.CLOSURES, markout.CLOSURES),
//       matcher: matcher,
//       spans: Closures.from('``…`` `…`'),
//       matchers: {comment: /(\n)|(-->)/g},
//     };

//     const open = (parent, state, grouper) => {
//       const {source, index: start} = state;
//       const fence = parent.text;
//       const fencing = previousTextFrom(parent, '\n');
//       const indenting = fencing.slice(fencing.indexOf('\n') + 1, -fence.length) || '';
//       let end = source.indexOf(`\n${fencing}`, start);
//       const INDENT = (indenting && indenter(indenting)) || /^/m;
//       const CLOSER = new RegExp(raw`^${INDENT.source.slice(1) || ''}${fence}`, 'mg');

//       CLOSER.lastIndex = start;
//       let closerMatch = CLOSER.exec(source);
//       if (closerMatch && closerMatch.index >= start) {
//         end = closerMatch.index;
//       } else {
//         const FENCE = new RegExp(raw`^[\>\|\s]*${fence}`, 'mg');
//         FENCE.lastIndex = start;
//         const fenceMatch = FENCE.exec(source);
//         if (fenceMatch && fenceMatch.index >= start) {
//           end = fenceMatch.index;
//         } else return;
//       }

//       if (end > start) {
//         let offset = start;
//         let text, head, lines;

//         const body = source.slice(start, end) || '';
//         const tokens = [];
//         tokens.end = end;
//         if (!EMBEDDED) {
//           text = body;
//           tokens.push({text, type: 'code', offset, parent});
//           offset += body.length;
//         } else {
//           [head, ...lines] = body.split(/\r?(\n)\r?/g);
//           if (head) {
//             tokens.push({text: head, type: 'comment', offset, parent}), (offset += head.length);
//           }
//           for (const line of lines) {
//             if (line === '\n') {
//               text = line;
//               tokens.push({text, type: 'whitespace', offset, parent}), (offset += text.length);
//             } else {
//               const [indent] = INDENT.exec(line) || '';
//               const inset = (indent && indent.length) || 0;
//               if (inset) {
//                 for (const text of indent.split(/(\s+)/g)) {
//                   if (!text) continue;
//                   const type = (text.trim() && 'sequence') || 'whitespace';
//                   tokens.push({text, type, offset, parent});
//                   offset += text.length;
//                 }
//                 text = line.slice(inset) || '';
//               } else {
//                 text = line;
//               }
//               if (text) {
//                 tokens.push({text, type: 'code', offset, parent}), (offset += text.length);
//               }
//             }
//           }
//         }

//         if (tokens.length) {
//           const last = tokens[tokens.length - 1];
//           last.text || tokens.pop();
//           return tokens;
//         }
//       }
//     };

//     {
//       const quotes = html.closures.get('<').quotes;
//       for (const opener of ['```', '~~~']) {
//         const FenceClosure = mode.closures.get(opener);
//         if (FenceClosure) {
//           FenceClosure.matcher = new RegExp(raw`/(\s*\n)|(${opener}(?=\s|$)|^(?:[\s>|]*\s)?\s*)|.*$`, 'gm');
//           FenceClosure.quotes = quotes;
//           FenceClosure.open = open;
//         }
//       }
//     }

//     return mode;
//   },
//   {
//     defaults: {get: () => ({...markout.DEFAULTS})},
//   },
// );

// Definitions: {
//   Defaults: {
//     markout.DEFAULTS = {syntax: 'markout', aliases: ['momd', 'md'], requires: ['md', 'html']};
//   }

//   markout.BLOCK = '```…``` ~~~…~~~';
//   markout.INLINE = '[…] (…)'; // *…* **…** _…_ __…__ ~…~ ~~…~~
//   markout.CLOSURES = `${markout.BLOCK} ${markout.INLINE}`;

//   // Partials are first character used in production forms (like `###`)
//   //   which need to be properly typed by the tokenizer
//   markout.PARTIALS = Symbols.from(raw`< # >`);

//   // Punctuation is used to define both ESCAPES and OPERATORS which
//   //   requires the fine-grained intersection that excludes partials.
//   markout.PUNCTUATION = Symbols.from(raw`< # > ! " $ % & ' ( ) * + , - . / : ; = ? @ [ \ ] ^ _ ${'`'} { | } ~`);

//   // Operators are productions and their escaped forms.
//   markout.OPERATORS = Symbols.from(
//     raw`** * ~~ ~  __ _ ###### ##### #### ### ## # [ ] ( ) ${[...markout.PUNCTUATION]
//       .map(s => `\\${s.repeat(2)} ${s.repeat(2)} \\${s}`)
//       .join(' ')}`,
//   );

//   markout.MATCHER = sequence`${all(
//     sequence`(${(markout.WHITESPACE = /^\s+|\s+$|\n+/)})`,
//     sequence`(${all(
//       (markout.ESCAPES = sequence`${all(
//         ...[...markout.PUNCTUATION].map(s => raw`\\${escape(s).repeat(2)}|\\${escape(s)}`),
//       )}|\\.${'/gu'}`),
//       (markout.ENTITIES = /&#x?[a-f0-9]+;|&[a-z]+;/u),
//       (markout.INLINES = /((?:\b|\B)[*~]{1,2}|[*~]{1,2}(?:\b|\B)|\b_{1,2}|_{1,2}\b)/u),
//       (markout.RULES = /(?:[-]{2,}|[=]{2,})(?=\s*$)/u),
//       (markout.BLOCKS = /(?:\B#{1,6}|-|\b\d+\.|\b[a-z]\.|\b[ivx]+\.)(?=\s+\S)/u),
//       (markout.TYPOGRAPHS = /\B–(?= )|"|'|=/u),
//       (markout.TAGS = /\/>|<%|%>|<!--|-->|<[/!]?(?=[a-z]+:?[-a-z]*[a-z]|[a-z]+)/u),
//       (markout.BRACKETS = /<|>|\(|\)|\[|\]/u),
//       (markout.FENCES = /(?:\x60{3,}|\x7E{3,})(?=\b| |$)/u),
//       (markout.SPANS = /(``?(?![`\n]))[^\n]*?[^\\`\n]\4/),
//     )})`,
//     (markout.INDICIES = /\b(?:[\da-zA-Z]+\.)+[\da-zA-Z]+\.?/u),
//     (markout.DECIMAL = /[-+]?\d+(?:,\d{3})*(?:\.\d+)?|[-+]?\d*\.\d+/u),
//     (markout.EXPONENTIAL = /\d+[eE]-?\d+|\d+\.\d+[eE]-?\d+/u),
//     (markout.FRAGMENTS = /\b[^\\\n\s\][)(><&`"*~]*[^\\\n\s\][)(><&`"*~_]\b|[^\\\n\s\][)(><&`"*~]+?(?=__?\b)/),
//   )}${'/guim'}`;
// }

// /** @typedef {import('./markdown-grammar.js').markdown} markdown */
// /** @typedef {markdown} x */
