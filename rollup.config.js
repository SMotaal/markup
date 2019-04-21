import {existsSync, mkdirSync} from 'fs';
const dirname = __dirname;
const dist = `${dirname}/dist/`;

// const variant = 'stable';
const variant = 'experimental';

const bundles = {
  ['markup']: {
    input: `${dirname}/lib/markup.js`,
    output: {exports: 'named'},
  },
  ['tokenizer:stable:extended']: {
    input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.extended.js`,
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:experimental:extended']: {
    input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.experimental.extended.js`,
    output: {exports: 'named', name: 'tokenizer'},
  },
  ['tokenizer:browser:markup:stable']: {
    input: `${dirname}/packages/@smotaal/tokenizer/browser/extended.js`,
    output: {exports: 'named', name: 'markup'},
  },
  ['tokenizer:browser:markup:experimental']: {
    input: `${dirname}/packages/@smotaal/tokenizer/browser/experimental.extended.js`,
    output: {exports: 'named', name: 'markup'},
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
const umd = (name, naming = '[name].js') => bundle(name, 'umd', `umd/${naming}`);
const cjs = (name, naming = 'legacy/[name].cjs') => bundle(name, 'cjs', naming);
const iife = (name, naming = '[name].js') => bundle(name, 'iife', `classic/${naming}`);

export default [
  esm(`tokenizer:${variant}:extended`),
  umd(`tokenizer:${variant}:extended`),
  iife(`tokenizer:${variant}:extended`),
  esm(`tokenizer:browser:markup:${variant}`),
  umd(`tokenizer:browser:markup:${variant}`),
  iife(`tokenizer:browser:markup:${variant}`),
  esm('tokenizer:browser:markup:stable', '[name].stable.js'),
  umd('tokenizer:browser:markup:stable', '[name].stable.js'),
  iife('tokenizer:browser:markup:stable', '[name].stable.js'),
  esm('tokenizer:browser:markup:experimental', '[name].experimental.js'),
  umd('tokenizer:browser:markup:experimental', '[name].experimental.js'),
  iife('tokenizer:browser:markup:experimental', '[name].experimental.js'),
];
