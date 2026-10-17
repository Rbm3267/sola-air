import { readFileSync } from 'fs';

/**
 * Vite plugin for .sola single-file components.
 *
 * @param {object}   [options]
 * @param {boolean}  [options.sourcemap=true] Emit a source map so runtime errors
 *   and breakpoints land in the .sola file rather than in generated output.
 * @param {Function} [options.compile] Compiler to use. Defaults to
 *   @sola-air-ui/compiler, loaded on first use. This repo's own site passes its
 *   workspace copy directly: Vite bundles a config file into
 *   `<root>/node_modules/.vite-temp/`, and a bare specifier resolved from there
 *   depends on how the installer happened to hoist things — which differs
 *   between a local install and a clean CI one, and broke the deploy.
 */
export default function solaPlugin(options = {}) {
  const { sourcemap = true, compile: injectedCompile } = options;

  let compileFn = injectedCompile ?? null;
  async function getCompile() {
    compileFn ??= (await import('@sola-air-ui/compiler')).compile;
    return compileFn;
  }

  const ASSET_QUERIES = ['raw', 'url', 'inline', 'worker', 'sharedworker'];

  return {
    name: 'vite-plugin-sola',
    enforce: 'pre',

    async load(id) {
      const [cleanId, query = ''] = id.split('?', 2);
      if (!cleanId.endsWith('.sola')) return null;
      // ?raw, ?url, ?inline and ?worker ask Vite for the file itself, not a
      // component; leave those to Vite. (?import, ?v=, ?t= are still compiled.)
      const params = new URLSearchParams(query);
      if (ASSET_QUERIES.some((q) => params.has(q))) return null;
      try {
        const compile = await getCompile();
        const source = readFileSync(cleanId, 'utf-8');
        const compiled = compile(source, { filename: cleanId, sourcemap });
        return { code: compiled.code, map: compiled.map ?? null };
      } catch (err) {
        this.error(err.message);
      }
    },

    handleHotUpdate({ file, modules }) {
      if (!file.endsWith('.sola')) return;

      // Hand the changed modules back so Vite propagates the update through the
      // import graph as it would for any other module. It reloads the page only
      // when no importer accepts the update — which is a far better default than
      // unconditionally forcing a full reload on every keystroke and discarding
      // state an upstream boundary could have kept.
      return modules;
    }
  };
}
