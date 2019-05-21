import {countLineBreaks} from '../core.js';

export class TokenSynthesizer {
  constructor(context) {
    const {
      mode: {
        keywords,
        patterns: {
          maybeIdentifier,
          maybeKeyword,
          segments: {
            [SEGMENT]: matchSegment = context.mode.patterns.segments &&
              (context.mode.patterns.segments[SEGMENT] = createSegmenter(context.mode.patterns.segments)),
          } = (context.mode.patterns.segments = false),
        } = (context.mode.patterns = false),
      },
      punctuators,
      aggregators,
      forming = (context.forming = true),
      wording = (context.wording = keywords || maybeIdentifier ? true : false),
      [PUNCTUATOR]: matchPunctuator = (context[PUNCTUATOR] = createPunctuator(context)),
      [AGGREGATOR]: matchAggregator = (context[AGGREGATOR] = createAggregator(context)),
    } = context;

    this.create = next => {
      const {text, type, hint, previous, parent, last} = next;
      type === 'sequence'
        ? ((next.punctuator =
            (previous &&
              (aggregators[text] || (!(text in aggregators) && (aggregators[text] = matchAggregator(text))))) ||
            (punctuators[text] || (!(text in punctuators) && (punctuators[text] = matchPunctuator(text)))) ||
            undefined) &&
            (next.type = 'punctuator')) ||
          (matchSegment &&
            (next.type = matchSegment(text)) &&
            (next.hint = `${(hint && `${hint} `) || ''}${next.type}`)) ||
          (next.type = 'sequence')
        : type === 'whitespace'
        ? // ? (next.lineBreaks = text.match(LineEndings).length - 1)
          (next.lineBreaks = countLineBreaks(text))
        : forming && wording
        ? text &&
          (((!maybeKeyword || maybeKeyword.test(text)) &&
            (keywords && keywords.includes(text)) &&
            (!last || last.punctuator !== 'nonbreaker' || (previous && previous.lineBreaks > 0)) &&
            (next.type = 'keyword')) ||
            (maybeIdentifier && maybeIdentifier.test(text) && (next.type = 'identifier')))
        : (next.type = 'text');

      previous && (previous.next = next) && (parent || (next.parent = previous.parent));

      return next;
    };
  }
}

Object.freeze(Object.freeze(TokenSynthesizer.prototype).constructor);

const PUNCTUATOR = Symbol('[punctuator]');
const AGGREGATOR = Symbol('[aggregator]');
const SEGMENT = Symbol('[segment]');

const createSegmenter = segments => {
  const sources = [];
  const names = [];
  for (const name of Object.getOwnPropertyNames(segments)) {
    const segment = segments[name];
    if (segment && segment.source && !/\\\d/.test(segment.source)) {
      names.push(name);
      sources.push(segment.source.replace(/\\?\((.)/g, (m, a) => (m[0] !== '\\' && a !== '?' && '(?:') || m));
    }
  }
  const length = names.length;
  if (!length) return false;
  const matcher = new RegExp(`(${sources.join('|)|(')}|)`, 'u');
  return text => {
    const match = matcher.exec(text);
    if (match[0]) for (let i = 1, n = length; n--; i++) if (match[i]) return names[i - 1];
  };
};

const createPunctuator = ({mode: {operators, nonbreakers, comments, closures, breakers}, quotes, spans}) => {
  return text =>
    (operators && operators.includes(text) && 'operator') ||
    (closures && closures.includes(text) && 'closure') ||
    (breakers && breakers.includes(text) && 'breaker') ||
    (nonbreakers && nonbreakers.includes(text) && 'nonbreaker') ||
    (comments && comments.includes(text) && 'comment') ||
    (quotes && quotes.includes(text) && 'quote') ||
    (spans && spans.includes(text) && 'span') ||
    false;
};

const createAggregator = ({mode: {assigners, combinators}}) => {
  return text =>
    (assigners && assigners.includes(text) && 'assigner') ||
    (combinators && combinators.includes(text) && 'combinator') ||
    false;
};
