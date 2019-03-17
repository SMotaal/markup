# 2019-03 <q>Six Months into Markup</q>

It's been a a little over 6 months since I started my markup experiments and a lot has taken place since.

- Leveraged generators and `RegExp` as planned to nest parsing across multiple syntaxes.
- Created a simple way to define grammars (includes CSS, JS, HTML and limited Markdown).
- Created grassroots highlighter that composes even without a DOM (using [pseudom](https://www.npmjs.com/package/pseudom)).
- Explored different patterns for extensibility using standard ECMAScript modules.

All this work made it possible to separately start working on other stalled problems:

- Created a Markout renderer prototype (in [Pholio](https://smotaal.io/pholio)).
- Visualized syntax debates related to ESM/CJS (in [@nodejs/modules](https://github.com/nodejs/modules)).
- Replaced server-side rendering on GH pages (in [Quench](https://smotaal.io/quench)).

Along the way, my concepts have been challenged and often beyond my point breaking, and that always feels bad at first, but somehow grows on you and makes you grow as you work through it.

So happy thoughts reading!

### Problem Solving Confidence

I was introduced to the elegant beauty that is [quasiParserGenerator](https://github.com/erights/quasiParserGenerator) and while I observed it's beauty, it threw me hard as I failed to reconcile with feeling that my efforts so far have been "kids play" (thinking outloud to myself as it were).

<blockquote><details>

<summary>But how does one find motivation to overcome a thought like that?!</summary>

What do you do when faced with a similar challenge where you are deadlocked with what seems to be a very rational conclusion that your solution has lost any luster it had for being one of true merit that one day it will actually be useful for others to justify duplicating efforts already made in ways you could only ever aspire to one day?

Maybe you should simply ask the author of that code directly, not how they can fix your solution for you, but how they would have worked through in order to for them to have gotten that far ahead.

Asking directly works on two levels, the answer may be deeply enlighting when the other person can easily relate to your frustrations, and more suprising to my discovery was that waiting for an answer sets you in a completely new paradigm in your own quest for an answer anyway. As you are waiting for the answer will force your mind needed to dwell on reasons why it takes time.

You start by worrying about if this seen as merely your own lack of social decorum. And if so, then likely it means that the wrong person was on the other end of this question to begin with. Getting to that realization is not easy and can be tricky, and you may never really believe it enough to over come your own doubts, and that is understandable. But is it not at least more believable than say, silence is geek for "when I have time to figure out how to handle this confusing or awkward thing in my chat… I'll deal with it!"

So, simply asking alone shifts the calculus on working through unrelenting doubts. I venture that it does that because it repurposes mental processes often left excluded from introverted problem-solving because it normally deals with social interactions… etc.

As you wonder, you will empathize, and you will likely consider things beyond what you would have imagined otherwise.

</details>
</blockquote>

a. Unlike PEG, I am motivated by solving different problems. In fact, I am fairly certain that the premise of markup is that while it tokenizes into trees, those trees are not necessarily the ASTs you would expect from a lexer.

b. A painpoint I set out to solve was avoiding unnecessary overhead of full ASTs if you are parsing to make few to no modifications just to turn around and have the actual runtime parser do the same, in a much more controllable way. Creating things that must be used right to avoid having them linger or leak is a design decision that is not too unreasonable to think of considering how badly our CPUs spin from popular plugins going through a bad day.

c. Another motivation was that current solutions for ASTs are tightly coupled to the idea of what invalid syntax can be before it breaks badly, and this  takes so much additional work just to get them to make sense and be tolerant to mistakes, only to find that users make the ones we did not anticipate after all.

d. Much like QuasiPEG, I wanted a solution that would easily extend beyond a single language, and deliver well on working with mixed texts not creating race conditions mid-frame. Because this notion of using a good AST package for x and another for y, it is not merely the additional interfacing overhead, it is the slew of redundancies and incompatibilities with integration today and new ones cropping out with little foresight down the road.

By the now I am coming to the conclusion that if I were to take anything from what initially seemed a moment of doubt, it is that all those motives behind my work have been validated for merit, and that pulling it off is credit to further investment.

### Growing fond of RegExp

One of the early challenges that I had to work through was why people keep bashing RegExp and how they cannot be used to parse, or more specifically "how they can be hacked" but in my quest, I discovered they are really trying to say is that "because they lack context, they need a special mechanism to give them context… and we don't have that".

In reality, such reckless claims are likely why I passionately dove into this markup experiment in the first place, and why I was inspired to explore this predominantly declarative design where one regular expression stops as another took over.

Declarative patterns are far simpler to reason about inplace as long as they have sufficient contextual or annotationtional cues making them far more paletable if you contrast this with the learning curve and documentation overhead of scanner-based parsers projects out there.

To try to relate to this notion, I just imagine if I was debugging a problem where I am not sure why `$͏{` is not opening a span in a template string and how long it would take me to locate `eat(DollarCurlyToken)` (because only two people knew that at some point) and to spend time to conclude that it was actually not the issue here and it was really as stupid as it being `$\u{034F}{` in the first place.

One way where debugging this problem could play out if we used RegExp's instead of api soup would be to conditionally break and check the offending string with something like `string.replace(/\$\{/g, '«${»')`.

Now suppose it was a problem with the expression itself and not a hidden joiner that we failed to spot, the matching expression itself should be be right there in scope to examine or at least easy to identify because it will be the one with `…|\$\{|…` or similar based on your one-size stylistics and behaviour norms for patterns.

Regular expression patterns have an added perk in that can port a lot more easily (in my opinion) than imparative logic, worst case, you are porting the single feature of RegExp (which is rather complex) but not any and all ECMAScript features very likely including RegExp itself.

### Future Thought(s)

So will this work end here, obviously this is only the start.

In fact, one very interesting discovery in my work that has been lacking a proper venue to share is the fact while languages like ECMAScript that receive almost yearly upgrades that affect syntax often do so in very predictable patterns. Failing to be lean enough to recognize and align your design to benefit from those predictable patterns makes it likely that you will always struggle to catch up without paying dues.

I can't avoid seeing this ongoing dance between certain popular AST-based solutions being popular enough with certain folks locked into using them, and them being influential enough to block any momentum towards syntax that will force them to do work they don't need for the wrong reasons. Sure, this may not be true, and if it were true, it is not in our control, in the end, systems will grow through the path of least resistance, until the ways in which they grow gets in the way of them continuing to growing or something else comes along that is not self-canabilizing. I hope that ECMAScript continues to avert those two outcomes.
