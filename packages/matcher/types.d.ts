//@ts-check
/// <reference path="./lib/types.d.ts" />

// Bare package exports — ie `package.json:main`

export * from './matcher';

// Module augmentations

declare module './lib/matcher' {
  declare namespace Matcher {
    export {
      MatcherFlags as Flags,
      MatcherText as Text,
      MatcherPattern as Pattern,
      MatcherPatternFactory as PatternFactory,
      MatcherMatch as Match,
      MatcherExecArray as ExecArray,
      MatcherMatchArray as MatchArray,
      MatcherMatchRecord as MatchRecord,
      MatcherCapture as Capture,
      MatcherIdentity as Identity,
      MatcherOperator as Operator,
      MatcherEntity as Entity,
      MatcherIterator as Iterator,
      MatcherDebugOptions as DebugOptions,
    };
  }
}
declare module './lib/token-matcher' {
  declare namespace TokenMatcher {
    export {
      TokenMatcherGoal as Goal,
      TokenMatcherGroup as Group,
      TokenMatcherGroups as Groups,
      TokenMatcherToken as Token,
      TokenMatcherContext as Context,
      TokenMatcherState as State,
      TokenMatcherCapture as Capture,
      TokenMatcherMatch as Match,
      TokenMatcherExecArray as ExecArray,
      TokenMatcherMatchArray as MatchArray,
      TokenMatcherMatchRecord as MatchRecord,
      MatcherFlags as Flags,
      MatcherText as Text,
      MatcherPattern as Pattern,
      MatcherPatternFactory as PatternFactory,
      MatcherIdentity as Identity,
      MatcherOperator as Operator,
      MatcherEntity as Entity,
      MatcherIterator as Iterator,
      MatcherDebugOptions as DebugOptions,
    };
  }
}

// declare module './lib/token-matcher.js' {
//   export * from './lib/token-matcher'
// }

declare module './lib/segment-matcher' {
  declare namespace SegmentMatcher {
    export {
      MatcherFlags as Flags,
      MatcherText as Text,
      MatcherPattern as Pattern,
      MatcherPatternFactory as PatternFactory,
      MatcherMatch as Match,
      MatcherExecArray as ExecArray,
      MatcherMatchArray as MatchArray,
      MatcherMatchRecord as MatchRecord,
      MatcherCapture as Capture,
      MatcherIdentity as Identity,
      MatcherOperator as Operator,
      MatcherEntity as Entity,
      MatcherIterator as Iterator,
      MatcherDebugOptions as DebugOptions,
    };
  }
}
