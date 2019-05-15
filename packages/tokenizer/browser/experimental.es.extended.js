export * from './experimental.extended.js';
import experimentalExtendedAPI from './experimental.extended.js';
import experimentalES from '../../../experimental/es/playground.js';

// Integrate experimental ECMAScript mapping it to the
//   "es" mode and "ecmascript" alias, but leaving the
//   normal JavaScript intact for both "js" and its
//   "javascript" alias.

experimentalES(experimentalExtendedAPI);

export default experimentalExtendedAPI;
