export class TokenSynthesizer {
  constructor(context) {
    const {
      mode: {syntax, keywords, assigners, operators, combinators, nonbreakers, comments, closures, breakers, patterns},
      punctuators,
      aggregators,
      spans,
      quotes,
      forming = true,
    } = context;

    const {maybeIdentifier, maybeKeyword, segments} = patterns || false;
    const wording = keywords || maybeIdentifier ? true : false;

    const matchSegment =
      segments &&
      (segments[Symbol.match] ||
        (!(Symbol.match in segments) &&
          (segments[Symbol.match] = (segments => {
            const sources = [];
            const names = [];
            for (const name of Object.getOwnPropertyNames(segments)) {
              const segment = segments[name];
              if (segment && segment.source && !/\\\d/.test(segment.source)) {
                names.push(name);
                sources.push(segment.source.replace(/\\?\((.)/g, (m, a) => (m[0] !== '\\' && a !== '?' && '(?:') || m));
              }
            }
            const {length} = names;
            if (!length) return false;
            const matcher = new RegExp(`(${sources.join('|)|(')}|)`, 'u');
            return text => {
              const match = matcher.exec(text);
              if (match[0]) for (let i = 1, n = length; n--; i++) if (match[i]) return names[i - 1];
            };
          })(segments))));

    const punctuate = text =>
      (operators && operators.includes(text) && 'operator') ||
      (closures && closures.includes(text) && 'closure') ||
      (breakers && breakers.includes(text) && 'breaker') ||
      (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
      (comments && comments.includes(text) && 'comment') ||
      (quotes && quotes.includes(text) && 'quote') ||
      (spans && spans.includes(text) && 'span') ||
      // TODO: Undo if breaking
      // (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
      // (operators && operators.includes(text) && 'operator') ||
      // (comments && comments.includes(text) && 'comment') ||
      // (spans && spans.includes(text) && 'span') ||
      // (quotes && quotes.includes(text) && 'quote') ||
      // (closures && closures.includes(text) && 'closure') ||
      // (breakers && breakers.includes(text) && 'breaker') ||
      false;
    const aggregate = text =>
      (assigners && assigners.includes(text) && 'assigner') ||
      (combinators && combinators.includes(text) && 'combinator') ||
      false;

    this.create = next => {
      if (next && next.text) {
        const {text, type, hint, previous, parent, last} = next;

        if (type === 'sequence') {
          ((next.punctuator =
            (previous && (aggregators[text] || (!(text in aggregators) && (aggregators[text] = aggregate(text))))) ||
            (punctuators[text] || (!(text in punctuators) && (punctuators[text] = punctuate(text)))) ||
            undefined) &&
            (next.type = 'punctuator')) ||
            (matchSegment &&
              (next.type = matchSegment(text)) &&
              (next.hint = `${(hint && `${hint} `) || ''}${next.type}`)) ||
            (next.type = 'sequence');
        } else if (type === 'whitespace') {
          next.breaks = text.match(LineEndings).length - 1;
        } else if (forming && wording) {
          const word = text.trim();
          // TODO: Undo if breaking
          word &&
            (((!maybeKeyword || maybeKeyword.test(word)) &&
              (keywords && keywords.includes(word)) &&
              (!last || last.punctuator !== 'nonbreaker' || (previous && previous.breaks > 0)) &&
              (next.type = 'keyword')) ||
              (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
          // word &&
          //   ((keywords &&
          //     keywords.includes(word) &&
          //     (!last || last.punctuator !== 'nonbreaker' || (previous && previous.breaks > 0)) &&
          //     (next.type = 'keyword')) ||
          //     (maybeIdentifier && maybeIdentifier.test(word) && (next.type = 'identifier')));
        } else {
          next.type = 'text';
        }

        previous && (previous.next = next) && (parent || (next.parent = previous.parent));

        return next;
      }
    };
  }
}

const LineEndings = /$/gm;
