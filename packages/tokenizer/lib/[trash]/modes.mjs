// import * as helpers from './helpers.mjs';

// /** TODO: Consider linking mappings to each instance of modes */
// export const mappings = {};

// const DEFAULT = 'default';

// export const modes = Object.assign(
//   new class Modes {
//     /**
//      *
//      * @param mode {string}
//      * @param factory {ModeFactory}
//      * @param defaults {ModeOptions}
//      */
//     register(mode, factory, defaults) {
//       if (!mode || typeof mode !== 'string') throw TypeError(`Cannot register "${mode}" since 'it is invalid'`);
//       if (this.hasOwnProperty(mode)) throw ReferenceError(`Cannot register "${mode}" since it is already registered`);
//       if (!factory || typeof factory !== 'function')
//         throw TypeError(`Cannot register "${mode}" since it does not have a valid factory`);

//       defaults = {syntax: mode, ...factory.defaults, ...defaults};
//       const {syntax, aliases, requires} = defaults;

//       Object.defineProperty(this, syntax, {
//         get() {
//           requires && requires.length && this.requires(mode, requires);
//           return (this[syntax] = factory(helpers, defaults, this));
//         },
//         set(value) {
//           Reflect.defineProperty(this, syntax, {value});
//         },
//         configurable: true,
//         enumerable: true,
//       });

//       mappings[syntax] = {syntax};

//       if (aliases && aliases.length) {
//         for (const alias of aliases) {
//           mappings[alias] = mappings[syntax];
//         }
//       }
//     }

//     /**
//      * @param mode {string}
//      * @param requires {string[]}
//      */
//     requires(mode, requires) {
//       const missing = [];
//       for (const mode of requires) mode in this || missing.push(`"${mode}"`);
//       if (!missing.length) return;
//       throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
//     }
//   }(),
//   {
//     default: {
//       ...(mappings[DEFAULT] = {syntax: 'default'}),
//       matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
//     },
//   },
// );

// /**
//  * @typedef { typeof helpers } Helpers
//  * @typedef { Partial<{syntax: string, matcher: RegExp, [name:string]: Set | Map | {[name:string]: Set | Map | RegExp} }> } Mode
//  * @typedef { {[name: string]: Mode} } Modes
//  * @typedef { {[name: string]: {syntax: string} } } Mappings
//  * @typedef { {aliases?: string[], syntax: string} } ModeOptions
//  * @typedef { (helpers: Helpers, options: ModeOptions, modes: Modes) => Mode } ModeFactory
//  */

// // const define = (instance, property, value, options) => {
// //   if (!instance.hasOwnProperty(property))
// //     return (
// //       Object.defineProperty(instance, property, {
// //         value,
// //         writable: (options && options.writable === true) || false,
// //         configurable: (options && options.configurable === true) || false,
// //         enumerable: !options || options.enumerable === true,
// //       }),
// //       value
// //     );
// // };

// // const markup = {
// //   syntax: 'markup',
// //   matcher: /([\s\n]+)|(\\(?:(?:\\\\)*\\|[^\\\s])?|\/\/|\/\*|\*\/|\(|\)|\[|\]|,|;|\.\.\.|\.|\b:\/\/\b|::|:|\?|`|"|'|\$\{|\{|\}|=>|<\/|\/>|\++|\-+|\*+|&+|\|+|=+|!={0,3}|<{1,3}=?|>{1,2}=?)|[+\-*/&|^%<>~!]=?/g,
// // };

// // const MAPPINGS = '[[mappings]]';
// // const DEFAULT = '[[default]]';

// // class Modes {
// //   get [MAPPINGS]() {
// //     return define(this, MAPPINGS, {}, {enumerable: false});
// //   }

// //   get [DEFAULT]() {
// //     if (this && this.hasOwnProperty(MAPPINGS)) {
// //       const mappings = this[MAPPINGS];
// //       const syntax = mappings[DEFAULT] && mappings[DEFAULT].syntax;
// //       if (syntax in this) return this[syntax];
// //     }
// //     return markup;
// //   }

// //   set [DEFAULT](value) {
// //     const mappings = this[MAPPINGS];
// //     if (mappings) {
// //       if (value && typeof value === 'object') {
// //         let syntax = value.syntax;
// //         (!syntax || typeof syntax !== 'string' || !this.hasOwnProperty(syntax) || this[syntax] !== value) &&
// //           this.register(syntax || (syntax = 'none'), value);
// //         mappings[syntax] = mappings[DEFAULT] = {syntax};
// //       } else {
// //         mappings[DEFAULT] = undefined;
// //       }
// //     }
// //   }

// //   /**
// //    *
// //    * @param id {string}
// //    * @param mode {ModeFactory | Mode}
// //    * @param options {ModeOptions}
// //    */
// //   register(id, mode, options) {
// //     const mappings = this[MAPPINGS];
// //     if (!mappings) return;

// //     if (!id || typeof id !== 'string' || 'default')
// //       throw TypeError(`Cannot register "${id}" since it not valid string'`);
// //     if (this.hasOwnProperty(id)) throw ReferenceError(`Cannot register "${id}" since it is already registered`);

// //     const factory = typeof mode === 'factory' && mode;

// //     if (factory) {
// //       mode = undefined;
// //       options = {syntax: id, ...factory.defaults, ...options};
// //     } else if (!mode || typeof mode !== 'object') {
// //       throw TypeError(`Cannot register "${id}" since it is not a valid mode definition nor a factory`);
// //     }

// //     const {syntax, aliases = mode.aliases} = options;

// //     Object.defineProperty(this, syntax, {
// //       get() {
// //         if (!mode && factory) {
// //           !factory.requires || !factory.requires.length || this.requires(id, factory.requires);
// //           mode = factory(helpers, options, this);
// //           mode.aliases = aliases;
// //         }
// //         return mode;
// //       },
// //       configurable: false,
// //       enumerable: true,
// //     });

// //     mappings[syntax] = {syntax};
// //     if (!aliases || !aliases.length) return;
// //     for (const alias of aliases) mappings[alias] = mappings[syntax];
// //   }

// //   /**
// //    * @param mode {string}
// //    * @param requires {string[]}
// //    */
// //   requires(mode, requires) {
// //     const missing = [];
// //     for (const mode of requires) mode in this || missing.push(`"${mode}"`);
// //     if (!missing.length) return;
// //     throw Error(`Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`);
// //   }
// // }

// // export const modes = new Modes();
// // export const mappings = modes[MAPPINGS];
