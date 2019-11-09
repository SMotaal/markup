import {existsSync, mkdirSync} from 'fs';
import {fileURLToPath} from 'url';

const formats = ['esm', 'cjs', 'umd', 'iife'];

console.log({__dirname, 'import.meta.url': import.meta.url});

const configuration = {
  variants: ['experimental', 'stable'],

  /** @returns {Record<string, RollupBundleOptions>} */
  createDefinitions(dirname = `${this.dirname || this.defaults.dirname}`) {
    return {
      ['markup']: {
        input: `${dirname}packages/markup/lib/markup.js`,
        output: {exports: 'named'},
      },
      ['tokenizer:stable:extended']: {
        input: `${dirname}packages/tokenizer/tokenizer.extended.js`,
        output: {exports: 'named', name: 'tokenizer'},
      },
      ['tokenizer:experimental:extended']: {
        input: `${dirname}packages/tokenizer/tokenizer.experimental.extended.js`,
        output: {exports: 'named', name: 'tokenizer'},
      },
      ['tokenizer:browser:markup:stable']: {
        input: `${dirname}packages/tokenizer/browser/extended.js`,
        output: {exports: 'named', name: 'markup'},
      },
      ['tokenizer:browser:markup:experimental']: {
        input: `${dirname}packages/tokenizer/browser/experimental.extended.js`,
        output: {exports: 'named', name: 'markup'},
      },
      ['tokenizer:browser:experimental:es:extended']: {
        input: `${dirname}packages/tokenizer/browser/experimental.es.extended.js`,
        output: {exports: 'named', name: 'markup'},
      },
      ['tokenizer:browser:experimental:es']: {
        input: `${dirname}packages/tokenizer/browser/experimental.es.js`,
        output: {exports: 'named', name: 'markup'},
      },
      ['tokenizer:experimental:es:standalone']: {
        input: `${dirname}experimental/es/standalone.js`,
        output: {exports: 'named', name: 'markup'},
      },
    };
  },
  defaults: Object.freeze({
    dirname: fileURLToPath(
      new URL('./', /(?:\/markup\/|\/)(?=rollup.config.js)/[Symbol.replace](import.meta.url, '/markup/')),
    ),
    formats: ['esm', 'umd', 'iife'],
    variant: 'experimental',
    bundle: Object.freeze({
      context: 'this',
      output: {sourcemap: true, preferConst: true},
    }),
  }),
  bundles: /** @type {RollupBundleOptions[]} */ (undefined),
  createConfiguration(options) {
    const stringify = value =>
      typeof value === symbol ? `‹symbol›` : value == null ? `${value}` : JSON.stringify(value);
    const logify = (strings, ...values) => String.raw(strings, values.map(stringify));
    const lowerCase = Function.call.bind(''.toLowerCase);
    const configuration = /** @type {Configuration} */ (Object.setPrototypeOf(
      {
        // ...this.defaults,
        dirname: (options && options.dirname && String(options.dirname)) || this.defaults.dirname,
        dist: (options && options.dist && String(options.dist)) || undefined,
        variant: (options && options.variant && lowerCase(options.variant)) || this.defaults.variant,
        formats:
          (options && options.formats && /\W+/[Symbol.split](lowerCase(options.formats))) || this.defaults.formats,
        defaults: this.defaults,
        options,
      },
      this,
    ));

    if (!(!!configuration.dirname && existsSync(configuration.dirname)))
      throw Error(logify`Dirname ${configuration.dirname} does not exist`);
    if (!(!!configuration.variant && this.variants.includes(configuration.variant)))
      throw Error(logify`Variant ${configuration.variant} not in ${this.variants}`);
    if (!(!!configuration.formats && new RegExp(`((?:^|,)(?:${formats.join('|')}))+`).test(configuration.formats)))
      throw Error(logify`Formats ${configuration.formats} not in ${formats}`);

    configuration.dirname = /\/*$/[Symbol.replace](configuration.dirname, '/');

    if (configuration.dist === undefined) configuration.dist = `${configuration.dirname}dist/`;

    return configuration;
  },
  createBundle(
    definitions,
    bundle,
    format = 'umd',
    fileNames = '',
    {input, output: {dir: dir = '', name, ...output} = {}, ...options} = definitions[bundle],
  ) {
    const [packageID, buildID] = bundle.split(/:(.*)$/, 2);
    const [
      ,
      pathname = '',
      filename = '[name]',
      extension = '[extname]',
    ] = /^(.*\/|)([^\/]*?)(\.[^\/]+|[extname]|)$/.exec(fileNames);

    const entryFileNames = `${filename}${extension}`;
    const root = `${this.dist}${dir.replace(this.dist, '').replace(/^(\.?\/)?/, `${packageID}/`)}`;

    // dir = `${root}/${pathname ? pathname.slice(0, -1) : ''}`;
    dir = /\/*$/[Symbol.replace](`${root}${pathname ? pathname : ''}`, '/');

    console.log({packageID, root, dir}, this);

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

    console.log({bundle, packageID, buildID, dir, root, pathname, filename, extension, output});

    return {
      ...this.defaults.bundle,
      ...options,
      input,
      output: {
        ...this.defaults.bundle.output,
        ...output,
        entryFileNames,
        format,
      },
      plugins: [],
    };
  },
  create(options) {
    const configuration = this.createConfiguration(options);
    const {formats} = configuration;
    const definitions = configuration.createDefinitions();
    const bundles = [];

    const esm = (name, naming = '[name].js') =>
      formats.includes('esm') &&
      bundles.push(
        configuration.createBundle(definitions, `${name}:esm` in definitions ? `${name}:esm` : name, 'es', naming),
      );
    const umd = (name, naming = '[name].js') =>
      formats.includes('umd') && bundles.push(configuration.createBundle(definitions, name, 'umd', `umd/${naming}`));
    const cjs = (name, naming = 'legacy/[name].cjs') =>
      formats.includes('cjs') && bundles.push(configuration.createBundle(definitions, name, 'cjs', naming));
    const iife = (name, naming = '[name].js') =>
      formats.includes('iife') &&
      bundles.push(configuration.createBundle(definitions, name, 'iife', `classic/${naming}`));

    esm(`tokenizer:experimental:es:standalone`, '[name].es.standalone.js');
    esm(`tokenizer:browser:experimental:es:extended`, '[name].es.extended.js');
    esm(`tokenizer:browser:experimental:es`, '[name].es.js');
    esm(`tokenizer:${configuration.variant}:extended`);
    umd(`tokenizer:${configuration.variant}:extended`);
    iife(`tokenizer:${configuration.variant}:extended`);
    esm(`tokenizer:browser:markup:${configuration.variant}`);
    umd(`tokenizer:browser:markup:${configuration.variant}`);
    iife(`tokenizer:browser:markup:${configuration.variant}`);
    esm('tokenizer:browser:markup:stable', '[name].stable.js');
    umd('tokenizer:browser:markup:stable', '[name].stable.js');
    iife('tokenizer:browser:markup:stable', '[name].stable.js');
    esm('tokenizer:browser:markup:experimental', '[name].experimental.js');
    umd('tokenizer:browser:markup:experimental', '[name].experimental.js');
    iife('tokenizer:browser:markup:experimental', '[name].experimental.js');

    console.dir({configuration, definitions, bundles}, /** @type {import('util').InspectOptions} **/ {depth: 10});

    return bundles;
  },
};

export default configuration.create();

/** @typedef {import('rollup').RollupDirOptions|import('rollup').RollupFileOptions} RollupBundleOptions */
/** @typedef {Partial<(typeof configuration)['defaults']>} Options */
/** @typedef {typeof configuration & {options: Options, definitions: Record<string, RollupBundleOptions>}} Configuration */

// {
//   transform(code, id) {
//     if (!/\.js$/i.test(id)) return code;
//     console.log(id);
//     let excluding;
//     const included = [];
//     const excluded = [];
//     for (const token of tokenizeSourceText(code)) {
//       if (excluding) {
//         excluded.push(token.text);
//         if (
//           token.type === 'comment' &&
//           token.text.startsWith('/*') &&
//           token.text.endsWith('*/') &&
//           token.text.slice(2, -2).trim() === 'exclude-ends'
//         ) {
//           excluding = false;
//         }
//       } else {
//         if (
//           token.type === 'comment' &&
//           token.text.startsWith('/*') &&
//           token.text.endsWith('*/') &&
//           token.text.slice(2, -2).trim() === 'exclude-starts'
//         ) {
//           excluding = true;
//           excluded.push(token.text);
//         } else {
//           included.push(token.text);
//         }
//       }
//     }
//     return included.join('');
//   },
// },
