// Single source for facts the site states about itself.
//
// Component counts and version strings used to be typed by hand in six places
// and disagreed with each other (28 / 27 / 56 / 57 for one number, against a
// package that exports 26). Everything here is derived from the catalog or a
// package manifest, so a claim can only be wrong if the code is.

import { COMPONENT_CATALOG, type CatalogComponent } from './componentCatalog';
import type { UiManifest } from './solaExport';

export const GITHUB_URL = 'https://github.com/Rbm3267/sola-air';
export const VSCODE_URL = 'https://marketplace.visualstudio.com/items?itemName=SolaAIR.sola-vscode';
export const OPEN_VSX_URL = 'https://open-vsx.org/extension/SolaAIR/sola-vscode';
export const GITHUB_REPO = 'Rbm3267/sola-air';

export interface ChangelogPackageEntry {
  pkg: string;
  items: string[];
}

export interface ChangelogSection {
  id: string;
  date: string;
  title: string;
  packages: ChangelogPackageEntry[];
}

/** Release history parsed at build time from the root CHANGELOG.md. */
export const CHANGELOG: readonly ChangelogSection[] = __SOLA_CHANGELOG__;

/** Versions injected at build time from the package manifests (see vite.config.ts). */
export const VERSIONS = {
  solaAir: __SOLA_VERSION__,
  core: __SOLA_CORE_VERSION__,
  compiler: __SOLA_COMPILER_VERSION__,
  ui: __SOLA_UI_VERSION__,
  /** The Chrome extension, read from its own manifest. */
  extension: __SOLA_EXTENSION_VERSION__
};

/** Components @sola-air-ui/ui really ships, read from its manifest at build time. */
export const PUBLISHED_PRIMITIVES: ReadonlySet<string> = new Set(__SOLA_UI_EXPORTS__);

/** Import path and declared props for each shipped component, for the code exporters. */
export const UI_MANIFEST: UiManifest = __SOLA_UI_MANIFEST__;

/**
 * True when a catalog entry is a primitive someone can install today, rather
 * than a preview built for this site. The catalog used to present both as the
 * same thing.
 */
export function isPublished(component: Pick<CatalogComponent, 'componentName'>): boolean {
  return PUBLISHED_PRIMITIVES.has(component.componentName);
}

/** Primitives installable from npm today. */
export const PUBLISHED_COUNT = PUBLISHED_PRIMITIVES.size;

/** Everything the catalog shows, published primitives and previews together. */
export const CATALOG_COUNT = COMPONENT_CATALOG.length;

/** Catalog entries that are previews, not yet part of the published package. */
export const PREVIEW_COUNT = COMPONENT_CATALOG.filter((c) => !isPublished(c)).length;

/** Distinct categories represented in the catalog. */
export const CATEGORY_COUNT = new Set(COMPONENT_CATALOG.map((c) => c.category)).size;

/**
 * Measured, reproducible facts only. Anything stated as a number on the site
 * should be traceable to something a reader could verify — the review pulled
 * "1,000Hz", "O(1) with zero GC" and "hardware-grade resistance" precisely
 * because nothing stood behind them.
 */
export const FACTS = {
  /**
   * Minified + gzipped size of the whole core runtime bundle, measured at build
   * time from the real bundle (scripts/core-size.mjs), so it cannot drift.
   */
  coreSizeKb: `${__SOLA_CORE_SIZE_KB__} kB gzipped`
};
