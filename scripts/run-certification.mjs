import fs from "node:fs";
import path from "node:path";
import { checkSource } from "../packages/compiler/src/check.js";
import { createMounter } from "./mount-check.mjs";

let OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
if (!OLLAMA_HOST.startsWith("http://") && !OLLAMA_HOST.startsWith("https://")) {
  OLLAMA_HOST = `http://${OLLAMA_HOST}`;
}
OLLAMA_HOST = OLLAMA_HOST.replace("0.0.0.0", "127.0.0.1");

// Usage: node scripts/run-certification.mjs --model sola-air-1.5b [--out results.json]
//        node scripts/run-certification.mjs --rescore results.json [--out rescored.json]
// The first form needs a local Ollama with the model pulled (OLLAMA_HOST overrides the
// address). --rescore skips the model and scores the responses saved in a results file
// again, so anyone can check published numbers. Each component is also mounted in
// headless Chromium (needs `npx playwright install chromium`); --no-mount skips that.
// --retry [n] asks again, up to n more times (default 2), for a component that fails
// sola-check or doesn't mount: the same prompt at temperature 0.7 with a new seed.
// That beat sending the errors back for a fix (17 of 27 tries passed vs 6 of 27).
// The summary shows first-try numbers next to the final ones.
// Exits 1 when the ship gate fails.
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const MODEL = arg("--model") || process.env.MODEL || "sola-air-1.5b";
const RESCORE = arg("--rescore");
const OUT_ARG = arg("--out");
const OUT = OUT_ARG
  ? path.resolve(OUT_ARG)
  : RESCORE
    ? null
    : path.resolve("certification-results.json");
const MOUNT = !process.argv.includes("--no-mount");
const RETRIES = process.argv.includes("--retry")
  ? Number(/^\d+$/.test(arg("--retry") || "") ? arg("--retry") : 2)
  : 0;
// A cap on answer length, as in the playground, so a run that never stops
// doesn't hang the benchmark.
const MAX_TOKENS = 1200;

// One place for the gates, so the summary prints what is actually checked.
// mountRate: passing sola-check is not enough, since an undeclared variable compiles
// and only throws when the component mounts.
const GATES = {
  compileRate: 90,
  mountRate: 80,
  htmlFenceRate: 5,
  residueRate: 5,
  fwRate: 0,
  tokPerSec: 25,
};

// React and Vue syntax that has no place in a .sola file. Each pattern is
// separate because a trailing \b after `=` or `:` never matches.
const FRAMEWORK_PATTERNS = [
  /\bimport\s+React\b/,
  /\bfrom\s+['"](react|vue)['"]/,
  /\bclassName\s*=/,
  /\buse(State|Effect|Memo|Ref|Callback)\s*\(/,
  /\bVue\.createApp\b/,
  /\sv-(on|bind|model|if|for)[:=\s]/,
  /\s@(click|input|change|submit)\s*=/,
  /\s:(class|style|key)\s*=/,
];

const PROMPTS = [
  {
    id: 1,
    name: "StatCard",
    prompt:
      "Write a Sola component named StatCard that takes label, value, and change props, and displays a trend indicator.",
  },
  {
    id: 2,
    name: "AlertBanner",
    prompt:
      "Create a Sola alert component with type (info, success, warning, error), a message prop, and a close button that emits a dismiss event.",
  },
  {
    id: 3,
    name: "Counter",
    prompt:
      "Build a Sola component that has an increment button, a decrement button, and a count display bound to reactive state.",
  },
  {
    id: 4,
    name: "ToggleButton",
    prompt:
      "Create a Sola toggle switch component with an active boolean state and an onclick handler that toggles it.",
  },
  {
    id: 5,
    name: "ProgressBar",
    prompt:
      "Write a Sola component for a progress bar that takes a percent prop (0-100) and updates the inner fill width.",
  },
  {
    id: 6,
    name: "Badge",
    prompt:
      "Build a Sola badge component that accepts text and variant props, with scoped styles for primary, secondary, and success colors.",
  },
  {
    id: 7,
    name: "SearchInput",
    prompt:
      "Create a Sola component with an input field bound to search query state and a clear button that resets the query.",
  },
  {
    id: 8,
    name: "AccordionItem",
    prompt:
      "Write a Sola accordion item component with title prop, collapsible content, and an isOpen state toggled on click.",
  },
  {
    id: 9,
    name: "Tabs",
    prompt:
      "Create a Sola tabs component that takes an array of tab names and switches the active tab on click.",
  },
  {
    id: 10,
    name: "Avatar",
    prompt:
      "Write a Sola avatar component that displays an image if src is given, otherwise displays user initials.",
  },
  {
    id: 11,
    name: "RatingStars",
    prompt:
      "Build a Sola 5-star rating component that highlights stars on hover and sets rating state on click.",
  },
  {
    id: 12,
    name: "NotificationBell",
    prompt:
      "Create a Sola notification bell icon component with a reactive unread count badge.",
  },
  {
    id: 13,
    name: "Modal",
    prompt:
      "Write a Sola modal dialog component with an isOpen prop, a title, body content, and a close button.",
  },
  {
    id: 14,
    name: "KpiGauge",
    prompt:
      "Build a Sola KPI circular gauge component showing progress toward a numeric target.",
  },
  {
    id: 15,
    name: "TagList",
    prompt:
      "Create a Sola component that displays an array of tag strings with remove buttons for each tag.",
  },
  {
    id: 16,
    name: "PriceCard",
    prompt:
      "Write a Sola pricing tier card component with tier name, monthly price, feature list, and a signup button.",
  },
  {
    id: 17,
    name: "Timer",
    prompt:
      "Build a Sola stopwatch component with start, pause, and reset buttons that updates elapsed seconds.",
  },
  {
    id: 18,
    name: "UserStatus",
    prompt:
      "Create a Sola user status pill component that displays a status dot (online/offline/busy) and status text.",
  },
  {
    id: 19,
    name: "Breadcrumb",
    prompt:
      "Write a Sola breadcrumb navigation component that renders a list of path items with separators.",
  },
  {
    id: 20,
    name: "Checkbox",
    prompt:
      "Create a Sola checkbox component with label text and two-way binding to checked state.",
  },
];

const BANNED_PATTERNS = [
  /\bcertainly\b/i,
  /\bsure[,!.]/i,
  /\bhere is\b/i,
  /\bhere's\b/i,
  /\bi hope this helps\b/i,
  /\blet me know\b/i,
  /\bas an ai\b/i,
  /\bapolog(y|ies|ize)\b/i,
  /\bsorry\b/i,
  /\bgreat question\b/i,
  /\blet's dive in\b/i,
];

function extractCode(text) {
  const match =
    /```(?:sola|html|vue|svelte|xml|jsx|tsx|js)?\s*([\s\S]*?)```/i.exec(text);
  if (match) return match[1].trim();
  if (
    text.includes("<script") ||
    text.includes("<style") ||
    text.includes("{#if") ||
    text.includes("$state")
  ) {
    return text.trim();
  }
  return "";
}

async function queryOllama(prompt, { temperature = 0.1, seed } = {}) {
  const start = Date.now();
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      options: {
        temperature,
        top_p: 0.9,
        num_predict: MAX_TOKENS,
        ...(seed !== undefined ? { seed } : {}),
      },
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const elapsed = (Date.now() - start) / 1000;
  const content = json.message?.content || "";
  const evalCount = json.eval_count || 0;
  const evalDuration = (json.eval_duration || 1) / 1e9;
  const tokPerSec = evalCount > 0 ? evalCount / evalDuration : 0;

  return { content, elapsed, evalCount, tokPerSec };
}

// Everything judged from the response text alone.
function analyze(content, name) {
  const code = extractCode(content);
  const diagnostics = code
    ? checkSource(code, `${name}.sola`)
    : [
        {
          severity: "error",
          message: "No code block extracted from model response",
        },
      ];
  return {
    extractedCode: code,
    compiles: Boolean(code) && diagnostics.every((d) => d.severity !== "error"),
    diagnostics,
    hasRawHtmlFence: /```html\b/i.test(content),
    hasResidue: BANNED_PATTERNS.some((pat) => pat.test(content)),
    hasFrameworkHallucination: FRAMEWORK_PATTERNS.some((pat) =>
      pat.test(content),
    ),
  };
}

async function generate() {
  console.log(
    `Running the certification benchmark on ${MODEL} (${PROMPTS.length} prompts)...`,
  );
  const results = [];
  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    process.stdout.write(`[${i + 1}/${PROMPTS.length}] ${p.name}... `);
    try {
      const resp = await queryOllama(p.prompt);
      const a = analyze(resp.content, p.name);
      console.log(
        `${a.compiles ? "PASS" : "FAIL"} (${resp.tokPerSec.toFixed(1)} tok/s)`,
      );
      results.push({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        response: resp.content,
        ...a,
        tokPerSec: resp.tokPerSec,
        elapsed: resp.elapsed,
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        error: err.message,
        compiles: false,
      });
    }
  }
  return { model: MODEL, results };
}

function rescore(file) {
  const saved = JSON.parse(fs.readFileSync(file, "utf-8"));
  console.log(
    `Scoring ${saved.results.length} saved responses from ${file} (${saved.model}) again...`,
  );
  const results = saved.results.map((r) =>
    r.response === undefined
      ? { ...r, compiles: false }
      : {
          ...r,
          ...analyze(r.response, r.name),
          ...(r.firstTry?.response !== undefined
            ? {
                firstTry: {
                  ...r.firstTry,
                  compiles: analyze(r.firstTry.response, r.name).compiles,
                },
              }
            : {}),
        },
  );
  return { model: saved.model, date: saved.date, results };
}

async function mountAll(results) {
  let mounter;
  try {
    mounter = await createMounter();
  } catch (err) {
    console.log(`Mount test skipped: ${err.message.split("\n")[0]}`);
    console.log(
      "Install the browser with `npx playwright install chromium`, or pass --no-mount.",
    );
    return false;
  }
  try {
    for (const r of results) {
      r.mount = r.compiles
        ? await mounter.mount(r.extractedCode, `${r.name}.sola`)
        : { status: "check-failed", detail: "" };
      const detail = r.mount.detail ? `: ${r.mount.detail.slice(0, 80)}` : "";
      console.log(`  ${r.name}: ${r.mount.status}${detail}`);
    }
  } finally {
    await mounter.close();
  }
  return true;
}

// --retry: ask again for each component that failed (check, mount, or the request).
// The first answer is kept in r.firstTry; r.attempts counts every answer.
async function retryFailures(results, mounted) {
  const passed = (r) =>
    mounted ? r.mount?.status === "mounted" : r.compiles;
  const failed = results.filter((r) => !passed(r));
  if (!failed.length) return;
  console.log(`
Retrying ${failed.length} (up to ${RETRIES} more each)...`);
  for (const r of failed) {
    r.firstTry = {
      response: r.response,
      error: r.error,
      compiles: r.compiles,
      diagnostics: r.diagnostics,
      mount: r.mount,
    };
    r.attempts = 1;
    for (let seed = 1; seed <= RETRIES && !passed(r); seed++) {
      process.stdout.write(`  ${r.name}, try ${seed + 1}... `);
      try {
        const resp = await queryOllama(r.prompt, { temperature: 0.7, seed });
        Object.assign(r, { response: resp.content, ...analyze(resp.content, r.name) });
        delete r.error;
        r.elapsed = (r.elapsed || 0) + resp.elapsed;
      } catch (err) {
        r.error = err.message;
        r.compiles = false;
      }
      r.attempts++;
      console.log(r.compiles ? "passes sola-check" : "fails sola-check");
      if (mounted) await mountAll([r]);
    }
  }
}

async function run() {
  const { model, date, results } = RESCORE
    ? rescore(RESCORE)
    : await generate();
  const total = results.length;
  const count = (fn) => results.filter(fn).length;

  const mounted = MOUNT ? await mountAll(results) : false;
  if (RETRIES && !RESCORE) await retryFailures(results, mounted);

  const compiledCount = count((r) => r.compiles);
  const retriedCount = count((r) => r.firstTry);
  const firstTryCompiledCount = count((r) =>
    r.firstTry ? r.firstTry.compiles : r.compiles,
  );
  const firstTryMountedCount = mounted
    ? count((r) => !r.firstTry && r.mount?.status === "mounted")
    : null;
  const mountedCount = mounted
    ? count((r) => r.mount?.status === "mounted")
    : null;
  const rawHtmlFenceCount = count((r) => r.hasRawHtmlFence);
  const residueCount = count((r) => r.hasResidue);
  const frameworkHallucinationCount = count((r) => r.hasFrameworkHallucination);
  const avgTokPerSec =
    results.reduce((n, r) => n + (r.tokPerSec || 0), 0) / total;

  const pct = (n) => (n / total) * 100;
  const compileRate = pct(compiledCount);
  const mountRate = mounted ? pct(mountedCount) : null;
  const htmlFenceRate = pct(rawHtmlFenceCount);
  const residueRate = pct(residueCount);
  const fwRate = pct(frameworkHallucinationCount);

  const ok = {
    compile: compileRate >= GATES.compileRate,
    mount: mounted ? mountRate >= GATES.mountRate : null,
    fence: htmlFenceRate <= GATES.htmlFenceRate,
    residue: residueRate <= GATES.residueRate,
    fw: fwRate <= GATES.fwRate,
    speed: avgTokPerSec >= GATES.tokPerSec,
  };
  const mark = (pass) => (pass === null ? "NOT RUN" : pass ? "PASS" : "FAIL");
  const row = (label, n, rate, gate, pass) =>
    console.log(
      `${label.padEnd(24)}${n}/${total} (${rate.toFixed(1)}%)  [Gate: ${gate}]  --> ${mark(pass)}`,
    );

  console.log("\n=== CERTIFICATION SUMMARY ===");
  console.log(`Model:                  ${model}`);
  console.log(`Prompts:                ${total}`);
  if (retriedCount) {
    console.log(
      `Retried:                ${retriedCount}/${total}. First try: ${firstTryCompiledCount}/${total} sola-check` +
        (mounted ? `, ${firstTryMountedCount}/${total} mounted` : "") +
        ". The rows below are after the retries.",
    );
  }
  row(
    "sola-check pass:",
    compiledCount,
    compileRate,
    `>= ${GATES.compileRate}%`,
    ok.compile,
  );
  if (mounted)
    row(
      "Mounts and renders:",
      mountedCount,
      mountRate,
      `>= ${GATES.mountRate}%`,
      ok.mount,
    );
  else console.log("Mounts and renders:     not run  --> NOT RUN");
  row(
    "Raw HTML fence:",
    rawHtmlFenceCount,
    htmlFenceRate,
    `<= ${GATES.htmlFenceRate}%`,
    ok.fence,
  );
  row(
    "Chatbot residue:",
    residueCount,
    residueRate,
    `<= ${GATES.residueRate}%`,
    ok.residue,
  );
  row(
    "React/Vue syntax:",
    frameworkHallucinationCount,
    fwRate,
    `<= ${GATES.fwRate}%`,
    ok.fw,
  );
  const speedNote = RESCORE ? " (from the saved run)" : "";
  console.log(
    `Average speed:          ${avgTokPerSec.toFixed(1)} tok/s  [Gate: >= ${GATES.tokPerSec} tok/s]  --> ${mark(ok.speed)}${speedNote}`,
  );

  // A skipped mount test can't pass the gate.
  const gatePassed = Object.values(ok).every((v) => v === true);
  console.log(`Gate: ${gatePassed ? "PASSED" : "FAILED"}`);

  if (OUT) {
    const today = new Date().toISOString().split("T")[0];
    const summary = {
      date: RESCORE ? date : today,
      ...(RESCORE
        ? { rescoredOn: today, rescoredFrom: path.basename(RESCORE) }
        : {}),
      model,
      totalPrompts: total,
      compiledCount,
      compileRate,
      mountedCount,
      mountRate,
      ...(retriedCount
        ? { retries: RETRIES, retriedCount, firstTryCompiledCount, firstTryMountedCount }
        : {}),
      rawHtmlFenceCount,
      htmlFenceRate,
      residueCount,
      residueRate,
      frameworkHallucinationCount,
      fwRate,
      avgTokPerSec,
      gatePassed,
      results,
    };
    fs.writeFileSync(OUT, JSON.stringify(summary, null, 2), "utf-8");
    console.log(`Saved results to ${OUT}`);
  }
  if (!gatePassed) process.exitCode = 1;
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
