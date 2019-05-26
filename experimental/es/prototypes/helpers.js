/**
 * Creates a list from a Whitespace-separated string
 *
 * @type { (string) => string[] }
 */
export const List = RegExp.prototype[Symbol.split].bind(/\s+/g);
