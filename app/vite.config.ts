import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import UnoCSS from 'unocss/vite';
import { readFileSync } from 'fs';
import path from 'path';
import solaPlugin from '../packages/vite-plugin-sola/src/index.js';
// Handed to the plugin explicitly rather than left to a bare-specifier lookup
// from Vite's config temp directory, which resolves differently depending on
// how the installer hoisted the workspace.
import { compile } from '../packages/compiler/src/index.js';
// The size the site states for the core runtime is measured from the real bundle.
import { measureCore } from '../scripts/core-size.mjs';

// Every version shown anywhere on the site comes from a package manifest, so
// the site cannot advertise a version that was never released.
function manifestVersion(pkgDir: string) {
	return JSON.parse(
		readFileSync(path.resolve(__dirname, `../packages/${pkgDir}/package.json`), 'utf-8')
	).version as string;
}

// The Chrome extension versions independently of the packages, so read it from
// the manifest that actually ships rather than restating it in the page.
const extensionVersion = JSON.parse(
	readFileSync(path.resolve(__dirname, '../packages/sola-extension/manifest.json'), 'utf-8')
).version as string;

const solaVersion = manifestVersion('sola-air');
const coreVersion = manifestVersion('core');
const compilerVersion = manifestVersion('compiler');
const uiVersion = manifestVersion('ui');
const coreSizeKb = measureCore().gzipKb;

// The names @sola-air-ui/ui actually exports, read from its entry point. The
// site uses this to tell a published primitive apart from a preview built only
// for this site, instead of asserting a component count by hand.
const uiExports = [
	...readFileSync(path.resolve(__dirname, '../packages/ui/src/index.js'), 'utf-8')
		.matchAll(/export\s*\{\s*default as (\w+)/g)
].map((m) => m[1]);

// Banner only — compilation itself is the published plugin, so the site and a
// scaffolded project run the same code path.
function solaBanner() {
	return {
		name: 'sola-dev-banner',
		configureServer() {
			const c1 = '\x1b[38;2;56;189;248m'; // sky-400
			const c2 = '\x1b[38;2;59;130;246m'; // blue-500
			const c3 = '\x1b[38;2;139;92;246m'; // violet-500
			const b = '\x1b[1m';
			const d = '\x1b[2m';
			const r = '\x1b[0m';

			setTimeout(() => {
				console.log('');
				console.log(`   ${c1} ✧ ${r}`);
				console.log(`  ${c1}✧${r} ${c2}◯${r} ${c3}✧${r}    ${b}Sola${r} ${d}v${solaVersion}${r}`);
				console.log(`   ${c3} ✧ ${r}      ${c2}Ambient Zero-VDOM Intent Runtime${r}`);
				console.log(`            ${d}Compiler ready in ${Math.round(performance.now())}ms${r}`);
				console.log('');
			}, 100);
		}
	};
}

export default defineConfig({
	define: {
		__SOLA_VERSION__: JSON.stringify(solaVersion),
		__SOLA_CORE_VERSION__: JSON.stringify(coreVersion),
		__SOLA_COMPILER_VERSION__: JSON.stringify(compilerVersion),
		__SOLA_UI_VERSION__: JSON.stringify(uiVersion),
		__SOLA_CORE_SIZE_KB__: JSON.stringify(coreSizeKb),
		__SOLA_UI_EXPORTS__: JSON.stringify(uiExports),
		__SOLA_EXTENSION_VERSION__: JSON.stringify(extensionVersion)
	},
	resolve: {
		alias: {
			'@sola/core': path.resolve(__dirname, '../packages/core/src/index.js'),
			'@sola/compiler': path.resolve(__dirname, '../packages/compiler/src/index.js'),
			'@sola/ui': path.resolve(__dirname, '../packages/ui/src'),
			'@sola-air-ui/core': path.resolve(__dirname, '../packages/core/src/index.js'),
			'@sola-air-ui/compiler': path.resolve(__dirname, '../packages/compiler/src/index.js'),
			'@sola-air-ui/ui': path.resolve(__dirname, '../packages/ui/src'),
			'@sola-air-ui/sentinel': path.resolve(__dirname, '../packages/sentinel/src/index.js'),
			// tokens was missing here, so its bare specifier fell through to node
			// resolution and broke the production build.
			'@sola-air-ui/tokens': path.resolve(__dirname, '../packages/tokens/src')
		}
	},
	plugins: [
		solaPlugin({ compile }),
		solaBanner(),
		UnoCSS(),
		sveltekit()
	]
});
