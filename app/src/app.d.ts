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

declare const __SOLA_VERSION__: string;
declare const __SOLA_CORE_VERSION__: string;
declare const __SOLA_COMPILER_VERSION__: string;
declare const __SOLA_UI_VERSION__: string;
declare const __SOLA_CORE_SIZE_KB__: string;
declare const __SOLA_UI_EXPORTS__: string[];
declare const __SOLA_EXTENSION_VERSION__: string;

declare module '*.sola' {
	const mount: (target: HTMLElement, props?: Record<string, any>) => (() => void) | void;
	export default mount;
}

export {};
