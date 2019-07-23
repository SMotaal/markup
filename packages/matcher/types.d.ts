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

declare module './lib/segmenter' {
  declare namespace Segmenter {
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
