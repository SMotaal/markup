// export {modes, mappings} from '../lib/modes.mjs';
// import * as extensions from '../extensions/extensions.mjs';
// import * as parser from '../lib/parser.mjs';
// import * as dom from '../extensions/dom.mjs';
// for (const mode in extensions.modes) extensions.registerMode(mode);

// import * as extensions from '../extensions/extensions.mjs';
// import * as dom from '../extensions/dom.mjs';
// import {Parser} from '../lib/parser.mjs';

// const parser = new Parser();
// export const {modes, mappings} = parser;
// for (const id in extensions.modes) parser.register(extensions.modes[id]);

import parser from './extended.mjs';
import * as dom from '../extensions/dom.mjs';

const versions = [parser];
export const tokenize = (source, options = {}) => {
  const version = versions[options.version - 1] || versions[0];
  options.tokenize = (version || parser).tokenize;
  return version.tokenize(source, {options});
};

// export const tokenize = (source, options = {}) => parser.tokenize(source, options);

export const render = async (source, options) => dom.render(tokenize(source, options), options && options.fragment);

export const warmup = (source, options) => {
  const key = (options && JSON.stringify(options)) || '';
  let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
  cache || warmup.cache.set(key, (cache = new Set()));
  if (cache.has(source)) return;
  for (const item of tokenize(source, options));
  cache.add(source);
};

// const initialize = () =>
//   initialized ||
//   (initialized = async () => {
//     const {createFragment, supported} = dom;

//     /**
//      * Temporary template element for rendering
//      * @type {HTMLTemplateElement?}
//      */
//     const template =
//       supported &&
//       (template =>
//         'HTMLTemplateElement' === (template && template.constructor && template.constructor.name) &&
//         template)(document.createElement('template'));

//     tokenize = (source, options = {}) => {
//       const version = versions[options.version - 1];
//       options.tokenize = (version || parser).tokenize;
//       return version.tokenize(source, {options});
//     };

//     render = async (source, options) => {
//       const fragment = options.fragment || createFragment();
//       const elements = dom.renderer(tokenize(source, options));
//       let first = await elements.next();

//       let logs = (fragment.logs = []);

//       if (first && 'value' in first) {
//         if (!dom.native && template && 'textContent' in fragment) {
//           logs.push(`render method = 'text' in template`);
//           const body = [first.value];
//           if (!first.done) for await (const element of elements) body.push(element);
//           template.innerHTML = body.join('');
//           fragment.appendChild(template.content);
//         } else if ('push' in fragment) {
//           logs.push(`render method = 'push' in fragment`);
//           fragment.push(first.value);
//           if (!first.done) for await (const element of elements) fragment.push(element);
//         } else if ('append' in fragment) {
//           //  && first.value.nodeType >= 1
//           logs.push(`render method = 'append' in fragment`);
//           fragment.append(first.value);
//           if (!first.done) for await (const element of elements) fragment.append(element);
//         }
//         // else if ('textContent' in fragment) {
//         //   let text = `${first.value}`;
//         //   if (!first.done) for await (const element of elements) text += `${element}`;
//         //   if (template) {
//         //     logs.push(`render method = 'text' in template`);
//         //   } else {
//         //     logs.push(`render method = 'text' in fragment`);
//         //     // TODO: Find a workaround for DocumentFragment.innerHTML
//         //     fragment.innerHTML = text;
//         //   }
//         // }
//       }

//       return fragment;
//     };

//     initialized = true;

//     return markup;
//   })();

// export let render = async (source, options) => {
//   await initialize();
//   return await render(source, options);
// };

// export let tokenize = (source, options) => {
//   if (!initialized)
//     throw Error(`Markup: tokenize(…) called before initialization. ${Messages.InitializeFirst}`);
//   else if (initialized.then)
//     Error(`Markup: tokenize(…) called during initialization. ${Messages.InitializeFirst}`);
//   return markup.tokenize(source, options);
// };

// const keyFrom = options => (options && JSON.stringify(options)) || '';
// const skim = iterable => {
//   for (const item of iterable);
// };

// const warmup = async (source, options) => {
//   const key = (options && keyFrom(options)) || '';
//   let cache = (warmup.cache || (warmup.cache = new Map())).get(key);
//   cache || warmup.cache.set(key, (cache = new Set()));
//   await (initialized || initialize());
//   // let tokens;
//   cache.has(source) || (skim(tokenize(source, options)), cache.add(source));
//   // cache.has(source) || ((tokens => { while (!tokens.next().done); })(tokenize(source, options)), cache.add(source));
//   return true;
// };

// const markup = Object.create(parser, {
//   initialize: {get: () => initialize},
//   render: {get: () => render},
//   tokenize: {get: () => tokenize},
//   warmup: {get: () => warmup},
//   dom: {get: () => dom},
//   , mappings: {get: () => parser.modes},
// });

// /// CONSTANTS

// const Messages = {
//   InitializeFirst: `Try calling Markup.initialize().then(…) first.`,
// };

// export default markup;
