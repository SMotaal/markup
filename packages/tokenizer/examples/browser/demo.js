import {Resolvers, Hash, resolve, rewrite, frame, timeout} from './helpers.js';

DarkMode: {
  (() => {
    const classList = document.documentElement.classList;
    const toggle = async (state, auto) => {
      if (auto === true) {
        if (state === true) darkMode.prefers = 'dark';
        else if (state === false) darkMode.prefers = 'light';
        if (darkMode.state !== 'auto') return;
      }
      state =
        state === 'auto'
          ? ((auto = true), darkMode.prefers !== 'light')
          : state == null
          ? !classList.contains('dark-mode')
          : !!state;
      darkMode.state = localStorage.darkMode = auto ? 'auto' : state ? 'enabled' : 'disabled';
      state ? classList.add('dark-mode') : classList.remove('dark-mode');
    };
    const enable = auto => toggle(true, auto);
    const disable = auto => toggle(false, auto);
    const darkMode = (({assign, create, freeze, getOwnPropertyDescriptors}) =>
      assign(create(null, getOwnPropertyDescriptors(freeze({enable, disable, toggle}))), {
        state: undefined,
        prefers: undefined,
      }))(Object);

    ((prefersDarkMode, prefersLightMode) => {
      localStorage.darkMode === 'enabled'
        ? ((darkMode.state = 'enabled'), enable())
        : localStorage.darkMode === 'disabled'
        ? ((darkMode.state = 'disabled'), disable())
        : toggle(
            prefersDarkMode === true || prefersLightMode.matches !== true,
            !!(localStorage.darkMode = darkMode.state = 'auto'),
          );
      prefersDarkMode.addListener(({matches = false}) => toggle(!!matches, true));
      prefersLightMode.addListener(({matches = false}) => toggle(!matches, true));
      // prefersLightMode
    })(matchMedia('(prefers-color-scheme: dark)'), matchMedia('(prefers-color-scheme: light)'));
    // element.style.transition = '';
    document.darkMode = darkMode;
  })();
}

Header: {
  document.querySelector('template#source-header') ||
    ((innerHTML, id = 'source-header') =>
      document.head.append(Object.assign(document.createElement('template'), {id, innerHTML})))(
      (html => html`
        <div id="summary">
          <span title="source"><span id="source"></span><time unit="ms"></time></span>
        </div>
        <div id="details">
          <span title="mode"><span id="mode"></span><span id="variant"></span></span>
          <span title="iterations"><span id="iterations"></span><time unit="ms"></time></span>
          <span title="repeats"><span id="repeats"></span><time unit="ms"></time></span>
        </div>
        <div id="controls">
          <span>
            <a id="rerender" title="Repeat" onclick><i icon>&#x2301;</i></a>
            <a id="contrast" title="Dark/Light" onclick><i icon>&#x263D;</i></a>
          </span>
        </div>
      `)(String.raw),
    );
}

const Examples = ({
  ['es']: ES = local('./dist/tokenizer.experimental.js'),
  ['html']: HTML = rewrite.tail(location.href),
  ['css']: CSS = resolve('./markup.css', import.meta.url),
  ['md']: MD = local('./README.md'),
} = {}) => ({
  ['html']: {url: HTML, mode: 'html'},
  ['es']: {url: ES, mode: 'es'},
  ['css']: {url: CSS, mode: 'css'},
  ['esm']: {url: ES, mode: 'esm'},
  ['cjs']: {url: ES, mode: 'cjs'},
  ['md']: {url: MD, mode: 'md'},
  ['json']: {url: local('./examples/samples/sample.json')},
  ['gfm']: {url: local('./examples/samples/gfm.md')},
  ['babel']: {url: unpkg('@babel/standalone')},
  ['acorn-esm']: {url: unpkg('acorn?module'), mode: 'esm'},
  ['acorn-cjs']: {url: unpkg('acorn'), mode: 'cjs'},
  ['acorn-loose']: {url: cdnjs('acorn/5.7.3/acorn_loose.es.js')},
  ['esprima']: {url: cdnjs('esprima/2.7.3/esprima.js')},
  ['babel-core']: {url: cdnjs('babel-core/6.1.19/browser.js')},
  ['babel-core-min']: {url: cdnjs('babel-core/6.1.19/browser.min.js')},
  ['popper']: {url: cdnjs('popper.js/1.14.4/esm/popper.js')},
  ['xregexp']: {url: cdnjs('xregexp/3.2.0/xregexp-all.js')},
  ['xregexp-min']: {url: cdnjs('xregexp/3.2.0/xregexp-all.min.js')},
});

const resolvers = Resolvers({
  ['~']: resolve('../../', import.meta.url),
  ['unpkg']: resolve(`https://unpkg.com/`),
  ['cdnjs']: resolve(`https://cdnjs.cloudflare.com/ajax/libs/`),
});
const {['~']: local, unpkg, cdnjs} = resolvers;

const glyphs = {'@': '@', '#': '#', '*': '⁎', '**': '⁑', '!': '!', '!!': '!!'};
const glyph = symbol => glyphs[symbol] || symbol || '';

const defaults = {
  variant: 1,
  repeats: 1,
  iterations: 1,
  sourceURL: resolve('../samples/complex.html', import.meta.url),
  sourceType: undefined,
  element: 'pre#source-code',
  headerTemplate: 'template#source-header',
  fetch: {
    mode: 'cors',
    // referrer: 'no-referrer',
    redirect: 'follow',
    headers: {'Content-Type': 'text/plain'},
  },
};

export default (markup, overrides) => {
  const {examples = Examples(), ...options} = {
    ...(defaults || undefined),
    ...(overrides || undefined),
    fetch: {
      ...((defaults && defaults.fetch) || undefined),
      ...((overrides && overrides.fetch) || undefined),
    },
  };

  options.defaults = {...options};

  const sourceCodeElement = document.querySelector(options.element);
  const sourceHeaderTemplate = document.querySelector(options.headerTemplate);
  const flags = new Set();

  const fetchSource = async (source, options) => (
    (source.sourceText = ''),
    (source.response = await fetch(source.url, options).catch(console.warn)),
    (source.sourceText = await source.response.text()),
    // TODO: Revert if response.redirected is not honoured (again)
    fetchSource.followRedirect(source, options)
    // source
  );

  fetchSource.followRedirect = (source, options) =>
    source.response.redirected && source.sourceText && source.sourceText.startsWith('Found. Redirecting to')
      ? ((source.url = `${new URL(source.sourceText.slice(source.sourceText.indexOf('/')), source.url)}`),
        fetchSource(source, options))
      : source;

  const loadFromURL = async specifier => {
    let returned;
    const url = `${new URL(specifier, location)}`;
    const source = {specifier, url};
    try {
      await fetchSource(source, options.fetch);
      return (returned = source);
    } finally {
      returned || console.warn('Failed to load source from "%s" — %o', specifier, source);
    }
  };

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

    /** @type {{[K in selector]: HTMLElement}} */
    header.elements = {};

    if (selectors)
      for (const [id, selector] of Object.entries(selectors))
        header.elements[id] = (selector && header.querySelector(selector)) || undefined;

    {
      /** @type {{[name:string]: HTMLElement}} */
      const {'rerender-button': renderButton, 'contrast-button': contrastButton} = header.elements;
      renderButton && (renderButton.onclick = rerender);
      if (contrastButton) {
        let timeout, resetting;
        contrastButton.onmousedown = () => {
          clearTimeout(timeout);
          timeout = setTimeout(() => {
            document.darkMode.toggle('auto');
            resetting = true;
            console.log('Reset dark mode!');
          }, 2000);
        };
        contrastButton.onmouseup = () => {
          timeout = clearTimeout(timeout);
          resetting === true ? (resetting = false) : document.darkMode.toggle();
        };
      }
    }

    {
      const {
        'repeats-span': repeatsSpan,
        'iterations-span': iterationsSpan,
        'source-span': sourceSpan,
        'mode-span': modeSpan,
        'variant-span': variantSpan,
      } = header.elements;
      sourceSpan && sourceSpan.style.setProperty('--symbol', `"${glyph(Hash.HASH)}"`);
      // modeSpan && modeSpan.style.setProperty('--symbol', `"${glyph(Hash.MODE)}"`);
      variantSpan && variantSpan.style.setProperty('--symbol', `"${glyph(Hash.VARIANT)}"`);
      repeatsSpan && repeatsSpan.style.setProperty('--symbol', `"${glyph(Hash.REPEATS)}"`);
      iterationsSpan && iterationsSpan.style.setProperty('--symbol', `"${glyph(Hash.ITERATIONS)}"`);
    }

    header.status = (name, value, title) => {
      header.status[name] === (header.status[name] = value);
      const element = header.elements[`${name}-span`];
      const text = `${value || ''}`;
      (title = `${title || ''}`.trim()) ? element.setAttribute('title', title) : element.removeAttribute('title');
      element ? (element.innerText = text) : text && flags.has('debug') && console.info('[%s] %o', name, value);
      document.documentElement.style.setProperty(`--${name}`, text);
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

    container.classList.add('fade');

    const rerender = () => {
      const {width, height} = content.getBoundingClientRect();
      const previousStyle = {};
      ({width: previousStyle.width, height: previousStyle.height} = content.style),
        ({width: content.style.width, height: content.style.height} = {
          width: width > 0 ? `${width}px` : '0',
          height: height > 0 ? `${height}px` : '0',
        });
      try {
        render();
      } finally {
        ({width: content.style.width, height: content.style.height} = previousStyle);
      }
    };

    const header = renderHeader({rerender});
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

    const content = document.createElement('div');
    content.className = 'markup-content markup-line-numbers';

    const slot = content.appendChild(document.createElement('div'));
    slot.className = 'markup-wrapper';

    Marker: {
      const lineMarker = Object.assign(document.createElement('span'), {className: 'marker', textContent: '\u034F'});
      const columnMarker = Object.assign(document.createElement('span'), {className: 'marker', textContent: '\u034F'});

      slot.addEventListener('click', event => {
        /** @type {PointerEvent & {target: HTMLSpanElement}} */
        // const {target} = event;
        // (({currentTarget, composedPath}) => console.log({target, currentTarget, composedPath}, event))(event);
        // console.log({target, currentTarget, composedPath}, event);

        // if (event.target.matches('.marker + .markup-line, .marker + .markup')) return;
        if (event.target.matches('.marker + .markup-line, :not(.markup)')) {
          columnMarker.remove();
          lineMarker.remove();
          slot.classList.remove('marked');
        } else {
          event.target.before(columnMarker);
          const line = event.target.closest('.markup-line');
          line && line.before(lineMarker);
          slot.classList.add('marked');
        }
      });
    }

    container.innerHTML = '';
    container.append(header, content);

    try {
      let sourceName = rewrite(specifier);
      await frame(header.status('source', sourceName, `${specifier}`), header.timing('source', true));
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
      header.status('source', sourceName, `${specifier}`);

      fragment = slot;

      const sourceID = `«${sourceName} [${sourceText.length}] ${sourceType}»`;

      const iterate = iterations => {
        // console.log(Array.from(markup.tokenize(sourceText, markupOptions, flags)));
        for (; iterations--; ) Array.from(markup.tokenize(sourceText, markupOptions, flags));
        // for (const t of markup.tokenize(sourceText, markupOptions, flags));
      };

      const repeat = async repeats => {
        const contents = [];
        for (; repeats--; contents.push(await renderMarkup(sourceText, markupOptions)));
        slot.innerText = '';
        slot.append(...contents);
      };

      const timed = async (marker, ...args) => {
        flags.has('debug')
          ? (console.time((marker = `${sourceID} - ${marker}`)), await time(...args), console.timeEnd(marker))
          : await time(...args);
      };

      render = async () => {
        await frame(content.classList.add('rendering'));
        await frame();

        header.stats({name: 'repeats', status: '', time: -1});
        header.stats({name: 'iterations', status: '', time: -1});

        if (iterations > 0) {
          await frame(header.stats({name: 'iterations', status: `${iterations}`, time: true}));
          await timeout(100);
          await timed(
            `${iterations} iterations`,
            'iterations',
            async ƒ => void (await iterate(iterations)),
            iterations,
          );
          await frame(header.status('iterations', `${iterations}`));
        }

        // TODO: Why this seems to make Firefox rerender faster?
        if (navigator.mozGetUserMedia) slot.innerText = '';

        if (repeats > 0) {
          // await timeDelay(100);
          await frame(header.stats({name: 'repeats', status: `${repeats}`, time: true}));
          content.classList.remove('rendering');
          await frame();
          await timed(`${repeats} repeats`, 'repeats', async ƒ => void (await repeat(repeats)), repeats);
          await frame(header.status('repeats', `${repeats}`));
        }

        return fragment;
      };

      await frame();
      await markup.warmup(sourceText, markupOptions, flags);
      await frame(
        header.status('variant', `${(markupOptions.variant > 1 && markupOptions.variant) || ''}`),
        header.status('mode', (markupOptions.mode && markupOptions.mode.syntax) || sourceType),
      );
      fragment = await render();

      return (returned = fragment);
    } finally {
      !returned && (container.innerText = 'Failed!');
    }
  };

  const Specifier = RegExp(
    /^(?:(examples)$|(scopes)(?:[:]|[/](?=[^/]|$)))?/.source
      .replace('(examples)', `(${Object.keys(examples).join('|')})`)
      .replace('(scopes)', `(${Object.keys(resolvers).join('|')})`),
  );

  const renderFromHash = (hash = location.hash || '#') => {
    let specifier, mode, example, scope, source, prefix, parsed;
    parsed = {specifier, mode} = Hash.parse(hash);

    (specifier &&
      (([prefix, example, scope] = Specifier.exec(parsed.specifier || '')),
      example
        ? (source = (example = examples[example]) && example.url) && (mode || ({mode = mode} = example))
        : scope in resolvers
        ? (source = resolvers[scope]((specifier = specifier.slice(prefix.length))))
        : (source = specifier))) ||
      ({sourceURL: source, sourceType: mode = mode} = options.defaults);

    ({
      iterations: options.iterations = options.defaults.iterations,
      repeats: options.repeats = options.defaults.repeats,
      variant: options.variant = options.defaults.variant,
    } = parsed).debugging
      ? flags.add('debug')
      : flags.delete('debug');

    renderFromURL(source, mode).catch(error =>
      console.warn('[renderFromHash]: %o\n\n%o', error, {parsed, source, mode, options}),
    );
  };

  window.addEventListener('hashchange', () => renderFromHash());

  const selectors = {
    ['source-span']: '#source',
    ['source-time']: '#source + time',
    ['mode-span']: '#mode',
    ['variant-span']: '#variant',
    ['repeats-span']: '#repeats',
    ['repeats-time']: '#repeats + time',
    ['iterations-span']: '#iterations',
    ['iterations-time']: '#iterations + time',
    ['rerender-button']: '#rerender[onclick]',
    ['contrast-button']: '#contrast[onclick]',
  };

  /** @typedef {keyof typeof selectors} selector */

  sourceHeaderTemplate && (sourceHeaderTemplate.selectors = selectors);

  requestAnimationFrame(() => renderFromHash());
};
