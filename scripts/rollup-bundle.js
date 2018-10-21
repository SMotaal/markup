(async () => {
  const modules = [
    'worker.js',
    'markup.js',
    'lib/markup.js',
    'lib/markup-modes.js',
    'lib/markup-dom.js',
  ];
  const options = {
    output: { format: 'esm' },
  };
  const plugins = [{
    resolveId: (specifier, referrer) => {
      if (!referrer) return specifier;
      if (specifier[0] !== '.') return false;
      return new URL(specifier, `file:///${referrer}`).pathname.slice(1);
    },
    load: async module => {
      module in sources || (await load(module));
      return sources[module];
    },
  }];

  const requests = {};
  const errors = [];
  const logs = [];
  const sources = {
    'worker.js': `
        import markup from './markup.js';
        {
          const sources = [
            ['<html/>', {sourceType: 'html'}],
            ['export default "js";', {sourceType: 'es'}],
          ];

          const markups = sources.map(args => markup.render(... args));

          const jsons = JSON.parse(JSON.stringify(markups));

          console.info('worker.js - ${(new Date).toLocaleString()}: %o', {sources, markups, jsons});
        }
    `,
  };
  const bundles = {};

  const onwarn = warning => errors.push(warning);
  const cache = caches.open('default');

  try {
    for (const module of modules) {
      if (!(module in sources)) requests[module] = load(module);
    }
    Promise.all(Object.values(sources));
  } catch (exception) {
    errors.push(exception);
  }

  try {
    bundles[modules[0]] = await bundle(...modules);

  } catch (exception) {
    errors.push(exception);
  }

  try {
    const entry = modules[0];
    const bundle = bundles[entry];
    const source = bundle.output.code;
    const type = 'text/javascript';
    const blob = new Blob([source], { type });
    new Worker(URL.createObjectURL(blob));
    // const url = new URL(`./caches/${entry}`, location);
    // (await cache).put(url, new Response(blob));
    // const cached = {};
    // logs.push([{ cached }]);
    // cached.match = await caches.match(entry);
    // cached.contents = cached.match && (await (await cached.match).text());
  } catch (exception) {
    errors.push(exception);
  }


  console.group('Bundling…');
  errors.length && errors.map(console.log);
  logs.length && logs.map(args => console.log(...args));
  console.log({ modules, requests, sources, bundles });
  console.groupEnd();

  async function bundle(...modules) {
    const input = modules[0];
    const bundle = await rollup.rollup({ input, plugins, onwarn });
    const { code, map } = await bundle.generate(options);
    bundle.output = { code, map };
    return bundle;
  }

  async function load(module) {
    const request = fetch(module);
    try {
      sources[module] = await (sources[module] = request.then(response => response.text()));
    } catch (exception) {
      sources[module] = '';
      errors.push(exception);
    }
    return request;
  };

})();
