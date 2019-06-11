# My Markup Story

A number of painpoints led to the start of this experiment, which started in 2018. By that time, it was clear to me that scanning or translating (mildly transforming) source text at runtime will become of increasing importance as ECMAScript modules and things like H/2 slowly undo the façade of bundlers.

Obviously, everything we could do through parsing, is better off being handled by spec-compliant runtime APIs but they are hard to come by. I explored the ones that you can find (that's only HTML) and can't help but feel an unintended or otherwise sentiment to drive people to userland solutions for all parsing matters. The pragmatist in me thinks that impelementers just don't want to enter into more disputes about matters which they consider secondary to their bottomline.

Userland solutions today are mostly Acorn, Babel, and TypeScript, for JavaScript, along with a space less explored by myself for HTML (but not unexplored by all means) which are either designed to power headless dom implementations or tooling for web components and such frameworks. Where the lowest common denominator of those being that they can indulge poorly in package decisions being the source of my concerns.

Because, initially, at face value, my issues were never with ASTs (that comes much later), but with all but TypeScript indulging so poorly in those decisions, so they all come with packages you never expected — as someone with foresight must have felt when they politely urged us to start taking notice.

Once you do, you can not feel that something like `is-XXXX@x.x.x` is offensive to your sense as a JavaScript developer, and not just because people seasoned enough to be of this calipar decision and employ thought it warrented deping out and many other deping it on. But because here we all have one or two packages of wide demand in all decent development tools everywhere in the ecosystem, and they will come with not-too-well-minded dependencies, let alone very-well-minded ones of a much deeper intent.

You can't remain blissfull to the ecosystem wide opportunities in all those bleak micro packages being maintined by a few 10k and counting fame-seekers or their drones, and of when such packages eventually outgrow their noteworthy incentives that elicited an initial pride for vigilance.

That was the initial concern, which left me with TypeScript, and here I should mention that I was, albeit completely separate from matters here, already pulling away from it being the aspiring superset of JavaScript that now seemed to exponentially pickup. But for me, I was maybe more privy to my long-formed opinions regarding obvious prioritization and politics conflicts that were getting in the way of spec things, all the fashion of those who think it their privilege to an accountability-free entitlement all at the expense of the open-source community they are hardly intrested in actually seeing grow, unless for pay.

I decided to explore what it takes to tokenize the web trifecta (JS, HTML, and CSS) just to see where this leads. It was clear to me that there is a lot of myths out there, especially about performance.

After completing this chore, I decided to put it to work, creating a client-side GitHub pages renderer all with experimental code with a strict zero-dep policy — aside from http-server, rollup and TypeScript dev side for my own sanity.

At the same time, I was working on a ECMAScript modules shim which I used mainly to better understand the intent of my peers in the Node.js Modules team, and decided to use it as another battle testing ground for my theories.

While all my efforts elude to someone looking to shim modules or render markdown, and while those may be true as well, the fundamental goal of all of this is to have enough moving parts on my canvas to make sense of a broad range of things often too hard for a single individual to observe when everything happens in small specialized package-oriented teams.

This being as real as the saying having a unique perspective actually goes in the real world, I am trying to use this to affect change that is in my opinion necessary.

My opinion for any module loader or extension, you cannot rely on the current infrastructure without hitting the snag where your deps claim something is unsupported when it actually is by the runtime. And certainly, you don't want, in the first place, to be addressing such surgical and targetted runtime parsing tasks with all-and-any tools like those, litered with configs, helper libs and conditional mojo chunks meant to polyfill the unknown runtime that might not have native (module or otherwise) support — those are costs that are simply not relevant to the problem and which introduce too wide a range of possible points of failure in turn.

My opinion for SES, is that cases for `eval` and `import` which may be deemed not safe for the shim work, are the unexplored territory that leaves open a wide range of unforeseen outcomes. While it is a very sound intent to defer parse-related aspects until implementation is native in production uses of such shims, there are few reasonable places where one might in hindsight feel they would've maybe considered exploring it a little closer. And not to mention that once native support is here, we historically know it will likely fail to apply in some places that will still need to be covered.

In both worlds, I more inlined to focused on `eval` and `import` because of the drawback potential they can have if they ever end up being deemed hazardous in native implementations. So I am slowly trying to work on this safe parse that will allow us to retain the full semantics of those aspects. Because even if this risk is deemed avoidable in proposal staged polyfills, it is good to look ahead and consider future scenarios where decisions seem to have a more unilateral taste for implementers, historically.

So my intuition tells me that the runtime parsing solution needed:

- Should leverage platform features (like DOMParser) behind interfaces that equal them to more minimalistic implementations which will be safe and highly focused fallbacks on any platform, geared exactly for what they deliver and nothing more, not unlike mine just not merely experimental.

- Should avoid taking for granted the fact they work under the right conditions, and to look closer at how fragile those conditions are, ie how little it takes to get it wrong, and how often end users actually do.

  This in an ecosystem starting to pay attention to wide gaps left unchecked which are no longer absent of the clear and visible opportunity but void of the tools and awareness to handle this growing potential for illintent.

- Is doable from my own experimental work and other battle tested work which carefully minimizes the footprint of their architectural façade by leveraging negelected builtins like RegExp.

  And while builtins come with catching up burdens that can delay the more ideal outcomes, they however come with the more clear cut benefit of already committed parties answering to well trained pressures proven reliable to force corrections (no need to state this by example).

I have been very fortunate to meet with far more experienced folks along the way who clearly have what it takes to affect what I think is necessary change. I remain excited to any part I can play in such an endeavour that is clearly big enough to warrant more than one can do on their own.

<!--

Stuff I don't mind sharing and later realize that other might should go here…

- Sure, I missed working with others, and very desprately too, and even technically all the same, because I was not as experienced as most people I connected with on a weekly or bi-weekly basis. The benefit of the relatively more ample time, depth of field, and unilaterality afforded me a lot of room to stay on task (which for someone like me is an oxymoron).

- Being of a single human interface and one temporarily (ie 2016-2018) in a state of often being temporarily out of service (due to human interface matters), I was forced to work in small chunks and forced to avoid lavish README docs and stick to the basics. What I learned on my own was that people that don't learn enough on their own tend to make it in the world a lot faster, but also be much more loose at it so that one day someone somewhere will be sitting at home and they will start noticing the loose stuff, and having one of two intents… So, I only know which one was mine.

- While my quest was mostly driven by my thirst for knowledge, which was about the only healthy way for me to make small progress on my temporary set back,it was still sometimes briefly driven out financial or material pressures, but never enough that they actually kept me distracted long enough to appreciate short-term gains where things I have already noticed continue to show up unscathed, eventually pulling me right back.

-->
