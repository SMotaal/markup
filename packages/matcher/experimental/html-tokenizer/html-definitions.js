//@ts-check
import {initializeState, finalizeState, generateDefinitions, defineSymbol, NullGoal} from '../common/helpers.js';

export const HTMLGoal = (() => {
  HTML: {
    const goals = {};
    const symbols = {};
    // const identities = {};
    const groups = {};

    const HTMLGoal = (goals[(symbols.HTMLGoal = defineSymbol('HTMLGoal'))] = {
      ...NullGoal,
      flatten: true,
      openers: ['<!DOCTYPE', '<![CDATA[', '<!--', '<?', '</', '<'],
      span: /(?:[^<\\]+?(?=\\[^]|<)|\\[^])*?(?=<\?|<!--|<[A-Za-z]|<\/[A-Za-z]|<![A-Za-z]|<!\[[A-Za-z]|$)/g,
      punctuation: {
        '<!--': 'comment',
      },
      initializeState,
      finalizeState,
    });

    HTMLTags: {
      HTMLDocumentTypeTag: {
        symbols.HTMLDocumentTypeTagGoal = defineSymbol('HTMLDocumentTypeTagGoal');
        goals[symbols.HTMLDocumentTypeTagGoal] = {
          ...NullGoal,
          openers: ['"', '['],
          closer: '>',
        };
        groups['<!DOCTYPE'] = {
          opener: '<!DOCTYPE',
          closer: '>',
          goal: symbols.HTMLDocumentTypeTagGoal,
          parentGoal: symbols.HTMLGoal,
        };

        HTMLDocumentTypeSubset: {
          symbols.HTMLDocumentTypeSubsetGoal = defineSymbol('HTMLDocumentTypeSubsetGoal');
          goals[symbols.HTMLDocumentTypeSubsetGoal] = {
            ...NullGoal,
            openers: ['"', '<!'],
            closer: ']',
          };

          groups['['] = {
            opener: '[',
            closer: ']',
            goal: symbols.HTMLDocumentTypeSubsetGoal,
            parentGoal: symbols.HTMLDocumentTypeTagGoal,
          };

          groups['<!'] = {
            opener: '<!',
            closer: '>',
            goal: symbols.HTMLDocumentTypeTagGoal,
            parentGoal: symbols.HTMLDocumentTypeSubsetGoal,
          };
        }
      }

      HTMLCharacterDataTag: {
        symbols.HTMLCharacterDataTagGoal = defineSymbol('HTMLCharacterDataTagGoal');
        goals[symbols.HTMLCharacterDataTagGoal] = {
          ...NullGoal,
          type: 'literal',
          closer: ']]>',
          span: /[^]*?(?=\]\]>|($))/g,
          punctuation: {']]>': 'closer'},
        };
        groups['<![CDATA['] = {
          opener: '<![CDATA[',
          closer: ']]>',
          goal: symbols.HTMLCharacterDataTagGoal,
          parentGoal: symbols.HTMLGoal,
        };
      }

      HTMLProcessingInstruction: {
        symbols.HTMLProcessingInstructionGoal = defineSymbol('HTMLProcessingInstructionGoal');
        goals[symbols.HTMLProcessingInstructionGoal] = {
          ...NullGoal,
          type: 'comment',
          closer: '?>',
          span: /[^]*?(?=\?>|($))/g,
        };
        groups['<?'] = {
          opener: '<?',
          closer: '?>',
          goal: symbols.HTMLProcessingInstructionGoal,
          parentGoal: symbols.HTMLGoal,
        };
      }

      HTMLComment: {
        symbols.HTMLCommentGoal = defineSymbol('HTMLCommentGoal');
        goals[symbols.HTMLCommentGoal] = {
          ...NullGoal,
          type: 'comment',
          flatten: true,
          fold: true,
          spans: {
            // SEE: https://html.spec.whatwg.org/dev/syntax.html#comments
            '<!--': /[^]*?(?=-->|($))/g,
          },
        };
        groups['<!--'] = {
          opener: '<!--',
          closer: '-->',
          goal: symbols.HTMLCommentGoal,
          parentGoal: symbols.HTMLGoal,
          description: '‹comment›',
        };
      }

      HTMLTag: {
        symbols.HTMLTagGoal = defineSymbol('HTMLTagGoal');
        goals[symbols.HTMLTagGoal] = {
          ...NullGoal,
          openers: ['"'],
          closer: '>',
          punctuators: ['-', ':', '/', '='],
          punctuation: {'/': 'delimiter', '"': 'quote', ':': false, '-': false},
          spans: {
            '<': /[A-Za-z]+(?:[-A-Za-z0-9:]*|\\.)*(?=(?:[\s\n].*?|)\/?>)|\/[A-Za-z]+(?:[-A-Za-z0-9:]*|\\.)*(?=(?:[\s\n](?:[^\/>]|\/[^>])*?|)>)|($|(?=.))/g,
          },
        };
        groups['<'] = {
          opener: '<',
          closer: '>',
          goal: symbols.HTMLTagGoal,
          parentGoal: symbols.HTMLGoal,
        };
      }

      HTMLAttributes: {
        HTMLString: {
          symbols.HTMLStringGoal = defineSymbol('HTMLStringGoal');
          goals[symbols.HTMLStringGoal] = {
            ...NullGoal,
            type: 'quote',
            flatten: true,
            fold: true,
            spans: {
              // Forwards until ‹'› or fault when match[1] === '\n' | ''
              "'": /(?:[^'\\\n]+?(?=\\[^]|')|\\[^])*?(?='|($|\n))/g,

              // Forwards until ‹"› or fault when match[1] === '\n' | ''
              '"': /(?:[^"\\\n]+?(?=\\[^]|")|\\[^])*?(?="|($|\n))/g,
            },
            punctuation: {
              '\n': 'fault',
            },
          };
          groups['"'] = {
            opener: '"',
            closer: '"',
            goal: symbols.HTMLStringGoal,
            description: '‹string›',
          };
        }
      }
    }

    generateDefinitions({goals, symbols, groups});

    return HTMLGoal;
  }
})();
