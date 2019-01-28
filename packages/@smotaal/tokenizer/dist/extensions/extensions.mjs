import './helpers.mjs';
import { css } from './css-mode.mjs';
import { html } from './html-mode.mjs';
import { markdown } from './markdown-mode.mjs';
import { javascript } from './javascript-mode.mjs';
import { mjs, cjs, esx } from './javascript-extensions.mjs';



var modes = /*#__PURE__*/Object.freeze({
	css: css,
	html: html,
	markdown: markdown,
	javascript: javascript,
	mjs: mjs,
	cjs: cjs,
	esx: esx
});



var extensions = /*#__PURE__*/Object.freeze({
	modes: modes
});

export { modes };
//# sourceMappingURL=extensions.mjs.map
