// Mount generated .sola components in headless Chromium and report whether each one runs.
// A component counts as mounted only if it compiles, mounts without throwing (no page
// errors either), and puts at least one element into its target.
//
// Used by run-certification.mjs. Needs Playwright's Chromium (`npx playwright install chromium`).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compile } from "../packages/compiler/src/index.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE_IIFE = path.join(root, "packages/core/dist/sola-core.iife.js");

function coreRuntime() {
  if (!fs.existsSync(CORE_IIFE)) {
    execFileSync(process.execPath, ["build.js"], {
      cwd: path.join(root, "packages/core"),
      stdio: "inherit",
    });
  }
  return fs.readFileSync(CORE_IIFE, "utf8");
}

// Keep a "</script" inside inlined code from ending the tag early.
const inline = (s) => s.replace(/<\/script/gi, "<\/script");

// Returns { status, detail } where status is 'mounted', 'empty', 'runtime-error' or 'compile-error'.
export async function createMounter() {
  const { chromium } = await import("@playwright/test");
  const core = coreRuntime();
  const browser = await chromium.launch();

  async function mount(code, filename = "Generated.sola") {
    let js;
    try {
      js = compile(code, {
        target: "iife",
        exportName: "GeneratedComponent",
        sourcemap: false,
        filename,
      }).code;
    } catch (err) {
      return { status: "compile-error", detail: err.message };
    }
    const page = await browser.newPage();
    const pageErrors = [];
    page.on("pageerror", (err) => pageErrors.push(err.message));
    // Generated code gets no network.
    await page.route("**/*", (route) => route.abort());
    try {
      await page.setContent(`<!doctype html><html><body><div id="root"></div>
<script>${inline(core)}<\/script>
<script>${inline(js)}<\/script>
<script>try { window.GeneratedComponent(document.getElementById('root'), {}); window.__mount = 'ok'; }
catch (e) { window.__mount = String(e && e.message || e); }<\/script></body></html>`);
      await page.waitForTimeout(300);
      const [result, children] = await page.evaluate(() => [
        window.__mount,
        document.getElementById("root").childElementCount,
      ]);
      if (result !== "ok") return { status: "runtime-error", detail: result };
      if (pageErrors.length)
        return { status: "runtime-error", detail: pageErrors[0] };
      if (!children)
        return { status: "empty", detail: "mounted but rendered nothing" };
      return { status: "mounted", detail: "" };
    } finally {
      await page.close();
    }
  }

  return { mount, close: () => browser.close() };
}
