const Tail = /[#?].*$|\/?$/;
// const Head = /^(?:((?:[hH][tT][tT][pP][sS]?|[fF][iI][lL][eE]):[/]*|[/]{2,})|[.]{0,2}[/]|)/i;
// const /[#?].*$/
const base = `${new URL('./', document.baseURI.replace(Tail, '/'))}`;
const RegExpEscape = /[\\^$*+?.()|[\]{}]/g; // replace(RegExpEscape, '\\$&')
const Base = (base => {
  const uncase = string => string.replace(/[a-z]/gi, c => `[${c.toLowerCase()}${c.toUpperCase()}]`);
  const partial = (string, head = '', tail = '') => {
    for (const part of string.replace(Tail, '').split('/')) {
      // head += `${head ? '[/]' : ''}(?:${part}`;
      head += `(?:${head ? '[/]' : ''}${part}`;
      tail += `)?`;
    }
    return `${head}${tail}(?=[/]|$)`;
    // return `${head}${tail}`;
  };
  const matcher = new RegExp(
    base
      .replace(RegExpEscape, '\\$&')
      .replace(
        /^(?=(http|file))(?:https?:\/*?(?=[^/])|file:\/{0,2}?(?=[a-z]:\/|\/))([^/]*?\/)([^#?]*\/|)([^#?\/]*)/i,
        (m, scheme, scope, path, entry) => {
          return `^((${uncase((scheme = scheme.toLowerCase()))}${scheme === 'http' ? '[sS]?' : ''}:|)([/]{0,2}${uncase(
            scope,
          )}|[/]{2}[^/]${scheme === 'file' ? '*' : '+'}[/])|[/]+?(?=[^/]|$))(${
            // path ? `${path.replace(/[/]/g, '[/]')}?` : ''
            path ? `(?:${partial(path)}|)` : ''
          }|)(?=([^#?]*))`;
        },
      ),
  );

  // matcher.relative = to => {
  //   const match = matcher.exec(to);
  //   if (match) {
  //     const [, prefix, parts, rest] = matcher.exec(to);
  //     console.log({to, match, prefix, parts, rest});
  //   }

  //   return to;
  // };

  return matcher;
})(base);

// console.log({base, Base}, base.replace(Base, '.'));

// Base.relative(base);
// Base.relative('file:///');
// Base.relative('//a/');
// Base.relative('//a');
// Base.relative('/a/');
// Base.relative('/a');
// Base.relative('///');

const local = specifier => `${new URL(specifier, import.meta.url)}`;
const scope = local('../../').replace(Base, '.');

const resolve = (() => {
  const root = `${
    location.pathname.includes(scope.slice(1))
      ? location.href.slice(0, location.href.indexOf(scope.slice(1)))
      : // : location.href.replace(/^(?!.*\/markup\/packages\/@smotaal\/tokenizer\/).*|\/markup\/.*/, '/markup/') ||
        `${new URL('./', location)}`
    // 'https://smotaal.io/markup/'
  }`.replace(Tail, '/');

  const scopes = {
    ['~']: `${new URL(scope, base)}`,
    // [':']: `${root}/benchmarks/assets`,
    // ['lib']: '../../lib',
    // ['markup']: `${root}/markup`,
    // ['modules']: `${root}/modules`,
    ['unpkg']: '//unpkg.com/',
    ['cdnjs']: '//cdnjs.cloudflare.com/ajax/libs/',
  };

  const entrypoints = {
    ['js']: `${scope}lib/tokenizer.js`,
    ['css']: (link => (link && link.href) || local('./markup.css'))(
      document.querySelector('link[rel*="stylesheet" i][src*="markup.css"], link[rel*="stylesheet" i]'),
    ),
    ['html']: location.href.replace(Tail, ''),
    ['md']: `${scope}README.md`,
  };

  const mappings = {js: 'es', html: 'html', css: 'css', md: 'md', esm: 'esm', cjs: 'cjs'};

  const examples = (({js, html, css, md, esm, cjs}, {unpkg, cdnjs}) => ({
    [html]: {url: entrypoints['html'], type: html},
    [css]: {url: entrypoints['css'], type: css},
    [js]: {url: entrypoints['js'], type: js},
    [esm]: {url: entrypoints['js'], type: esm},
    [cjs]: {url: entrypoints['js'], type: cjs},
    [md]: {url: entrypoints['md'], type: md},
    ['gfm']: `${root}benchmarks/assets/gfm.md`,
    ['acorn-esm']: {url: `${unpkg}acorn?module`, type: esm},
    ['acorn-cjs']: {url: `${unpkg}acorn`, type: cjs},
    ['acorn-loose']: `${cdnjs}acorn/5.7.3/acorn_loose.es.js`,
    ['esprima']: `${cdnjs}esprima/2.7.3/esprima.js`,
    ['babel-core']: `${cdnjs}babel-core/6.1.19/browser.js`,
    ['babel-core-min']: `${cdnjs}babel-core/6.1.19/browser.min.js`,
    ['popper']: `${cdnjs}popper.js/1.14.4/esm/popper.js`,
    ['xregexp']: `${cdnjs}xregexp/3.2.0/xregexp-all.js`,
    ['xregexp-min']: `${cdnjs}xregexp/3.2.0/xregexp-all.min.js`,
  }))(mappings, scopes);

  const Specifier = RegExp(
    /^(?:(examples)$|(scopes):?\/*|)/.source
      .replace('(examples)', `(${Object.keys(examples).join('|')})`)
      .replace('(scopes)', `(${Object.keys(scopes).join('|')})`),
  );

  return (specifier, type) => {
    let [, example = '', scope = ''] = Specifier.exec(specifier || '');

    const source =
      `${(example && example in examples && ((scope = 'bare'), (example = examples[example]).url || example)) ||
        (scope && scope in scopes && `${scopes[scope]}${specifier.slice(scope.length + 1)}`) ||
        ((scope = 'default'), specifier || '')}`.replace(Base, './') || undefined;

    type = type || (example && example.type) || undefined;

    return {source, scope, type};
  };
})();

export default (markup, overrides) => {
  const defaults = {
    variant: 1,
    repeats: 1,
    iterations: 1,
    sourceURL: `${new URL('../samples/complex.html', import.meta.url)}`.replace(new URL('./', location), ''),
    sourceType: undefined,
    element: 'pre#source-code',
    headerTemplate: 'template#source-header',
    ...overrides,

    fetch: (() =>
      /** @type {RequestInit} */
      ({
        mode: 'cors',
        // referrer: 'no-referrer',
        // redirect: 'follow',
        // headers: {'Content-Type': 'text/plain'},
        ...((overrides && overrides.fetch) || undefined),
      }))(),
  };

  // const Hash = /#([?]?)((?:.*?:)?.*?)(?:(\!+)([a-z]+|[A-Z]+)?)?(?:\*(?!\*)(\d+))?(?:\*{2}(\d+))?$/;
  const Hash = /#(?:(\d+)[:]?(?=\W|\b|$)|)([?]?)((?:.*?:)?.*?)(?:\!([a-z]+|[A-Z]+)?)?(?:\*(?!\*)(\d+))?(?:\*{2}(\d+))?$/;
  const options = Object.create(defaults);
  const sourceCodeElement = document.querySelector(options.element);
  const sourceHeaderTemplate = document.querySelector(options.headerTemplate);
  const flags = new Set();

  const fetchSource = async (source, options) => (
    (source.sourceText = ''),
    (source.response = await fetch(source.url, options).catch(console.warn)),
    (source.sourceText = await source.response.text()),
    // TODO: Revert once odd behaviour of response.redirected is resolved
    source.response.redirected && source.sourceText && source.sourceText.startsWith('Found. Redirecting to')
      ? ((source.url = `${new URL(source.sourceText.slice(source.sourceText.indexOf('/')), source.url)}`),
        fetchSource(source, options))
      : source
  );

  const loadFromURL = async specifier => {
    let returned;
    const url = `${new URL(specifier, location)}`;
    const source = {specifier, url};
    try {
      await fetchSource(source, defaults.fetch);
      return (returned = source);
    } finally {
      returned || console.warn('Failed to load source from "%s" — %o', specifier, source);
    }
  };

  const nextFrame = () => new Promise(ƒ => requestAnimationFrame(ƒ));

  const timeDelay = delay => new Promise(ƒ => setTimeout(ƒ, delay));

  const renderMarkup = async (sourceText, markupOptions) => {
    const fragment = markupOptions.fragment || (markupOptions.fragment = document.createDocumentFragment());
    await markup.render(sourceText, markupOptions, flags);
    if (flags.has('debug') && fragment.logs) console.log(...fragment.logs);
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
          header.parentElement.classList.contains('prefers-dark-mode') &&
            header.parentElement.classList.add('dark-mode');
        }));
    }

    header.status = (name, value) => {
      header.status[name] === (header.status[name] = value);
      const element = header.elements[`${name}-span`];
      const text = `${value || ''}`;
      element ? (element.innerText = text) : text && flags.has('debug') && console.info('[%s] %o', name, value);
    };

    header.timing = (name, value) => {
      header.timing[name] === (header.timing[name] = value);
      const status = header.status[name] || 'done';
      const element = header.elements[`${name}-time`];
      const text = `${(value !== true && value >= 0 && value) || ''}`;
      element
        ? (element.setAttribute('value', text), (element.innerText = (value === true && '…') || text))
        : flags.has('debug') && console.info('[%s] %o — %o', name, status, value);
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
      await nextFrame(header.status('source', `${specifier}`.replace(Base, './')), header.timing('source', true));
      const {
        result: {sourceText, response},
      } = await time('source', () => loadFromURL(specifier));
      sourceType =
        sourceType ||
        `${response.headers.get('Content-Type')}`.replace(/^(?:.*?\/)?(\w+).*$/, '$1').toLowerCase() ||
        options.sourceType;
      // const {v2 = (options.v2 = /[A-Z]/.test(sourceType))} = options;
      sourceType = sourceType.toLowerCase();
      const variant = options.variant > 0 ? options.variant : defaults.variant;
      const markupOptions = {sourceType, variant};
      // const markupFlags = [... flags].join('');
      header.status('source', `${specifier}`.replace(Base, './'));

      fragment = code;

      const sourceID = `«${specifier.replace(/^.*\//, '…/')} [${sourceText.length}] ${sourceType}»`;

      const iterate = iterations => {
        for (let n = iterations; n--; ) for (const t of markup.tokenize(sourceText, markupOptions, flags));
      };

      const repeat = async repeats => {
        for (let n = repeats; n--; code.appendChild(await renderMarkup(sourceText, markupOptions)));
      };

      const timed = async (marker, ...args) => {
        flags.has('debug')
          ? (console.time((marker = `${sourceID} - ${marker}`)), await time(...args), console.timeEnd(marker))
          : await time(...args);
      };

      render = async () => {
        await nextFrame((code.innerText = ''));

        header.stats({name: 'repeats', status: '', time: -1});
        header.stats({name: 'iterations', status: '', time: -1});

        if (iterations > 0) {
          await nextFrame(header.stats({name: 'iterations', status: `⁑${iterations}`, time: true}));
          await timeDelay(100);
          await timed(
            `${iterations} iterations`,
            'iterations',
            async ƒ => void (await iterate(iterations)),
            iterations,
          );
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
      await markup.warmup(sourceText, markupOptions, flags);
      await nextFrame(
        header.status(
          'source-type',
          `${(markupOptions.mode && markupOptions.mode.syntax) || sourceType}${
            markupOptions.variant > 1 ? `@${markupOptions.variant}` : ''
          }`,
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
    [, match.variant, match.debugging, match.specifier, match.type, match.repeats, match.iterations] = match;

    options.variant = match.variant >= 0 && parseInt(match.variant);
    options.repeats = match.repeats >= 0 ? parseInt(match.repeats) : defaults.repeats;
    options.iterations = match.iterations >= 0 ? parseInt(match.iterations) : defaults.iterations;
    match.debugging ? flags.add('debug') : flags.delete('debug');

    const {source = options.source || defaults.sourceURL, type, scope} = resolve(match.specifier, match.type);

    renderFromURL((options.source = source), type).catch(error =>
      console.warn('[renderFromHash]: %o\n\n%o', error, {match, source, type, options}),
    );
  };

  window.addEventListener('hashchange', () => renderFromHash());

  requestAnimationFrame(() => renderFromHash((location.hash !== '#' && location.hash) || `#${defaults.sourceURL}`));

  sourceHeaderTemplate &&
    (sourceHeaderTemplate.selectors = {
      ['source-span']: '#source',
      ['source-time']: '#source + time',
      ['source-type-span']: '#source-type',
      ['repeats-span']: '#repeats',
      ['repeats-time']: '#repeats + time',
      ['iterations-span']: '#iterations',
      ['iterations-time']: '#iterations + time',
      ['rerender-button']: '#rerender[onclick]',
      ['contrast-button']: '#contrast[onclick]',
    });
};
