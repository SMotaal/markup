import {existsSync, mkdirSync} from 'fs';
const dirname = __dirname;
const dist = `${dirname}/dist/`;

const bundles = {
  ['markup']: {
    input: `${dirname}/lib/markup.js`,
    output: {exports: 'named'},
  },
  ['tokenizer:extended']: {
    input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.extended.js`,
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:experimental:extended']: {
    input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.experimental.extended.js`,
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:browser:markup']: {
    input: `${dirname}/packages/@smotaal/tokenizer/browser/markup.js`,
    output: {path: `./browser`, exports: 'named', name: 'markup'},
  },
  ['tokenizer:browser:markup:experimental']: {
    input: `${dirname}/packages/@smotaal/tokenizer/browser/markup.experimental.js`,
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

const esm = (name, naming = '[name].js') => bundle(`${name}:esm` in bundles ? `${name}:esm` : name, 'es', naming);
const umd = (name, naming = 'legacy/[name].js') => bundle(name, 'umd', naming);
const cjs = (name, naming = 'legacy/[name].cjs') => bundle(name, 'cjs', naming);
// const build = (name, ...modes) => modes.map(mode => mode in build.modes && build.modes[mode](name)).filter(Boolean);
// build.modes = {esm, iife};

export default [
  // esm('markup'),
  // umd('markup'),
  // cjs('markup'),
  // esm('tokenizer:extended'),
  // umd('tokenizer:extended'),
  // cjs('tokenizer:extended'),
  esm('tokenizer:experimental:extended'),
  umd('tokenizer:experimental:extended'),
  cjs('tokenizer:experimental:extended'),
  // esm('tokenizer:browser:markup'),
  // umd('tokenizer:browser:markup'),
  // cjs('tokenizer:browser:markup'),
  esm('tokenizer:browser:markup:experimental'),
  umd('tokenizer:browser:markup:experimental'),
  cjs('tokenizer:browser:markup:experimental'),
  // esm('tokenizer:esm'),
];

// ['tokenizer:esm']: {
//   input: {
//     ['tokenizer']: `${dirname}/packages/@smotaal/tokenizer/tokenizer.js`,
//     // ['extended']: `${dirname}/packages/@smotaal/tokenizer/extended.js`,
//     ['browser/markup']: `${dirname}/packages/@smotaal/tokenizer/browser/markup.js`,
//     // ['extensions/helpers']: `${dirname}/packages/@smotaal/tokenizer/extensions/helpers.js`,
//     ['extensions/dom']: `${dirname}/packages/@smotaal/tokenizer/extensions/dom.js`,
//     // ['extensions/extensions']: `${dirname}/packages/@smotaal/tokenizer/extensions/extensions.js`,
//     ['extensions/html-mode']: `${dirname}/packages/@smotaal/grammars/html/html-grammar.js`,
//     ['extensions/css-mode']: `${dirname}/packages/@smotaal/grammars/css/css-grammar.js`,
//     ['extensions/markdown-mode']: `${dirname}/packages/@smotaal/grammars/markdown/markdown-grammar.js`,
//     ['extensions/javascript-mode']: `${dirname}/packages/@smotaal/grammars/javascript/javascript-grammar.js`,
//     ['extensions/javascript-extensions']: `${dirname}/packages/@smotaal/grammars/javascript/javascript-extended-grammar.js`,
//   },
//   manualChunks: {
//     ['extensions/helpers']: [
//       `${dirname}/packages/@smotaal/grammars/common/helpers.js`,
//       `${dirname}/packages/@smotaal/grammars/common/patterns.js`,
//     ],
//   },
//   output: {exports: 'named', name: 'tokenizer', chunkFileNames: '[name]'},
// },
