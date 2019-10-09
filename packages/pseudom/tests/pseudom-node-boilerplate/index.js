// Set options as a parameter, environment variable, or rc file.
require = require('esm')(module, {
  // detect files with import, import.meta, export, "use module", or .mjs as ESM
  mode: 'auto',
});
module.exports = require('./index.mjs');
