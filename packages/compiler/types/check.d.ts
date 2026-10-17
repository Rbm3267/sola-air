// Type declarations for @sola-air-ui/compiler/check.

export interface Diagnostic {
  file: string;
  /** 1-based. */
  line: number;
  /** 1-based. */
  column: number;
  severity: 'error' | 'warning';
  /** SOLA000 compile error, SOLA001 unbalanced block. */
  code: 'SOLA000' | 'SOLA001';
  message: string;
}

export const RULES: Record<Diagnostic['code'], string>;

/** Check one component's source text. */
export function checkSource(source: string, filename?: string): Diagnostic[];

/** Every .sola file under the given files or directories, skipping node_modules, dist and .git. */
export function findSolaFiles(targets: string[]): string[];

/** Check .sola files on disk. */
export function checkFiles(targets: string[]): { files: string[]; diagnostics: Diagnostic[] };
