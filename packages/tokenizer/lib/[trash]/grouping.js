export class Grouping {
  constructor(context = 'markup', groupers = {}) {
    Object.assign(this, {
      groupers,
      hints: new Set([context]),
      goal: context,
      groupings: [context],
      context,
    });
    // this.groupers = groupers;
    // this.hints = new Set([syntax]);
    // this.goal = syntax;
    // this.groupings = [syntax];
    // this.context = syntax;
  }

  // create({
  //   /* grouper context */
  //   syntax,
  //   goal = syntax,
  //   quote,
  //   comment,
  //   closure,
  //   span,
  //   grouping = comment || closure || span || undefined,

  //   punctuator,
  //   spans = (grouping && grouping.spans) || undefined,
  //   matcher = (grouping && grouping.matcher) || undefined,
  //   quotes = (grouping && grouping.quotes) || undefined,
  //   punctuators = {aggregators: {}},
  //   opener = quote || (grouping && grouping.opener) || undefined,
  //   closer = quote || (grouping && grouping.closer) || undefined,
  //   hinter,
  //   open = (grouping && grouping.open) || undefined,
  //   close = (grouping && grouping.close) || undefined,
  // }) {
  //   return {
  //     syntax,
  //     goal,
  //     punctuator,
  //     spans,
  //     matcher,
  //     quotes,
  //     punctuators,
  //     opener,
  //     closer,
  //     hinter,
  //     open,
  //     close,
  //   };
  // }
}
