import * as es from '../es/definitions.js';

const {
  symbols: {
    ECMAScriptGoal: ECMAScriptGoalSymbol,
    CommentGoal: CommentGoalSymbol,
    RegExpGoal: RegExpGoalSymbol,
    StringGoal: StringGoalSymbol,
    TemplateLiteralGoal: TemplateLiteralGoalSymbol,
    FaultGoal: FaultGoalSymbol,
  },
} = es;

// // const TypeScriptGoalSymbol = Symbol('TypeScriptGoal');
// const StatementsGoalSymbol = Symbol('StatementsGoal');
// const ExpressionGoalSymbol = Symbol('ExpressionGoal');
// const DestructuringGoalSymbol = Symbol('DestructuringGoal');
// const AnnotationGoalSymbol = Symbol('AnnotationGoal');
// // const ModuleGoalSymbol = Symbol('ModuleGoal');

// const goals = {};

// goals[TypeScriptGoal] = {
//   type: undefined,
//   flatten: undefined,
//   fold: undefined,
//   openers: ['<', '{', '(', '[', "'", '"', '`', '/', '/*', '//'],
//   closers: ['}', ')', ']'],
// }

// goals[StatementsGoalSymbol] = {
//   type: undefined,
//   flatten: undefined,
//   fold: undefined,
//   openers: [... goals[TypeScriptGoal].openers],
//   closers: [... goals[TypeScriptGoal].closers],
// }

// goals[ExpressionGoalSymbol] = {
//   type: undefined,
//   flatten: undefined,
//   fold: undefined,
//   openers: [... goals[TypeScriptGoal].openers],
//   closers: [... goals[TypeScriptGoal].closers],
// }

// goals[DestructuringGoalSymbol] = {
//   type: undefined,
//   flatten: undefined,
//   fold: undefined,
//   openers: [... goals[TypeScriptGoal].openers],
//   closers: [... goals[TypeScriptGoal].closers],
// }

// goals[AnnotationGoalSymbol] = {
//   type: undefined,
//   flatten: undefined,
//   fold: undefined,
//   openers: [... goals[TypeScriptGoal].openers],
//   closers: [... goals[TypeScriptGoal].closers],
// }

// const symbols = {
//   TypeScriptGoal: TypeScriptGoalSymbol,
//   StatementsGoal: StatementsGoalSymbol,
//   ExpressionGoal: ExpressionGoalSymbol,
//   DestructuringGoal: DestructuringGoalSymbol,
//   AnnotationGoal  : AnnotationGoalSymbol,

//   ... es.symbols
// };
