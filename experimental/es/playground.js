import bootstrap from '../matcher/matcher.js';
import {createTokenFromMatch} from '../matcher/helpers.js';
// import {Matcher} from '/modules/matcher/matcher.js';
import {matcher} from './matcher.js';
// import {entities, identities, goals, groups, symbols} from './definitions.js';

const SP = `\u2420`;
const HT = `\u2409`;

export default bootstrap(matcher, {
  syntax: 'es',
  initializeState: state => {
    (state.groups = []).closers = [];
    state.lineOffset = state.lineIndex = 0;
    state.lineFault = false;
  },
  createToken: (match, state) => {
    const token = createTokenFromMatch(match);
    const {type} = token;
    const {goal, lineIndex, lineOffset = (state.lineOffset = 0)} = state;

    goal &&
      goal.type &&
      (type === 'closer' ||
        type === 'opener' ||
        // token.punctuator && (console.log(token)),
        (token.hint = `in-${(token.type = goal.type)}`));
    //  ||
    ({
      columnNumber: token.columnNumber = match.index - (lineOffset || -1),
      lineNumber: token.lineNumber = lineIndex + 1,
      punctuator: token.punctuator,
    } = match);

    token.goal = (goal || matcher.goal).name;
    token.hint = `${token.hint || ''} [${token.goal}:${token.lineNumber}:${token.columnNumber}]`;
    // ${(type !== 'inset' && token.inset && token.inset.replace(/\t/g, HT).replace(/\s/g, SP)) || ''}

    // Manually update lineNumber for multi-line strings and comments
    token.breaks && type !== 'break' && (state.lineIndex += token.breaks);

    return token;
  },
  sourceURL: './matcher.js',
});
