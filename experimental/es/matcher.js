import {Matcher} from '/modules/matcher/matcher.js';
import {entities, identities, goals, groups, symbols} from './definitions.js';

const {[symbols.ECMAScriptGoal]: ECMAScriptGoal, [symbols.TemplateLiteralGoal]: TemplateLiteralGoal} = goals;

const capture = (identity, match, text) => {
  match.capture[(match.identity = identity)] = text || match[0];
  return match;
};

const dummy = () => {
  /*
  prettier-ignore
  */
  let i\u0032;
};

/**
 * @returns {'fault'}
 */
const fault = (text, entity, match) => {
  return 'fault';
};

const open = (text, entity, match) => {
  const state = match.matcher.state;
  if (!(state.goal || ECMAScriptGoal).openers.includes(text)) {
    return;
  }
  const group = groups[text];
  if (!group || !group.opener || !group.closer) {
    return;
  }
  state.groups || (state.groups = []);
  state.groups.closers || (state.groups.closers = []);
  state.groups.closers.splice(state.groups.push(group) - 1, state.groups.closers.length, group.closer);
  state.goal = (group.goal && goals[group.goal]) || undefined;
  return 'opener';
};

const close = (text, entity, match) => {
  const state = match.matcher.state;
  if (state.goal && state.goal.closer !== text) {
    return state.goal.type;
  }
  const groups = state.groups;
  const index = groups && groups.closers ? groups.closers.lastIndexOf(text) : -1;
  if (index === -1 || index !== groups.length - 1) {
    return fault(text, entity, match);
  }
  groups.splice(index, groups.length);
  groups.closers.splice(index, groups.closers.length);
  const group = groups[index - 1];
  state.goal = (group && group.goal && goals[group.goal]) || undefined;
  return 'closer';
};

const toggle = (text, entity, match) => {
  const state = match.matcher.state;
  // const groups = match.matcher.state.groups;
  state.goal && state.goal.closer === text
    ? // groups && groups.length && groups.closers[groups.length - 1] === text
      close(text, entity, match)
    : open(text, entity, match);
};

const ECMAScriptGrammar = {
  Break: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \n|\r\n
        ${entity((text, entity, match) => {
          // TODO: Consider dropping /m flag
          capture('break', match);
          const state = match.matcher.state;
          state.lineFault = false;
          state.lineIndex++; // = (state.lineIndex || 0) + 1;
          state.lineOffset = match.index + text.length - 1;
        })}
      )`,
    ),
  Escape: captureSymbols =>
    Matcher.define(entity =>
      captureSymbols
        ? Matcher.sequence`(\\${entity('escape')}(?:
          x(${entity(symbols.HexDigits)}[${entities.HexDigit}]{2})|
          u(${entity(symbols.HexDigits)}[${entities.HexDigit}]{4})|
          u\{(${entity(symbols.CodePoint)}[${entities.HexDigit}]{1,4})\}|
          (${entity(symbols.ControlEscape)}f|n|r|t|v)|
          c(${entity(symbols.ControlLetter)}[${entities.ControlLetter}])|
          (${entity(symbols.CharacterEscape)}.)
        ))`
        : Matcher.sequence`(\\${entity('escape')}(?:
          x[${entities.HexDigit}]{2}|
          u[${entities.HexDigit}]{4}|u\{[${entities.HexDigit}]{1,4}\}|
          f|n|r|t|v|c[${entities.ControlLetter}]|.
        ))`,
    ),
  Comment: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \/\/.*|\/\*[^]*?(?:\*\/|$)
        ${entity((text, entity, match) => {
          const state = match.matcher.state;

          text[1] === '*' &&
            state.previousToken &&
            state.previousToken.type === 'inset' &&
            (match.capture['inset'] = state.previousToken.text);

          (!state.goal || state.goal === ECMAScriptGoal) && capture('comment', match, text);
        })}
      )`,
    ),
  Whitespace: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        \s+
        ${entity((text, entity, match) => {
          capture(((match.matcher.state.lineOffset || -1) + 1 === match.index && 'inset') || 'whitespace', match);
        })}
      )`,
    ),
  StringLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(
        "(?:[^"\\\n]+?(?=\\.|")|\\.)*?"|
        '(?:[^'\\\n]+?(?=\\.|')|\\.)*?'
        ${entity((text, entity, match) => {
          capture(
            (match.matcher.state.goal && match.matcher.state.goal !== ECMAScriptGoal && 'sequence') ||
              (text.length > 1 && text.endsWith(text[0]) && (match.punctuator = 'quote')) ||
              fault(text, entity, match),
            match,
          );
        })}
      )`,
    ),
  TemplateLiteral: () =>
    Matcher.define(
      entity => Matcher.sequence`(${entities.GraveAccent}
        ${entity((text, entity, match) => {
          const goal = match.matcher.state.goal;
          !goal || goal === TemplateLiteralGoal || goal === ECMAScriptGoal
            ? ((match.identity = toggle(text, entity, match)), capture((match.punctuator = 'quote'), match))
            : (match.identity = 'sequence');
        })}
      )`,
    ),
  Opener: () =>
    Matcher.define(
      entity => Matcher.sequence`(\$\{|\{|\(|\[
        ${entity((text, entity, match) => {
          ((match.identity = open(text, entity, match)) && (match.punctuator = match.identity)) ||
            (match.identity = 'sequence');
        })}
      )`,
    ),
  Closer: () =>
    Matcher.define(
      entity => Matcher.sequence`(\}|\)|\]
        ${entity((text, entity, match) => {
          ((match.identity = close(text, entity, match)) && (match.punctuator = match.identity)) ||
            (match.identity = 'sequence');
        })}
      )`,
    ),
  Solidus: () =>
    Matcher.define(
      entity => Matcher.sequence`(\/
        ${entity((text, entity, match) => {
          // TODO: Solidus and such /[^+*?/\n][^\n]*)\/
          capture('operator', match);
          // match.punctuator = text;
        })}
      )`,
    ),
  Operator: () =>
    Matcher.define(
      entity => Matcher.sequence`(${entity('operator')}
        ,|;|\.\.\.|\.|:|\?|=>|
        \+\+|--|
        \+=|-=|\*\*=|\*=|\/=|
        &&|&=|&|\|\||\|=|\||%=|%|\^=|\^|~=|~|
        <<=|<<|<=|<|>>>=|>>>|>>=|>>|>=|>|
        !==|!=|!|===|==|=|
        \+|-|\*\*|\*|
        ${entity(ECMAScriptGrammar.Solidus())}
      )`,
    ),
  ContextualWord: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        arguments|async|as|from|of|static
        ${entity((text, entity, match) => {
          match.capture[identities.ContextualWord] = text;
          capture('keyword', match);
        })}
      )\b`,
      'gu',
    ),
  Keyword: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        await|break|case|catch|class|const|continue|debugger|
        default|delete|do|else|export|extends|finally|for|
        function|if|import|in|instanceof|new|return|super|
        switch|this|throw|try|typeof|var|void|while|with|yield
        ${entity((text, entity, match) => {
          match.capture[identities.Keyword] = text;
          capture('keyword', match);
        })}
      )\b`,
      'gu',
    ),
  RestrictedWord: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        interface|implements|package|private|protected|public
        ${entity((text, entity, match) => {
          match.capture[identities.RestrictedWord] = text;
          capture('keyword', match);
        })}
      )\b`,
      'gu',
    ),
  FutureReservedWord: () =>
    Matcher.define(
      entity => Matcher.sequence`\b(
        enum
        ${entity((text, entity, match) => {
          match.capture[identities.FutureReservedWord] = text;
          capture('identifier', match);
        })}
      )\b`,
      'gu',
    ),
  Identifier: () =>
    Matcher.define(
      entity => Matcher.sequence`(${entity('identifier')}
        (${entity(symbols.UnicodeIDStart)}[_$${entities.ID_Start}])
        (${entity(symbols.UnicodeIDContinue)}[_$\u200c\u200d${entities.ID_Continue}\u034f]+)?
      )`,
      'gu',
    ),
};

export const matcher = Matcher.define(
  entity => Matcher.sequence`
    ${entity(ECMAScriptGrammar.Break())}|
    ${entity(ECMAScriptGrammar.Whitespace())}|
    ${entity(ECMAScriptGrammar.Escape())}|
    ${entity(ECMAScriptGrammar.Comment())}|
    ${entity(ECMAScriptGrammar.StringLiteral())}|
    ${entity(ECMAScriptGrammar.TemplateLiteral())}|
    ${entity(ECMAScriptGrammar.Opener())}|
    ${entity(ECMAScriptGrammar.Closer())}|
    ${entity(ECMAScriptGrammar.Operator())}|
    ${entity(ECMAScriptGrammar.ContextualWord())}|
    ${entity(ECMAScriptGrammar.Keyword())}|
    ${entity(ECMAScriptGrammar.RestrictedWord())}|
    ${entity(ECMAScriptGrammar.FutureReservedWord())}|
    ${entity(ECMAScriptGrammar.Identifier())}|
    .
  `,
  'gu',
);

matcher.goal = ECMAScriptGoal;
