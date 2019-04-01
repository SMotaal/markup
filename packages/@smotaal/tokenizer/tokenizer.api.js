/**
 *
 */
export const TokenizerAPI = Object.setPrototypeOf(
  class TokenizerAPI {
    /**
     * @param {Partial<{parsers: Parser[]}>} [options]
     */
    constructor() {
      const [
        {
          parsers = [],
          State = TokenizerState,
          tokenize = (source, options = {}, flags) => {
            const state = new State({options, flags: {}});
            const variant = !options.variant ? 1 : parseInt(options.variant);
            const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
            this.lastVariant === (this.lastVariant = variant) ||
              variant <= parsers.length ||
              console.warn(
                '[tokenize‹parser›] Variant %O[%d] out of bounds — using default parser: %o',
                parsers,
                variant,
                parser.MODULE_URL || {parser},
              );
            options.tokenize = parser.tokenize;
            if (flags && (flags.length > 0 || flags.size > 0)) {
              typeof flags === 'string' || (flags = [...flags].join(' '));
              /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
              /\bdebug\b/i.test(flags) && (state.flags.debug = true);
            }

            let returned = UNSET;
            try {
              this.lastParser === (this.lastParser = parser) ||
                console.info('[tokenize‹parser›]: %o', parser.MODULE_URL || {parser});
              return (returned = parser.tokenize(source, state));
            } finally {
              returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
            }
          },

          warmup = (source, options, flags) => {
            // Object.defineProperty(options, 'warmup', {value: true});
            const key = (options && JSON.stringify(options)) || '';
            let cache = (this.cache || (this.cache = new Map())).get(key);
            cache || this.cache.set(key, (cache = new Set()));
            if (!cache.has(source)) {
              flags = `warmup ${(flags &&
                (flags.length > 0 || flags.size > 0) &&
                (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
                ''}`;
              for (const item of tokenize(source, options, flags));
            }
            cache.add(source);
          },

          render,
        } = {},
      ] = arguments;

      Object.defineProperties(this, {
        tokenize: {get: () => tokenize},
        warmup: {get: () => warmup},
        render: {get: () => render},
        parsers: {get: () => parsers},
      });
    }
  }.prototype,
  null,
).constructor;

const TokenizerState = Object.setPrototypeOf(
  class State {
    constructor(...properties) {
      Object.assign(this, ...properties);
    }
  }.prototype,
  null,
).constructor;

const UNSET = Symbol('');

/** @typedef {import('./lib/parser.js').Parser} Parser */

// export const createAPI = ({
//   parsers = [],

//   State: TokenizerState,

//   tokenize = (source, options = {}, flags) => {
//     const state = new TokenizerState({options, flags: {}});
//     const variant = !options.variant ? 1 : parseInt(options.variant);
//     const {[variant >= 1 && variant <= parsers.length ? variant - 1 : (options.variant = 0)]: parser} = parsers;
//     this.lastVariant === (this.lastVariant = variant) ||
//       variant <= parsers.length ||
//       console.warn(
//         '[tokenize‹parser›] Variant %O[%d] out of bounds — using default parser: %o',
//         parsers,
//         variant,
//         parser.MODULE_URL || {parser},
//       );
//     options.tokenize = parser.tokenize;
//     if (flags && (flags.length > 0 || flags.size > 0)) {
//       typeof flags === 'string' || (flags = [...flags].join(' '));
//       /\bwarmup\b/i.test(flags) && (state.flags.warmup = true);
//       /\bdebug\b/i.test(flags) && (state.flags.debug = true);
//     }

//     let returned = UNSET;
//     try {
//       this.lastParser === (this.lastParser = parser) ||
//         console.info('[tokenize‹parser›]: %o', parser.MODULE_URL || {parser});
//       return (returned = parser.tokenize(source, state));
//     } finally {
//       returned !== UNSET || !state.flags.debug || console.info('[tokenize‹state›]: %o', state);
//     }
//   },

//   warmup = (source, options, flags) => {
//     // Object.defineProperty(options, 'warmup', {value: true});
//     const key = (options && JSON.stringify(options)) || '';
//     let cache = (this.cache || (this.cache = new Map())).get(key);
//     cache || this.cache.set(key, (cache = new Set()));
//     if (!cache.has(source)) {
//       flags = `warmup ${(flags &&
//         (flags.length > 0 || flags.size > 0) &&
//         (typeof flags === 'string' || flags instanceof String ? flags : [...flags].join(' '))) ||
//         ''}`;
//       for (const item of tokenize(source, options, flags));
//     }
//     cache.add(source);
//   },

//   render,
// }) => ({
//   parsers,
//   tokenize,
//   warmup,
//   render,
// });
