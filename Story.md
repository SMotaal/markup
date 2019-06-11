# My Markup Story

A number of painpoints led to the start of thi experiment started in 2018. By that time, it was clear to me that scanning or translating (mildly transforming) source text at runtime will become of increasing importance as ECMAScript modules and things like H/2 slowly undo the façade of bundlers.

Obviously, every thing we could do through parsing, would be better off handled by a runtime APIs backed by specs — so I explored all those across implementations only to find that there seems to be unintended or otherwise sentiment to drive people to userland solutions.

Userland solutions today are mostly Acorn, Babel, and TypeScript, for JavaScript, along with a space less explored by myself for HTML (but not unexplored by all means).

At face value, I had no issue that they all relied on ASTs, because my initial problem with all but TypeScript was that they all come with packages you never expected. Not only because somthing like `isObject` is insulting to a JavaScript developer to have to ever dep out. But because here we all have one or two packages that will come with a string of others, and now any decent development effort has those in the deps, and with that you start seeing ecosystem wide opportunities in micro packages being maintined by a 10k and counting publisher or their drone.

That was the initial concern, which left me with TypeScript, and here I should mention that I was already pulling away from them for other reasons (ie prioritization of politics).

I decided to explore what it takes to tokenize the web trifecta (JS, HTML, and CSS) just to see where that leads. It was clear to me that there is a lot of myths out there, especially about performance.

After completing this chore, I decided to put it to work, creating a client-side GitHub pages renderer all with experimental code that has zero-external dependencies. At the same time, I was working on a ECMAScript modules shim which I used mainly to better understand the intent of my peers in the Node.js Modules team, and decided to use it as another battle testing ground for my theories.

While all my efforts elude to someone looking to shim modules or render markdown, and while those may be true as well, the fundamental goal of all of this is to have enough moving parts on my canvas to make sense of a broad range of things often too hard for a single individual to observe when everything happens in small specialized package teams.

This being as real as the saying having a unique perspective actually goes in the real world, I am trying to use this to affect change that is in my opinion necessary.

My opinion for any module loader or extension, you cannot rely on the current infrastructure without hitting the snag where your deps claim something is unsupported when it actually is by the runtime. And certainly, you don't want tools flooded with helper libs and emit chunks meant to polyfill a runtime without native module (or otherwise) support — those are costs that are simply not relevant to the problem and in turn introduce a range of possible points of failure not desired to say the least.

My opinion for SES, is that `eval` and `import` which are deemed not safe for the shim, are unexplored territory to say the least. While it is the intent to defer parse-related aspects until implementation is native, there are few reasonable places where one might in hindsight reconsider this.

I focus especially on `eval` and `import` here because of the drawback potential they can have if they ever end up being deemed hazardous when Realms and related prototypes are now native offerings and when the burden and privilege of making security decisions is seemingly unilaterally for the implementers (as they often feel inclined).

So my intuition tells me that the runtime parsing solution that is needed, should leverage platform features (like DOMParser) behind interfaces that equal them to minimalistic implementations, not unlike mine but not just experimental ones nonetheless.

It tells me that safe parsing is doable, and that RegExp (which only needs minor catching up by few) makes it possible to cut down a lot of architectural façade needed in current solutions known to work under the right conditions.

It also urges me to avoid taking for granted the fact they work under the right conditions, and to look closer at how fragile those conditions are in an ecosystem only starting to fiddle with security matters left unchecked in the absence of having clear and visible opportunity which is no longer the case.

I have been very fortunate to meet with far more experienced folks along the way who clearly have what it takes to affect what I think is necessary change and remain excited to any part I can play in such an endeavour that is clearly big enough to warrant more than one can do on their own.

<!--

Stuff I don't mind sharing:

- Sure, I missed working with others, and very desprately too, and even technically all the same, because I was not as experienced as most people I connected with on a weekly or bi-weekly basis. The benefit of the relatively more ample time, depth of field, and unilaterality afforded me a lot of room to stay on task (which for someone like me is an oxymoron).

- Being of a single human interface and one temporarily (ie 2016-2018) in a state of often being temporarily out of service (due to human interface matters), I was forced to work in small chunks and forced to avoid lavish README docs and stick to the basics. What I learned on my own was that people that don't learn enough on their own tend to make it in the world a lot faster, but also be much more loose at it so that one day someone somewhere will be sitting at home and they will start noticing the loose stuff, and having one of two intents… So, I only know which one was mine.

-->
