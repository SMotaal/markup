//@ts-check

import {matcher} from './matcher.js';
import {initializeState, finalizeState, createToken, Construct} from './helpers.js';
import {createMatcherMode} from '../matcher/helpers.js';

/** @type {boolean} */
const USE_CONSTRUCTS = true;

export const mode = createMatcherMode(matcher, {
  syntax: 'ecmascript',
  aliases: ['es', 'js', 'javascript'],

  preregister: parser => {
    parser.unregister('es');
    parser.unregister('ecmascript');
  },

  initializeState: state => {
    state['USE_CONSTRUCTS'] = USE_CONSTRUCTS;
    initializeState(state);
  },
  finalizeState,
  createToken: (match, state) => {
    // USE_CONSTRUCTS !== true ? createToken : (match, state) => {
    const token = createToken(match, state);

    if (state['USE_CONSTRUCTS'] === true && token !== undefined) {
      const {type, text, context} = token;
      if (token.goal === matcher.goal) {
        switch (type) {
          case 'inset':
          case 'whitespace':
          case 'opener':
          case 'closer':
            break;
          case 'number':
          case 'identifier':
            context.currentConstruct.add(`‹${type}›`);
            break;
          case 'operator':
            switch (text) {
              case ',':
              case ';':
                context.currentConstruct.set('');
                break;
              case '?':
              case '=':
                // default:
                context.currentConstruct.set(text);
                break;
              // case ':':
              // case '.':
              // case '=>':
              default:
                context.currentConstruct.add(text);
                break;
            }
            break;
          case 'break':
            // (context.currentConstruct.last === 'async' || context.currentConstruct.last === '{…}') &&
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
              // // case 'try':
              // // case 'catch':
              // // case 'finally':
              // case 'void':
              // case 'typeof':
              // case 'instanceof':
              // case 'in':
              // case 'of':
              // case 'from':
              // case 'import':
              // case 'export':
              // case 'default':
              // case 'const':
              // case 'var':
              // case 'let':
              // case 'class':
              // case 'async':
              // case 'function':
              // case '*':
              // case 'extends':
              default:
                context.currentConstruct.add(text);
            }
            break;
        }
        token.construct = context.currentConstruct.text;
      }
      token.isDelimiter || context.currentConstruct == null
        ? context.openingConstruct == null ||
          context.openingConstruct.length === 0 ||
          (token.hint = `${token.hint}\n\n${context.openingConstruct.text}`)
        : context.currentConstruct.length > 0
        ? (token.hint = `${token.hint}\n\n${context.currentConstruct.text}`)
        : context.currentConstruct.previousText &&
          (token.hint = `${token.hint}\n\n${context.currentConstruct.previousText}\n…`);

      // ${token.group.description}
    }
    return token;
  },
});
