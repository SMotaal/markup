#!/usr/bin/env node

const Loader = require('hackable-loader');
const registerUnprefixedNodeCoreModules = require('hackable-loader/resolve/node-core');

Loader
  // Overwrite dynamic import to use this loader.
  .enableDynamicImport()
  // Overwrite import.meta to use this loader.
  .enableImportMeta();

// Add support for resolving 'fs' etc.
registerUnprefixedNodeCoreModules(Loader.current);

// import('./index.mjs')
import('./lib/markup-dom.js')
  .then(console.log, console.warn);
