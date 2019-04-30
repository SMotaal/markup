{
  const defaults = {darkMode: true};
  const element = document.currentScript.parentElement;
  const prefersColorSchemeDark = matchMedia('(prefers-color-scheme: dark)');
  const prefersColorSchemeLight = matchMedia('(prefers-color-scheme: light)');
  ((prefersColorSchemeDark.matches && !element.classList.add('prefers-dark-mode')) ||
    localStorage.darkMode == 'true' ||
    (defaults.darkMode && localStorage.lightMode != 'true')) &&
    element.classList.add('dark-mode');
  prefersColorSchemeDark.addListener &&
    prefersColorSchemeDark.addListener(({matches = false}) => {
      !matches
        ? (element.classList.remove('prefers-dark-mode'),
          element.classList.contains('dark-mode') &&
            localStorage.darkMode != 'true' &&
            element.classList.remove('dark-mode'))
        : (element.classList.add('prefers-dark-mode'),
          !element.classList.contains('dark-mode') &&
            localStorage.lightMode != 'true' &&
            element.classList.add('dark-mode'));
    });
  element.hidden = false;
}
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
