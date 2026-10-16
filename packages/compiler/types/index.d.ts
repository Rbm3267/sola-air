// Type declarations for @sola-air-ui/compiler.

export interface CompileOptions {
  /**
   * 'esm' (default) emits a module importing from @sola-air-ui/core.
   * 'iife' emits a self-contained bundle reading from window.SolaCore, for
   * enterprise portals and other no-bundler hosts.
   */
  target?: 'esm' | 'iife';
  /** Global name the IIFE build registers itself under. Default 'SolaComponent'. */
  exportName?: string;
  /** Source path, used in error messages and the source map. */
  filename?: string;
  /** Emit a source map mapping generated JS back to the .sola file. Default true. */
  sourcemap?: boolean;
}

export interface CompileResult {
  /** Generated JavaScript. */
  code: string;
  /** Class name scoping this component's styles. */
  scopeHash: string;
  /** Scoped CSS, empty when the component has no <style> block. */
  css: string;
  /** Source map for `code`, or null when `sourcemap` is false. */
  map: SourceMap | null;
}

export interface SourceMap {
  version: 3;
  file?: string;
  sources: string[];
  sourcesContent: (string | null)[];
  names: string[];
  mappings: string;
}

/** Compiles a .sola single-file component to JavaScript. */
export function compile(source: string, options?: CompileOptions): CompileResult;

/** Mount function produced by compiling a .sola component. */
export type SolaComponent<P = Record<string, unknown>> = (
  target: HTMLElement,
  props?: P
) => () => void;
