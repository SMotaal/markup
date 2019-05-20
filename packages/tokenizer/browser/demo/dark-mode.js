/** @type {{enable(): void; disable(): void; toggle(state?: boolean | 'auto'): void;}} */
export const darkMode = (document => {
	if (!document) return;
	if (document.darkMode) return document.darkMode;

	const {assign, create, freeze, getOwnPropertyDescriptors} = Object;
	const classList = document.documentElement.classList;

	// const autoOnly = /#auto-only\b/.test(import.meta.url);

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

		state
			? (classList.add('dark-mode'), classList.remove('light-mode'))
			: (classList.add('light-mode'), classList.remove('dark-mode'));
	};

	const enable = auto => toggle(true, auto);

	const disable = auto => toggle(false, auto);

	const darkMode = create(null, {
		state: {writable: true},
		prefers: {writable: true},
		...getOwnPropertyDescriptors(freeze({enable, disable, toggle})),
	});

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
	})(matchMedia('(prefers-color-scheme: dark)'), matchMedia('(prefers-color-scheme: light)'));

	return (document.darkMode = darkMode);
})(globalThis.document);
