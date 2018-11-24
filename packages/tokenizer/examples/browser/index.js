import * as markup from '../markup.mjs';

const defaults = {
  version: 1,
  repeats: 1,
  iterations: 1,
  sourceURL: 'index.html',
  sourceType: undefined,
  element: 'pre#source-code',
  headerTemplate: 'template#source-header',
};
const Hash = /#((?:.*?:)?.*?)(?:(\!+)([a-z]+|[A-Z]+))?(?:\*(?!\*)(\d+))?(?:\*{2}(\d+))?$/;
const options = Object.create(defaults);
const sourceCodeElement = document.querySelector(options.element);
const sourceHeaderTemplate = document.querySelector(options.headerTemplate);

const loadFromURL = async specifier => {
  let fetched, response, result;
  const url = `${new URL(specifier, location)}`;
  const source = {specifier, url};
  try {
    source.response = await fetch(url);
    source.sourceText = await source.response.text();
    return (result = source);
  } finally {
    result || console.warn('Failed to load source from "%s" — %o', specifier, source);
  }
};

const nextFrame = () => new Promise(ƒ => requestAnimationFrame(ƒ));

const timeDelay = delay => new Promise(ƒ => setTimeout(ƒ, delay));

const renderMarkup = async (sourceText, markupOptions) => {
  const fragment = markupOptions.fragment || (markupOptions.fragment = document.createDocumentFragment());
  await markup.render(sourceText, markupOptions);
  if (fragment.logs) console.log(...fragment.logs);
  return fragment;
};

const renderHeader = ({template = sourceHeaderTemplate, selectors = template.selectors, rerender = console.warn}) => {
  /** @type {HTMLElement} */
  const header = document.createElement('header');
  header.append(template.content.cloneNode(true));

  header.elements = {};

  if (selectors)
    for (const [id, selector] of Object.entries(selectors))
      header.elements[id] = (selector && header.querySelector(selector)) || undefined;

  {
    const {'rerender-button': renderButton, 'contrast-button': contrastButton} = header.elements;
    renderButton && (renderButton.onclick = rerender);
    contrastButton &&
      ((contrastButton.onclick = () => {
        header.parentElement.classList.toggle('dark-mode')
          ? (localStorage.lightMode = !(localStorage.darkMode = true))
          : (localStorage.darkMode = !(localStorage.lightMode = true));
      }),
      (contrastButton.ondblClick = () => {
        delete localStorage.lightMode, delete localStorage.darkMode;
        const classList = header.parentElement.classList;
        header.parentElement.classList.contains('prefers-dark-mode') && header.parentElement.classList.add('dark-mode');
      }));
  }

  header.status = (name, value) => {
    header.status[name] === (header.status[name] = value);
    const element = header.elements[`${name}-span`];
    const text = `${value || ''}`;
    element ? (element.innerText = text) : text && console.info('[%s] %o', name, value);
  };

  header.timing = (name, value) => {
    header.timing[name] === (header.timing[name] = value);
    const status = header.status[name] || 'done';
    const element = header.elements[`${name}-time`];
    const text = `${(value !== true && value >= 0 && value) || ''}`;
    element
      ? (element.setAttribute('value', text), (element.innerText = (value === true && '…') || text))
      : console.info('[%s] %o — %o', name, status, value);
  };

  header.stats = ({name, status, time}) => {
    !name || (status === undefined || header.status(name, status), time === undefined || header.timing(name, time));
  };

  header.reset = () => {
    for (const [id, element] of Object.entries(header.elements)) /-time|-span/.test(id) && (element.innerText = '');
  };

  return header;
};

const round = (value, significance = 1) =>
  Math.round((significance = 10 ** (~~significance || 0)) * value) / significance;

const renderFromURL = async (specifier, sourceType) => {
  let returned, fragment, render;
  const {repeats = 1, iterations = 1, now = Date.now} = options;

  const container = sourceCodeElement;
  const rerender = () => render();
  const header = renderHeader({rerender});
  const code = document.createElement('slot');
  const {timing, status} = header;
  const time = async (name, executor, cycles = 1) => {
    let start, result, end, elapsed;
    start = now();
    result = await executor();
    end = now();
    elapsed = end - start;
    timing && timing(name, round(elapsed / cycles));
    return {name, executor, start, result, end, elapsed};
  };

  (container.innerHTML = ''), container.append(header, code);

  try {
    await nextFrame(header.status('source', `${specifier}`), header.timing('source', true));
    const {
      result: {sourceText, response},
    } = await time('source', () => loadFromURL(specifier));
    sourceType =
      sourceType ||
      `${response.headers.get('Content-Type')}`.replace(/^(?:.*?\/)?(\w+).*$/, '$1').toLowerCase() ||
      options.sourceType;
    // const {v2 = (options.v2 = /[A-Z]/.test(sourceType))} = options;
    sourceType = sourceType.toLowerCase();
    const version = options.version > 0 ? options.version : defaults.version;
    // console.log({'options.version': options.version, 'defaults.version': defaults.version});
    sourceType in markup.mappings || (sourceType = 'markup');
    const markupOptions = {sourceType, version};
    header.status('source', `${specifier}`);

    fragment = code;

    const sourceID = `«${specifier.replace(/^.*\//, '…/')} [${sourceText.length}] ${sourceType}»`;

    const iterate = iterations => {
      for (let n = iterations; n--; ) for (const t of markup.tokenize(sourceText, markupOptions));
    };

    const repeat = async repeats => {
      for (let n = repeats; n--; code.appendChild(await renderMarkup(sourceText, markupOptions)));
    };

    const timed = async (marker, ...args) => {
      console.time((marker = `${sourceID} - ${marker}`));
      await time(...args);
      console.timeEnd(marker);
    };

    render = async () => {
      await nextFrame((code.innerText = ''));

      header.stats({name: 'repeats', status: '', time: -1});
      header.stats({name: 'iterations', status: '', time: -1});

      if (iterations > 0) {
        await nextFrame(header.stats({name: 'iterations', status: `⁑${iterations}`, time: true}));
        await timeDelay(100);
        await timed(`${iterations} iterations`, 'iterations', async ƒ => void (await iterate(iterations)), iterations);
        await nextFrame(header.status('iterations', `⁑${iterations}`));
      }

      if (repeats > 0) {
        // await timeDelay(100);
        await nextFrame(header.stats({name: 'repeats', status: `⁎${repeats}`, time: true}));
        await timed(`${repeats} repeats`, 'repeats', async ƒ => void (await repeat(repeats)), repeats);
        await nextFrame(header.status('repeats', `⁎${repeats}`));
      }

      return fragment;
    };

    await nextFrame();
    await markup.warmup(sourceText, markupOptions);
    await nextFrame(
      header.status(
        'source-type',
        `${(markupOptions.mode && markupOptions.mode.syntax) || sourceType}@${markupOptions.version}`,
      ),
    );
    fragment = await render();

    return (returned = fragment);
  } finally {
    !returned && (container.innerText = 'Failed!');
  }
};

const renderFromHash = (hash = location.hash || '#') => {
  const match = Hash.exec(hash.trim());
  const [, specifier, version, type, repeats = defaults.repeats, iterations = defaults.iterations] = match;

  options.version = version ? version.length : 1;
  options.repeats = repeats >= 0 ? parseInt(repeats) : defaults.repeats;
  options.iterations = iterations >= 0 ? parseInt(iterations) : defaults.iterations;

  let [, example = '', scope = ''] = Specifier.exec(specifier || '');
  const source =
    (example && ((example = examples[example]).url || example)) ||
    (scope && `${scopes[scope]}\/${specifier.slice(scope.length + 1)}`) ||
    specifier;
  // console.log({match, example, scope, source}); //  Specifier
  const sourceURL = (source && (options.source = source)) || options.source || (options.source = defaults.sourceURL);
  const sourceType = type || example.type || undefined;
  // console.log({sourceURL, sourceType},  {specifier, type, repeats, iterations}, {source});

  renderFromURL(sourceURL, sourceType);
};

window.addEventListener('hashchange', () => renderFromHash());

requestAnimationFrame(() => renderFromHash((location.hash !== '#' && location.hash) || `#${defaults.sourceURL}`));

const mappings = {js: 'es', html: 'html', css: 'css', md: 'md', esm: 'esm', cjs: 'cjs'};

const root =
  location.href.replace(/^(?!.*\/markup\/packages\/tokenizer\/).*|\/markup\/.*/, '') ||
  'https://smotaal.github.com/experimental';

const scopes = {
  ':': `${root}/markup/benchmarks/assets`,
  lib: '../../lib',
  markup: `${root}/markup`,
  modules: `${root}/modules`,
  unpkg: 'https://unpkg.com',
  cdnjs: 'https://cdnjs.cloudflare.com/ajax/libs',
};

const entrypoints = {
  js: '../../lib/tokenizer.mjs',
  css: './markup.css',
  html: './index.html',
  md: '../../README.md',
};

const examples = (({js, html, css, md, esm, cjs}, {unpkg, cdnjs}) => ({
  [html]: {url: entrypoints.html, type: html},
  [css]: {url: entrypoints.css, type: css},
  [js]: {url: entrypoints.js, type: js},
  [esm]: {url: entrypoints.js, type: esm},
  [cjs]: {url: entrypoints.js, type: cjs},
  [md]: {url: entrypoints.md, type: md},
  gfm: `${root}/markup/benchmarks/assets/gfm.md`,
  'acorn-esm': {url: `${unpkg}/acorn?module`, type: esm},
  'acorn-cjs': {url: `${unpkg}/acorn`, type: cjs},
  'acorn-loose': `${cdnjs}/acorn/5.7.3/acorn_loose.es.js`,
  esprima: `${cdnjs}/esprima/2.7.3/esprima.js`,
  'babel-core': `${cdnjs}/babel-core/6.1.19/browser.js`,
  'babel-core-min': `${cdnjs}/babel-core/6.1.19/browser.min.js`,
  popper: `${cdnjs}/popper.js/1.14.4/esm/popper.js`,
  xregexp: `${cdnjs}/xregexp/3.2.0/xregexp-all.js`,
  'xregexp-min': `${cdnjs}/xregexp/3.2.0/xregexp-all.min.js`,
}))(mappings, scopes);

const Specifier = RegExp(
  /^(?:(examples)$|(scopes):?\/*|)/.source
    .replace('(examples)', `(${Object.keys(examples).join('|')})`)
    .replace('(scopes)', `(${Object.keys(scopes).join('|')})`),
);

sourceHeaderTemplate &&
  (sourceHeaderTemplate.selectors = {
    'source-span': '#source',
    'source-time': '#source + time',
    'source-type-span': '#source-type',
    'repeats-span': '#repeats',
    'repeats-time': '#repeats + time',
    'iterations-span': '#iterations',
    'iterations-time': '#iterations + time',
    'rerender-button': '#rerender[onclick]',
    'contrast-button': '#contrast[onclick]',
  });
