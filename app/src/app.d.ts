// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

// Build-time constants from vite.config.ts `define`. Inside `declare global`:
// this file is a module (it exports), so a top-level `declare const` here would
// be local to it and invisible to the pages that read these.
declare global {
	const __SOLA_VERSION__: string;
	const __SOLA_CORE_VERSION__: string;
	const __SOLA_COMPILER_VERSION__: string;
	const __SOLA_UI_VERSION__: string;
	const __SOLA_CORE_SIZE_KB__: string;
	const __SOLA_UI_EXPORTS__: string[];
	const __SOLA_UI_MANIFEST__: {
		subpaths: Record<string, string>;
		props: Record<string, string[]>;
	};
	const __SOLA_EXTENSION_VERSION__: string;
	/** ClusterCardDemo.sola and the compiler's output for it, captured at build time. */
	const __SOLA_XRAY__: { source: string; compiled: string };
	const __SOLA_TOUR__: { name: string; source: string; compiled: string }[];
	const __SOLA_CHANGELOG__: Array<{
		id: string;
		date: string;
		title: string;
		packages: Array<{ pkg: string; items: string[] }>;
	}>;
}

export {};
