const dirname = __dirname;
const bundles = {
  markup: {
    input: `${dirname}/lib/markup.js`,
    output: {
      exports: 'named',
      path: `${dirname}/dist`,
    },
  },
  // tokenizer: {
  //   input: `${dirname}/packages/@smotaal/tokenizer/tokenizer.js`,
  //   output: {
  //     exports: 'named',
  //     path: `${dirname}/dist`,
  //   },
  // },
  'tokenizer/extended': {
    input: `${dirname}/packages/@smotaal/tokenizer/extended.js`,
    output: {
      path: `${dirname}/dist`,
      exports: 'named',
      name: 'tokenizer',
    },
  },
  'tokenizer/browser/': {
    input: [
      `${dirname}/packages/@smotaal/tokenizer/browser/markup.js`,
      `${dirname}/packages/@smotaal/tokenizer/browser/es.js`,
    ],
    manualChunks: {
      tokenizer: `${dirname}/packages/@smotaal/tokenizer/tokenizer.mjs`,
      'extensions/helpers': `${dirname}/packages/@smotaal/tokenizer/extensions/helpers.mjs`,
      'extensions/dom': `${dirname}/packages/@smotaal/tokenizer/extensions/dom.mjs`,
      'extensions/extensions': `${dirname}/packages/@smotaal/tokenizer/extensions/extensions.mjs`,
      'extensions/html-mode': `${dirname}/packages/@smotaal/tokenizer/extensions/html/html-mode.mjs`,
      'extensions/css-mode': `${dirname}/packages/@smotaal/tokenizer/extensions/css/css-mode.mjs`,
      'extensions/markdown-mode': `${dirname}/packages/@smotaal/tokenizer/extensions/markdown/markdown-mode.mjs`,
      'extensions/javascript-mode': `${dirname}/packages/@smotaal/tokenizer/extensions/javascript/javascript-mode.mjs`,
      'extensions/javascript-extensions': `${dirname}/packages/@smotaal/tokenizer/extensions/javascript/extended-mode.mjs`,
    },
    output: {
      path: `${dirname}/dist`,
      exports: 'named',
      name: 'tokenizer',
    },
  },
};

// prettier-ignore //
const bundle = (
  name,
  format = 'umd',
  assetFileNames = '',
  {output: {path: basepath = `${dirname}/dist`, ...output} = {}, ...options} = bundles[name],
) => {
  const [, outputPath = '', outputName] = /^(.*\/|)([^\/]*)$/.exec(name);
  const [
    ,
    pathname = outputPath,
    filename = '[name]',
    extension = '[extname]',
  ] = /^(.*\/|)([^\/]*?)(\.[^\/]+|[extname]|)$/.exec(assetFileNames);

  const dir = `${basepath}/${pathname}`;
  const entryFileNames = `${filename}${extension}`;

  // name.includes('/') &&
  // const [, pathname, basename, extension] = /^(.*?)([^\/]*?)(\..*)$/.exec(filename);

  // const dir = `${dir || path || `${dirname}/dist`;
  // const file = `${dir || path || `${dirname}/dist`}/${entry || name}${extension || '.js'}`;

  // const assetFileNames = output;
  return {
    ...defaults,
    ...options,
    output: {
      ...defaults.output,
      // file,
      dir,
      entryFileNames,
      format,
      name: output.name || name.replace(/\//g, '.'),
      ...output,
    },
  };
};

const defaults = {
  context: 'this',
  output: {sourcemap: 'inline'},
};

export default [
  bundle('markup', 'es', '[name].mjs'),
  bundle('markup', 'iife', '[name].js'),
  bundle('tokenizer/extended', 'es', '[name].mjs'),
  bundle('tokenizer/extended', 'iife', '[name].js'),
  bundle('tokenizer/browser/tokenizer', 'es', '[name].mjs'),
  bundle('tokenizer/browser/tokenizer', 'iife', '[name].js'),
  // bundle('tokenizer-extended', 'es', '[name].mjs'),
  // bundle('tokenizer-extended', 'iife', '[name].js'),
];
