{
  const defaults = { darkMode: true };
  const element = document.currentScript.parentElement;
  const prefersColorSchemeDark = matchMedia('(prefers-color-scheme: dark)');
  const prefersColorSchemeLight = matchMedia('(prefers-color-scheme: light)');
  (
    prefersColorSchemeDark.matches &&
    !element.classList.add('prefers-dark-mode') ||
    localStorage.darkMode == "true" ||
    (defaults.darkMode && localStorage.lightMode != "true")
  ) && element.classList.add('dark-mode');
  prefersColorSchemeDark.addListener && prefersColorSchemeDark.addListener(({ matches = false }) => {
    !matches ? (
      element.classList.remove('prefers-dark-mode'),
      element.classList.contains('dark-mode') && localStorage.darkMode != "true" && element.classList.remove('dark-mode')
    ) : (
        element.classList.add('prefers-dark-mode'),
        !element.classList.contains('dark-mode') &&
        localStorage.lightMode != "true" && element.classList.add('dark-mode')
      )
  });
  element.hidden = false;
}
