import fs from 'node:fs';
import path from 'node:path';
import { checkSource } from '../packages/compiler/src/check.js';

let OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
if (!OLLAMA_HOST.startsWith('http://') && !OLLAMA_HOST.startsWith('https://')) {
  OLLAMA_HOST = `http://${OLLAMA_HOST}`;
}
OLLAMA_HOST = OLLAMA_HOST.replace('0.0.0.0', '127.0.0.1');

const modelArgIdx = process.argv.indexOf('--model');
const MODEL = modelArgIdx !== -1 && process.argv[modelArgIdx + 1] 
  ? process.argv[modelArgIdx + 1] 
  : (process.env.MODEL || 'xdlabs:sola');

const PROMPTS = [
  { id: 1, name: 'StatCard', prompt: 'Write a Sola component named StatCard that takes label, value, and change props, and displays a trend indicator.' },
  { id: 2, name: 'AlertBanner', prompt: 'Create a Sola alert component with type (info, success, warning, error), a message prop, and a close button that emits a dismiss event.' },
  { id: 3, name: 'Counter', prompt: 'Build a Sola component that has an increment button, a decrement button, and a count display bound to reactive state.' },
  { id: 4, name: 'ToggleButton', prompt: 'Create a Sola toggle switch component with an active boolean state and an onclick handler that toggles it.' },
  { id: 5, name: 'ProgressBar', prompt: 'Write a Sola component for a progress bar that takes a percent prop (0-100) and updates the inner fill width.' },
  { id: 6, name: 'Badge', prompt: 'Build a Sola badge component that accepts text and variant props, with scoped styles for primary, secondary, and success colors.' },
  { id: 7, name: 'SearchInput', prompt: 'Create a Sola component with an input field bound to search query state and a clear button that resets the query.' },
  { id: 8, name: 'AccordionItem', prompt: 'Write a Sola accordion item component with title prop, collapsible content, and an isOpen state toggled on click.' },
  { id: 9, name: 'Tabs', prompt: 'Create a Sola tabs component that takes an array of tab names and switches the active tab on click.' },
  { id: 10, name: 'Avatar', prompt: 'Write a Sola avatar component that displays an image if src is given, otherwise displays user initials.' },
  { id: 11, name: 'RatingStars', prompt: 'Build a Sola 5-star rating component that highlights stars on hover and sets rating state on click.' },
  { id: 12, name: 'NotificationBell', prompt: 'Create a Sola notification bell icon component with a reactive unread count badge.' },
  { id: 13, name: 'Modal', prompt: 'Write a Sola modal dialog component with an isOpen prop, a title, body content, and a close button.' },
  { id: 14, name: 'KpiGauge', prompt: 'Build a Sola KPI circular gauge component showing progress toward a numeric target.' },
  { id: 15, name: 'TagList', prompt: 'Create a Sola component that displays an array of tag strings with remove buttons for each tag.' },
  { id: 16, name: 'PriceCard', prompt: 'Write a Sola pricing tier card component with tier name, monthly price, feature list, and a signup button.' },
  { id: 17, name: 'Timer', prompt: 'Build a Sola stopwatch component with start, pause, and reset buttons that updates elapsed seconds.' },
  { id: 18, name: 'UserStatus', prompt: 'Create a Sola user status pill component that displays a status dot (online/offline/busy) and status text.' },
  { id: 19, name: 'Breadcrumb', prompt: 'Write a Sola breadcrumb navigation component that renders a list of path items with separators.' },
  { id: 20, name: 'Checkbox', prompt: 'Create a Sola checkbox component with label text and two-way binding to checked state.' }
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
  /\blet's dive in\b/i
];

function extractCode(text) {
  const match = /```(?:sola|html|vue|svelte|xml|jsx|tsx|js)?\s*([\s\S]*?)```/i.exec(text);
  if (match) return match[1].trim();
  if (text.includes('<script') || text.includes('<style') || text.includes('{#if') || text.includes('$state')) {
    return text.trim();
  }
  return '';
}

async function queryOllama(prompt) {
  const start = Date.now();
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      options: { temperature: 0.1, top_p: 0.9 },
      stream: false
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Ollama error ${res.status}: ${errText}`);
  }

  const json = await res.json();
  const elapsed = (Date.now() - start) / 1000;
  const content = json.message?.content || '';
  const evalCount = json.eval_count || 0;
  const evalDuration = (json.eval_duration || 1) / 1e9;
  const tokPerSec = evalCount > 0 ? (evalCount / evalDuration) : 0;

  return { content, elapsed, evalCount, tokPerSec };
}

async function run() {
  console.log(`Starting POST-FINETUNE CERTIFICATION BENCHMARK on ${MODEL} (${PROMPTS.length} prompts)...`);
  const results = [];
  let compiledCount = 0;
  let rawHtmlFenceCount = 0;
  let residueCount = 0;
  let frameworkHallucinationCount = 0;
  let totalTokPerSec = 0;

  for (let i = 0; i < PROMPTS.length; i++) {
    const p = PROMPTS[i];
    process.stdout.write(`[${i + 1}/${PROMPTS.length}] Prompt "${p.name}"... `);

    try {
      const resp = await queryOllama(p.prompt);
      const code = extractCode(resp.content);
      const hasRawHtmlFence = /```html\b/i.test(resp.content);
      const hasResidue = BANNED_PATTERNS.some(pat => pat.test(resp.content));
      const hasFrameworkHallucination = /\b(import React|className=|useState|Vue\.createApp|v-on:)\b/i.test(resp.content);

      let diagnostics = [];
      let compiles = false;

      if (code) {
        diagnostics = checkSource(code, `${p.name}.sola`);
        compiles = diagnostics.filter(d => d.severity === 'error').length === 0;
      } else {
        diagnostics = [{ severity: 'error', message: 'No code block extracted from model response' }];
      }

      if (compiles) compiledCount++;
      if (hasRawHtmlFence) rawHtmlFenceCount++;
      if (hasResidue) residueCount++;
      if (hasFrameworkHallucination) frameworkHallucinationCount++;
      totalTokPerSec += resp.tokPerSec;

      const statusStr = compiles ? 'PASS' : 'FAIL';
      console.log(`${statusStr} (${resp.tokPerSec.toFixed(1)} tok/s, htmlFence=${hasRawHtmlFence}, residue=${hasResidue}, fwHallucination=${hasFrameworkHallucination})`);

      results.push({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        response: resp.content,
        extractedCode: code,
        compiles,
        diagnostics,
        hasRawHtmlFence,
        hasResidue,
        hasFrameworkHallucination,
        tokPerSec: resp.tokPerSec,
        elapsed: resp.elapsed
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        id: p.id,
        name: p.name,
        prompt: p.prompt,
        error: err.message,
        compiles: false
      });
    }
  }

  const compileRate = (compiledCount / PROMPTS.length) * 100;
  const htmlFenceRate = (rawHtmlFenceCount / PROMPTS.length) * 100;
  const residueRate = (residueCount / PROMPTS.length) * 100;
  const fwRate = (frameworkHallucinationCount / PROMPTS.length) * 100;
  const avgTokPerSec = totalTokPerSec / PROMPTS.length;

  console.log('\n======================================================');
  console.log('=== POST-FINETUNE CERTIFICATION BENCHMARK SUMMARY ===');
  console.log('======================================================');
  console.log(`Model Evaluated:        ${MODEL}`);
  console.log(`Total Prompts:          ${PROMPTS.length}`);
  console.log(`.sola Compile Rate:     ${compiledCount}/${PROMPTS.length} (${compileRate.toFixed(1)}%)  [Gate: >= 90.0%]  --> ${compileRate >= 90 ? 'PASS' : 'FAIL'}`);
  console.log(`Raw HTML Fence Rate:    ${rawHtmlFenceCount}/${PROMPTS.length} (${htmlFenceRate.toFixed(1)}%)  [Gate: <= 5.0%]   --> ${htmlFenceRate <= 5.0 ? 'PASS' : 'FAIL'}`);
  console.log(`Chatbot Residue Rate:   ${residueCount}/${PROMPTS.length} (${residueRate.toFixed(1)}%)  [Gate: <= 5.0%]   --> ${residueRate <= 5.0 ? 'PASS' : 'FAIL'}`);
  console.log(`Framework Hallucination:${frameworkHallucinationCount}/${PROMPTS.length} (${fwRate.toFixed(1)}%)   [Gate: 0.0%]      --> ${fwRate === 0 ? 'PASS' : 'FAIL'}`);
  console.log(`Average Speed:          ${avgTokPerSec.toFixed(1)} tokens/sec   [Gate: >= 25.0 tok/s] --> ${avgTokPerSec >= 25 ? 'PASS' : 'FAIL'}`);
  console.log('======================================================');

  const gatePassed = compileRate >= 90.0 && htmlFenceRate <= 5.0 && residueRate <= 5.0 && fwRate === 0 && avgTokPerSec >= 25.0;
  console.log(`OVERALL SHIP GATE STATUS: ${gatePassed ? 'CERTIFIED FOR PRODUCTION SHIP' : 'GATE FAILED'}`);

  const summary = {
    date: new Date().toISOString().split('T')[0],
    model: MODEL,
    totalPrompts: PROMPTS.length,
    compiledCount,
    compileRate,
    rawHtmlFenceCount,
    htmlFenceRate,
    residueCount,
    residueRate,
    frameworkHallucinationCount,
    fwRate,
    avgTokPerSec,
    gatePassed,
    results
  };

  const defaultOutPath = fs.existsSync('C:/Projects/sola-finetune')
    ? 'C:/Projects/sola-finetune/certified-results.json'
    : path.resolve(process.cwd(), 'certified-results.json');
  const outPath = process.env.CERTIFICATION_OUT || defaultOutPath;
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`Saved certified benchmark results to ${outPath}`);
}

run().catch(console.error);
