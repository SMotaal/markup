//@ts-check

import {matcher} from './es-matcher.js';
import {initializeState, finalizeState, createToken} from '../../packages/matcher/experimental/common/helpers.js';
import {TokenMatcher} from '../../packages/matcher/lib/token-matcher.js';

export const mode = TokenMatcher.createMode(matcher, {
  USE_CONSTRUCTS: false,

  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  initializeState: state => {
    state.USE_CONSTRUCTS = mode.USE_CONSTRUCTS === true;
    initializeState(state);
  },

  finalizeState: state => {
    finalizeState(state);
  },

  createToken: (log => (match, state) => {
    // let construct;
    // const lastAtom = state.lastAtom;
    const token = createToken(match, state);

    if (state.USE_CONSTRUCTS === true && token !== undefined) {
      const {type, text, context = state.nextTokenContext} = token;
      if (token.goal === matcher.goal) {
        switch (type) {
          case 'inset':
          case 'whitespace':
          case 'opener':
          // if (context.currentConstruct.last === '=>') {
          // } else
          // if (text === '{') {
          //   if (context.openingConstruct[context.openingConstruct.length - 2] === '(…)') {
          //     [
          //       ,
          //       context.openingConstruct.block,
          //     ] = /((?:(?:async |)function (?:\* |)(?:\S+ |)|(?:while|for|if|else|catch|switch|with) |)\(…\) \{…\})?$/.exec(
          //       context.openingConstruct.text,
          //     );
          //     log('%s\t%o', text, {...context.openingConstruct});
          //   } else {
          //     // log('%s\t%o', text, [...context.openingConstruct.text]);
          //   }
          // }
          case 'closer':
            break;
          case 'number':
          case 'identifier':
            context.currentConstruct.add(`‹${type}›`);
            break;
          case 'combinator': // ie ‹=>›
          case 'delimiter':
          case 'breaker':
          case 'operator':
            switch (text) {
              case ',':
              case ';':
                context.currentConstruct.add(text);
                context.currentConstruct.set('');
                break;
              case '=>':
              case '.':
                context.currentConstruct.add(text);
                break;
              case ':':
                if (context.currentConstruct.length === 1) {
                  context.currentConstruct.add(text);
                  break;
                }
              default:
                context.currentConstruct.set(text);
                break;
            }
            break;
          case 'break':
            context.currentConstruct.last !== undefined &&
              (context.currentConstruct.last === 'return' ||
                context.currentConstruct.last === 'throw' ||
                context.currentConstruct.last === 'break' ||
                context.currentConstruct.last === 'continue' ||
                context.currentConstruct.last === 'yield' ||
                context.currentConstruct.last === '{…}') &&
              context.currentConstruct.set('');
            break;
          case 'keyword':
            switch (text) {
              case 'for':
              case 'if':
              case 'do':
              case 'while':
              case 'with':
                context.currentConstruct.set(text);
                break;
              default:
                context.currentConstruct.add(text);
            }
            break;
        }
        token.construct = context.currentConstruct.text;
        // typeof log === 'function' &&
        //   ((type === 'opener' && (text === '/' || text === '{')) ||
        //     // Semi
        //     text === ';' ||
        //     // Arrow Function
        //     text === '=>') &&
        //   log(
        //     '%s\t%o\n\t%o\n\t%o',
        //     text,
        //     type === 'breaker'
        //       ? context.currentConstruct.previousText
        //       : type === 'opener'
        //       ? token.context.openingConstruct.text
        //       : token.construct,
        //     lastAtom,
        //     token,
        //   );
      }
      token.isDelimiter || context.currentConstruct == null
        ? context.openingConstruct == null ||
          context.openingConstruct.length === 0 ||
          (token.hint = `${token.hint}\n\n${context.openingConstruct.text}`)
        : context.currentConstruct.length > 0
        ? (token.hint = `${token.hint}\n\n${context.currentConstruct.text}`)
        : context.currentConstruct.previousText &&
          (token.hint = `${token.hint}\n\n${context.currentConstruct.previousText}\n…`);
    }
    return token;
  })(
    /** @type {Console['log']} */
    // null && //
    //@ts-ignore
    (console.internal || console).log,
  ),
});

/** @typedef {import('./types').State} State */
