import {modes, mappings} from '../lib/modes.mjs';
import * as helpers from '../lib/helpers.mjs';

import * as extendedModes from './modes.mjs';

{
  const required = (mode, requires) => {
    const missing = [];
    for (const mode of requires) mode in modes || missing.push(`"${mode}"`);
    if (!missing.length) return;
    throw Error(
      `Cannot initialize "${mode}" which requires the missing mode(s): ${missing.join(', ')}`,
    );
  };

  /**
   * @typedef { typeof modes } Modes
   * @typedef { Partial<modes[keyof modes]> } Mode
   * @typedef { typeof helpers } Helpers
   * @typedef { {aliases?: string[], syntax: string} } Defaults
   */
  for (const mode in extendedModes) {
    /**
     * @type {(helpers: Helpers, defaults: Defaults, Modes) => Mode}
     */
    const factory = extendedModes[mode];
    const defaults = {syntax: mode, ...factory.defaults};
    const {syntax, aliases, requires} = defaults;

    // definitions[syntax] = {
    Object.defineProperty(modes, syntax, {
      get() {
        requires && requires.length && required(mode, requires);
        return (this[syntax] = factory(helpers, defaults, modes));
      },
      set(value) {
        Reflect.defineProperty(this, syntax, {value});
      },
      configurable: true,
      enumerable: true,
    });

    mappings[syntax] = {syntax};

    if (aliases && aliases.length) {
      for (const alias of aliases) {
        mappings[alias] = mappings[syntax];
      }
    }
  }
}
