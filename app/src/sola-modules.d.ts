// A compiled .sola file's default export is its mount function.
//
// This lives in its own file, with no import or export, so TypeScript reads it
// as a global declaration. Inside app.d.ts (which ends with `export {}`) it was
// only an augmentation and never matched, so every .sola import was an error.
declare module '*.sola' {
	const mount: (target: HTMLElement, props?: Record<string, any>) => (() => void) | void;
	export default mount;
}
