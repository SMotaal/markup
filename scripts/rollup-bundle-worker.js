(async function bundle(
  job = {
    id: 'caches/markup.worker.js',
    modules: [
      'lib/worker.js',
      'lib/markup.js',
      'lib/markup-parser.js',
      'lib/markup-modes.js',
      'lib/markup-dom.js',
    ],
    format: 'esm',
    options: {context: 'this'},
    sourcemap: 'inline',
    execute: true,
    cache: caches.open('default'),
  },
  api = new class BrowserAPI {
    constructor(properties) {
      ({
        sources: this.sources = {},
        requests: this.requests = [],
        cache: this.cache,
        serialize: this.serialize = async ({source, type}) => new Blob([source], {type}),
        resolve: this.resolve = (specifier, referrer) =>
          `${new URL(specifier, referrer || undefined)}`,
      } = properties || this);
    }

    async fetch(module) {
      const request = this.requests[module] || (this.requests[module] = fetch(module));
      this.sources[module] = '';
      this.sources[module] = await (await request).text();
      return request;
    }

    async load(module) {
      module in this.sources || (await this.fetch(module));
      return this.sources[module];
    }

    async save(payload, cache = this.cache) {
      if (!cache || typeof cache !== 'object') throw Error('Cannot write - no cache');
      const {url, blob = (payload.blob = await this.serialize(payload))} = payload;
      (await cache).put(url, new Response(blob));
      return payload.cached = url;
    }

    async execute(payload) {
      const {
        blob = (payload.blob = await this.serialize(payload)),
        blob: {url = (blob.url = URL.createObjectURL(blob))},
      } = payload;
      if (typeof importScripts === 'function') importScripts(url);
      else if (typeof Worker === 'function') new Worker(url);
      else throw Error('Cannot execute - unsupported runtime');
    }
  }(),
) {
  const JOB = `[Bundle ${(job && job.id) || null}]`;

  const error = (...args) =>
    void (error.onerror || (error.onerror = (job && job.onerror) || console.error))(...args);

  /// PRECHECK
  if (!job) return error(`${JOB}: aborted - no job`);
  else if (!job.id) return error(`${JOB}: aborted - no id`);
  else if (!job.modules || !job.modules.length > 0) return error(`${JOB}: aborted - no modules`);

  /// SETUP
  const sources = {};
  const bundles = {};
  const logs = [];
  const logger = (console.context && console.context(JOB)) || console;
  const warn = (...args) => logs.push([console.warn, args]);
  const log = (...args) => logs.push([console.log, args]);
  const {
    id,
    modules,
    options = (job.options = {}),
    options: {
      output = (job.options.output = {
        sourcemap: job.sourcemap || false,
        format: job.format || 'esm',
        ...job.payload,
      }),
      onwarn = (job.options.onwarn = job.onwarn || warn),
      context = job.context && job.options.context,
    },
    cache,
    type = (job.type = 'text/javascript'),
    base = api.resolve('./caches', ('object' === typeof location && location) || 'file:///'),
  } = job || (job = {});

  const plugins = [
    {
      resolveId: (specifier, referrer) => {
        if (!referrer) return specifier;
        return specifier[0] === '.' && api.resolve(specifier, `file:///${referrer}`).slice(8);
      },
      load: module => api.load(module),
    },
  ];

  /// GENERATE

  logger.group(JOB);

  try {
    logger.time(JOB);
    // await Promise.all(modules.map(id => id in sources || read(id)));
    const input = job.entry || (job.entry = modules[0]);
    const url = `${new URL(input, base)}`;
    const bundle = await rollup.rollup({...options, input, plugins});
    const {code: source, map: map} = await bundle.generate(options);
    job.payload = {url, source, map, type};
    job.bundle = bundle; // await bundle(...modules);
    logger.timeEnd(JOB);
  } catch (exception) {
    return error(exception);
  } finally {
    for (const [method, args] of logs) Reflect.apply(method, logger, args);
    logger.groupEnd(JOB);
  }

  if (!job.payload) return;

  if (job.cache) {
    await api.save(job.payload, job.cache);
  }

  /// EXECUTE
  if (job.execute) {
    setTimeout(
      'function' === typeof job.execute
        ? () => job.execute(job.payload)
        : () => api.execute(job.payload),
    );
  }

  return job;

})().then(console.log);
