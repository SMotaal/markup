import {existsSync, mkdirSync} from 'fs';
const dirname = __dirname;
const dist = `${dirname}/dist/`;

const bundles = {
  ['markup']: {
    input: `${dirname}/lib/markup.js`,
    output: {exports: 'named'},
  },
  ['tokenizer:esm']: {
    input: {
      ['tokenizer']: `${dirname}/packages/@smotaal/tokenizer/tokenizer.js`,
      // ['extended']: `${dirname}/packages/@smotaal/tokenizer/extended.js`,
      ['browser/markup']: `${dirname}/packages/@smotaal/tokenizer/browser/markup.js`,
      ['extensions/helpers']: `${dirname}/packages/@smotaal/tokenizer/extensions/helpers.js`,
      ['extensions/dom']: `${dirname}/packages/@smotaal/tokenizer/extensions/dom.js`,
      // ['extensions/extensions']: `${dirname}/packages/@smotaal/tokenizer/extensions/extensions.js`,
      ['extensions/html-mode']: `${dirname}/packages/@smotaal/tokenizer/extensions/html/html-mode.js`,
      ['extensions/css-mode']: `${dirname}/packages/@smotaal/tokenizer/extensions/css/css-mode.js`,
      ['extensions/markdown-mode']: `${dirname}/packages/@smotaal/tokenizer/extensions/markdown/markdown-mode.js`,
      ['extensions/javascript-mode']: `${dirname}/packages/@smotaal/tokenizer/extensions/javascript/javascript-mode.js`,
      ['extensions/javascript-extensions']: `${dirname}/packages/@smotaal/tokenizer/extensions/javascript/extended-modes.js`,
    },
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:extended']: {
    input: `${dirname}/packages/@smotaal/tokenizer/extended.js`,
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:browser:markup']: {
    input: `${dirname}/packages/@smotaal/tokenizer/browser/markup.js`,
    output: {path: `./browser`, exports: 'named', name: 'markup'},
  },
};

// prettier-ignore //
const bundle = (
  bundle,
  format = 'umd',
  fileNames = '',
  {input, output: {dir: dir = '', name, ...output} = {}, ...options} = bundles[bundle],
) => {
  // const [, outputPath = '', packageName, buildName] = /^([^:]*\/|)([^/:]*)(?::.*)$/.exec(bundle);
  const [packageID, buildID] = bundle.split(/:(.*)$/, 2);
  const [
    ,
    pathname = '',
    filename = '[name]',
    extension = '[extname]',
  ] = /^(.*\/|)([^\/]*?)(\.[^\/]+|[extname]|)$/.exec(fileNames);

  const entryFileNames = `${filename}${extension}`;
  const root = `${dist}${dir.replace(dist, '').replace(/^(\.?\/)?/, `${packageID}/`)}`;

  dir = `${root}/${pathname ? `${pathname}/` : ''}`;

  existsSync(dir) || mkdirSync(dir);

  if (typeof input === 'string') {
    output.file = `${dir}${packageID}${buildID ? `.${buildID.replace(/:.*$/, '')}` : ''}${
      extension.startsWith('.') ? extension : format === 'es' ? '.mjs' : '.js'
    }`;
  } else {
    // options.experimentalCodeSplitting = true;
    output.dir = dir;
  }

  output.name = name || packageID;

  return {
    ...defaults,
    ...options,
    input,
    output: {
      ...defaults.output,
      ...output,
      entryFileNames,
      format,
    },
  };
};

const defaults = {
  context: 'this',
  output: {sourcemap: true},
};

const mjs = (name, naming = '[name].mjs') => bundle(`${name}:esm` in bundles ? `${name}:esm` : name, 'es', naming);
const umd = (name, naming = '[name].js') => bundle(name, 'umd', naming);
// const build = (name, ...modes) => modes.map(mode => mode in build.modes && build.modes[mode](name)).filter(Boolean);
// build.modes = {mjs, iife};

export default [
  mjs('markup'),
  umd('markup'),
  mjs('tokenizer:extended'),
  umd('tokenizer:extended'),
  mjs('tokenizer:esm'),
  mjs('tokenizer:browser:markup'),
  umd('tokenizer:browser:markup'),
  // iife('tokenizer:browser'),
  // bundle('markup', 'iife', '[name].js'),
  // bundle('tokenizer:browser', 'es', '[name].mjs'),
  // bundle('tokenizer:browser', 'iife', '[name].js'),
  // bundle('tokenizer/extended', 'es', '[name].mjs'),
  // bundle('tokenizer/extended', 'iife', '[name].js'),
  // bundle('tokenizer-extended', 'es', '[name].mjs'),
  // bundle('tokenizer-extended', 'iife', '[name].js'),
];

// tokenizer: {
//   input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.js`,
//   output: {
//     exports: 'named',
//     path: `${dirname}/dist`,
//   },
// },

// name.includes('/') &&
// const [, pathname, basename, extension] = /^(.*?)([^\/]*?)(\..*)$/.exec(filename);

// const dir = `${dir || path || `${dirname}/dist`;
// const file = `${dir || path || `${dirname}/dist`}/${entry || name}${extension || '.js'}`;

// const assetFileNames = output;
