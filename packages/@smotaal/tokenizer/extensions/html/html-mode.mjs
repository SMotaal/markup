import {matchers} from '../common.mjs';
import {Closures, Symbols, raw} from '../helpers.mjs';

export const html = Object.defineProperties(
  ({syntax} = html.defaults) => {
    const html = {
      syntax,
      keywords: Symbols.from('DOCTYPE doctype'),
      comments: Closures.from('<!--…-->'),
      // operators: Symbols.from('='),
      closures: Closures.from('<%…%> <!…> <…/> </…> <…>'),
      quotes: [],
      patterns: {
        maybeKeyword: /^[a-z](\w*)$/i,
        closeTag: /<\/\w[^<>{}]*?>/g,
        maybeIdentifier: /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/,
      },
      matcher: matchers.xml,
      matchers: {
        quote: /(\n)|(\\(?:(?:\\\\)*\\|[^\\\s])|"|')/g,
        comment: /(\n)|(-->)/g,
      },
    };

    const DOCTAGS = Symbols.from('SCRIPT STYLE');
    const TAG = /^[a-z]+$/i;
    // TODO: Check if custom/namespace tags ever need special close logic
    // const TAGLIKE = /^(?:(?:[a-z][\-a-z]*)?[a-z]+\:)?(?:[a-z][\-a-z]*)?[a-z]+$/i;

    const HTMLTagClosure = html.closures.get('<');

    HTMLTagClosure.patterns = html.patterns;

    HTMLTagClosure.close = (next, state, context) => {
      const parent = next && next.parent;
      const first = parent && parent.next;
      const tag = first && first.text && TAG.test(first.text) && first.text.toUpperCase();

      if (tag && DOCTAGS.includes(tag)) {
        // TODO: Uncomment once token buffering is implemented
        // tag && (first.type = 'keyword');

        let {source, index} = state;
        const $$matcher = html.patterns.closeTag;

        let match; //  = $$matcher.exec(source);
        $$matcher.lastIndex = index;

        // TODO: Check if `<script>`…`</SCRIPT>` is still valid!
        const $$closer = new RegExp(raw`^<\/(?:${first.text.toLowerCase()}|${tag})\b`);

        let syntax = (tag === 'STYLE' && 'css') || '';

        if (!syntax) {
          const openTag = source.slice(parent.offset, index);
          const match = /\stype=.*?\b(.+?)\b/.exec(openTag);
          syntax = tag === 'SCRIPT' && (!match || !match[1] || /^module$|javascript/i.test(match[1])) ? 'es' : '';
          // console.log({syntax, tag, match, openTag});
        }

        while ((match = $$matcher.exec(source))) {
          if ($$closer.test(match[0])) {
            if (syntax) {
              return {offset: index, index: match.index, syntax};
            } else {
              const offset = index;
              const text = source.slice(offset, match.index - 1);
              state.index = match.index;
              return [{text, offset, previous: next, parent}];
            }
          }
        }
      }
    };
    // HTMLTagClosure.operators = Symbols.from('=');
    HTMLTagClosure.quotes = Symbols.from(`' "`);
    HTMLTagClosure.closer = /\/?>/;

    return html;
  },
  {
    defaults: {value: {syntax: 'html', aliases: ['htm']}},
  },
);
