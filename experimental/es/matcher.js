import {Matcher} from '/modules/matcher/matcher.js';
import {ranges} from './ranges.js';
import {keywords, goals, symbols, FaultGoal} from './definitions.js';

const {
  [symbols.ECMAScriptGoal]: ECMAScriptGoal,
  [symbols.CommentGoal]: CommentGoal,
  [symbols.RegExpGoal]: RegExpGoal,
  [symbols.StringGoal]: StringGoal,
  [symbols.TemplateLiteralGoal]: TemplateLiteralGoal,
} = goals;

const dummy = () => {
  /*
  prettier-ignore
  */ //
  {
    let i\u0032;

    this.new.target;

    /abc[()]/;

    a = b
    /hi/g.exec(c).map(d);
  }
};

/**
 * @returns {'fault'}
 */
const fault = (text, state) => {
  return 'fault';
};

const reset = (group, goal, state) => {
  (state.nextGroup = group) && (goal || (goal = group.goal));
  goal && (state.nextGoal = goal);
};

const capture = (identity, match, text) => {
  match.capture[(match.identity = identity)] = text || match[0];
  (match.fault = identity === 'fault') && (match.flatten = false);
  return match;
};

const open = (text, state) => {
  const {goal: initialGoal, groups} = state;
  const group = initialGoal.groups[text];

  if (!group) return initialGoal.type || 'sequence';

  groups.closers.splice(groups.push(group) - 1, groups.closers.length, group.closer);
  reset(group, group.goal || initialGoal, state);

  return 'opener';
};

const close = (text, state) => {
  const {goal: initialGoal, group: initialGroup, groups} = state;
  const index = groups.closers.lastIndexOf(text);

  if (index === -1 || index !== groups.length - 1) return fault(text, state);

  groups.closers.splice(index, groups.closers.length);

  const [closedGroup] = groups.splice(index, groups.length);

  reset(groups[index - 1], closedGroup && closedGroup.parentGoal, state);

  return 'closer';
};

const toggle = (text, state) => {
  return !state.group || state.group.closer !== text ? open(text, state) : close(text, state);
};

const ECMAScriptGrammar = {
  Break: ({lf = true, crlf = false} = {}) =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${Matcher.join(lf && '\\n', crlf && '\\r\\n')}
        ${entity((text, entity, match, state) => {
          capture('break', match, text);
          state.group && state.group.closer === '\n' && close(text, state);
          match.flatten = false;
        })}
      )`,
    ),
  Whitespace: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \s+
        ${entity((text, entity, match, state) => {
          capture((match.flatten = (state.lineOffset || -1) + 1 !== match.index) ? 'whitespace' : 'inset', match, text);
        })}
      )`,
    ),
  Escape: () =>
    Matcher.define(
      entity => Matcher.sequence`(\\(?:
        ${entity((text, entity, match, {goal}) => {
          capture(goal.type || 'escape', match, (match.capture[keywords[text]] = text));
        })}
        f|n|r|t|v|c[${ranges.ControlLetter}]
        |x[${ranges.HexDigit}]{2}
        |u\{[${ranges.HexDigit}]{1,4}\}
        |(
          u[${ranges.HexDigit}]{4}
          ${entity((text, entity, match, {goal, previousToken}) => {
            capture(
              goal.type ||
              (previousToken &&
                previousToken.type === 'identifier' &&
                ECMAScriptUnicodeIDContinue.test(String.fromCodePoint(parseInt(text.slice(2), 16))) &&
                'identifier') || // `let i\u0032` -> identifier tokens
                'escape',
              match,
              text,
            );
          })}
        )
        |.
      ))`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/|\/\*|\*\/
        ${entity((text, entity, match, state) => {
          match.flatten = !(
            capture(
              state.goal === ECMAScriptGoal
                ? open(text, state)
                : state.goal === CommentGoal && state.group.closer === text
                ? close(text, state)
                : 'sequence',
              match,
              text,
            ).fault ||
            ((match.identity === 'opener' || match.identity === 'closer') && (match.punctuator = CommentGoal.type))
          );
        })}
      )`,
    ),
  StringLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        "|'
        ${entity((text, entity, match, state) => {
          match.flatten = !(
            capture(
              state.goal === ECMAScriptGoal
                ? open(text, state)
                : state.goal === StringGoal && state.group.closer === text
                ? close(text, state)
                : 'sequence',
              match,
              text,
            ).fault ||
            ((match.identity === 'opener' || match.identity === 'closer') && (match.punctuator = match.identity))
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${ranges.GraveAccent}
        ${entity((text, entity, match, state) => {
          match.flatten = !(
            capture(
              state.goal === ECMAScriptGoal
                ? open(text, state)
                : state.goal === TemplateLiteralGoal && state.group.closer === text
                ? close(text, state)
                : state.goal.type || 'sequence',
              match,
              text,
            ).fault ||
            ((match.identity === 'opener' || match.identity === 'closer') && (match.punctuator = match.identity))
          );
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \$\{|\{|\(|\[
        ${entity((text, entity, match, state) => {
          match.flatten = !(
            capture(open(text, state), match, text).fault ||
            (match.identity === 'opener' && (match.punctuator = 'opener'))
          );
        })}
      )`,
    ),
  Closer: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \}|\)|\]
        ${entity((text, entity, match, state) => {
          match.flatten = !(
            capture(close(text, state), match, text).fault ||
            (match.identity === 'closer' && (match.punctuator = 'closer'))
          );
        })}
      )`,
    ),
  Solidus: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/
        ${entity((text, entity, match, state) => {
          const {goal, previousAtom, group} = state;

          let previousText, previousType;

          match.flatten = !(
            capture(
              goal === RegExpGoal
                ? close(text, state)
                : goal !== ECMAScriptGoal
                ? goal.type || 'sequence'
                : !previousAtom ||
                  ({text: previousText, type: previousType} = previousAtom).punctuator ||
                  (previousType === 'operator' &&
                    (previousText !== '++' && previousText !== '--' && previousText !== ')')) ||
                  previousType === 'keyword'
                ? open(text, state)
                : 'operator',
              match,
              text,
            ).fault ||
            match.identity === 'operator' ||
            ((match.identity === 'opener' || (match.identity === 'closer' && !(state.goal = undefined))) &&
              (match.punctuator = match.identity))
          );
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${entity((text, entity, match, {goal}) => {
          // TODO: Add conditional lookahead (or look behined)
          capture(
            (match.flatten = goal !== ECMAScriptGoal) ? goal.type || 'sequence' : 'operator',
            match,
            (match.capture[keywords[text]] = text),
          );
        })}
        ,|;|\.\.\.|\.|:|\?|=>
        |\+\+|--
        |\+=|-=|\*\*=|\*=|\/=
        |&&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~
        |<<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>
        |!==|!=|!|===|==|=
        |\+|-|\*\*|\*
        |${entity(ECMAScriptGrammar.Solidus())}
      )`,
    ),
  Keyword: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        (?:${Object.keys(keywords).join('|')})(?=[^\s$_:]|\s+[^:])
        ${entity((text, entity, match, {goal, previousAtom}) => {
          // TODO: Add conditional lookahead (or look behined)
          capture(
            (match.flatten = goal !== ECMAScriptGoal)
              ? goal.type || 'sequence'
              : !(match.flatten = !(!previousAtom || previousAtom.text !== '.'))
              ? 'keyword'
              : 'identifier',
            match,
            (match.capture[keywords[text]] = text),
          );
        })}
      )\b`,
    ),
  Identifier: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${entity((text, entity, match, {goal}) => {
          // TODO: Add conditional lookahead (or look behined)

          capture((match.flatten = goal !== ECMAScriptGoal) ? goal.type || 'sequence' : 'identifier', match, text);
        })}
        ${entity(ECMAScriptGrammar.IdentifierStart())}
        ${entity(ECMAScriptGrammar.IdentifierContinue())}?
      )`,
      'u',
    ),
  IdentifierStart: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${entity(symbols.UnicodeIDStart)}
        [${ranges.UnicodeIDStart}]
      )`,
      'u',
    ),
  IdentifierContinue: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        ${entity(symbols.UnicodeIDContinue)}
        [${ranges.UnicodeIDContinue}]+
      )`,
      'u',
    ),
};

const ECMAScriptUnicodeIDContinue = RegExp(ECMAScriptGrammar.IdentifierContinue(), 'u');

export const matcher = Matcher.define(
  entity => Matcher.sequence`
    ${entity(ECMAScriptGrammar.Break())}
    |${entity(ECMAScriptGrammar.Whitespace())}
    |${entity(ECMAScriptGrammar.Escape())}
    |${entity(ECMAScriptGrammar.Comment())}
    |${entity(ECMAScriptGrammar.StringLiteral())}
    |${entity(ECMAScriptGrammar.TemplateLiteral())}
    |${entity(ECMAScriptGrammar.Opener())}
    |${entity(ECMAScriptGrammar.Closer())}
    |${entity(ECMAScriptGrammar.Operator())}
    |${entity(ECMAScriptGrammar.Keyword())}
    |${entity(ECMAScriptGrammar.Identifier())}
    |.
  `,
  'gu',
);

matcher.goal = ECMAScriptGoal;
