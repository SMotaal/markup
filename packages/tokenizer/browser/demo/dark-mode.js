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

	const timeout = Symbol('toggler.timeout');
	const resetting = Symbol('toggler.resetting');

	const toggler = Object.assign(document.createElement('a'), {
		id: 'dark-mode-toggler',
		innerHTML: `<i icon>&#x${'☽'.codePointAt(0).toString(16)}</i>`,
		title: 'Toggle Dark/Light Mode\n\nNote: Hold for 2 seconds to switch to auto where supported.',
		onmousedown() {
			clearTimeout(this[timeout]);
			this[timeout] = setTimeout(() => {
				toggle('auto');
				this[resetting] = true;
				console.log('Reset dark mode!');
			}, 2000);
		},
		onmouseup() {
			this[timeout] = clearTimeout(this[timeout]);
			this[resetting] === true ? (this[resetting] = false) : toggle();
		},
		style: `
			border: 1px solid #999;
			background-color: #999;
			color: #000;
			mix-blend-mode: exclusion;
			font-family: system-ui;
			border-radius: 1em;
		`,
	});

	const togglerSpan = Object.assign(document.createElement('div'), {
		style: `
      all: initial;
			display: grid;
			position: fixed;
			left: 0px;
			top: 0px;
			z-index: 100;
			opacity: 0.25;
		`,
	});

	toggler.hide = () => {
		toggler.remove(), togglerSpan.remove();
	};
	toggler.show = () => {
		document.body.appendChild(togglerSpan).appendChild(toggler);
	};

	// toggler.show();

	const darkMode = create(null, {
		state: {writable: true},
		prefers: {writable: true},
		...getOwnPropertyDescriptors(freeze({enable, disable, toggle, toggler})),
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
