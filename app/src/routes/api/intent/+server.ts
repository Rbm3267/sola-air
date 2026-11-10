import { json } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$app/env/private';
import { FACTS, UI_MANIFEST } from '$lib/data/site';
import { STUDIO_COMPONENTS, buildBlock, tidyGeneratedProps } from '$lib/data/studioComponents';
import { usageRecord } from '$lib/data/usage';

// In-Memory Sliding-Window IP Rate Limiter (15 requests/minute per client IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 15;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }
  
  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

// Cleanup stale rate limit entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, times] of rateLimitMap.entries()) {
      const valid = times.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (valid.length === 0) {
        rateLimitMap.delete(ip);
      } else {
        rateLimitMap.set(ip, valid);
      }
    }
  }, 5 * 60 * 1000);
}

export async function POST({ request, getClientAddress }) {
  try {
    // 1. IP Rate Limiting Guard
    let clientIp = '127.0.0.1';
    try {
      clientIp = getClientAddress() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    } catch {
      clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    }

    if (isRateLimited(clientIp)) {
      return json(
        { error: 'Too many requests. Please wait a moment before sending another query.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Request Body Parsing & Type Validation
    let data: any;
    try {
      data = await request.json();
    } catch {
      return json({ error: 'Invalid JSON request payload.' }, { status: 400 });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ error: 'Payload must be a JSON object.' }, { status: 400 });
    }

    const apiKey = GEMINI_API_KEY;

    if (!apiKey && (data.mode === 'studio' || data.mode === 'sola')) {
      return json({ error: 'Arc is offline: this server has no model key configured.' }, { status: 503 });
    }
    if (!apiKey) {
      return json({ 
        reply: "Sola Arc is offline because no GEMINI_API_KEY is set on this server. Sola components compile to plain DOM updates with @sola-air-ui/compiler. Set the key to get live answers." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    // Every model call goes through here so its token use is logged.
    const generate = async (mode: string, args: Parameters<typeof ai.models.generateContent>[0]) => {
      const res = await ai.models.generateContent(args);
      console.info(JSON.stringify(usageRecord(mode, String(args.model), res.usageMetadata)));
      return res;
    };

    // Mode 0: write a .sola component. The page compiles it in the browser and
    // runs it in a sandboxed frame; nothing here executes the answer.
    if (data.mode === 'sola') {
      const ask = typeof data.prompt === 'string' ? data.prompt.trim() : '';
      if (!ask) return json({ error: 'Describe what you want to build.' }, { status: 400 });
      if (ask.length > 500) {
        return json({ error: `That description is too long (${ask.length} characters). The maximum is 500.` }, { status: 400 });
      }
      const previous = typeof data.previousSource === 'string' ? data.previousSource.slice(0, 14000) : '';
      const problem = typeof data.error === 'string' ? data.error.slice(0, 600) : '';

      const writer = `You write one Sola component file (.sola) for a small interactive page.

The file has three parts, in this order: a <script> block, the HTML markup, and a <style> block.

Rules:
- Declare state with: let x = $state(0);  Computed values: let y = $derived(x * 2);  Side effects: $effect(() => { ... });
- Read state by its plain name in the script and in the markup: {x}. Change it by assigning: x += 1. For arrays and objects, assign a new value: items = [...items, item].
- Events: onclick={fn}, oninput={fn}, onchange={fn}, onsubmit={fn}. Two-way inputs: <input bind:value={name} />.
- Conditions: {#if a}...{:else if b}...{:else}...{/if}. Lists: {#each items as item, i (item.id)}...{/each}. Close every block you open.
- No imports, no network requests, no localStorage, no timers that never stop, no external images, fonts or scripts, no iframes, no eval. The component runs in a sealed frame with none of those.
- Draw charts with inline SVG or CSS. Use real, believable sample data. Plain words in all labels. No lorem ipsum.
- Make it work from 320px to 900px wide. Use system fonts. Keep the styling in <style>, with a light background, and give interactive controls visible focus.
- Keep it under 200 lines.

Here is a complete example of the format:

<script>
  let draft = $state('');
  let tasks = $state([{ id: 1, text: 'Write a .sola file', done: true }]);
  let left = $derived(tasks.filter((t) => !t.done).length);

  function add() {
    if (!draft.trim()) return;
    tasks = [...tasks, { id: Date.now(), text: draft.trim(), done: false }];
    draft = '';
  }
  function toggle(id) {
    tasks = tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
  }
</script>

<form class="tasks" onsubmit={(e) => { e.preventDefault(); add(); }}>
  <input bind:value={draft} placeholder="Add a task" aria-label="New task" />
  <ul>
    {#each tasks as task (task.id)}
      <li><label><input type="checkbox" checked={task.done} onchange={() => toggle(task.id)} /> {task.text}</label></li>
    {/each}
  </ul>
  {#if left === 0}<p>All done.</p>{:else}<p>{left} left</p>{/if}
</form>

<style>
  .tasks { max-width: 320px; display: flex; flex-direction: column; gap: 10px; }
  ul { list-style: none; margin: 0; padding: 0; }
</style>

Return only the contents of the file. No code fences, no commentary.`;

      const fix = previous
        ? `\n\nYour previous attempt did not work.\nError: ${problem || 'it did not compile'}\n\nPrevious file:\n${previous}\n\nReturn the corrected whole file.`
        : '';

      const response = await generate('sola', {
        model: 'gemini-3.6-flash',
        contents: writer + '\n\nBuild this: ' + ask + fix,
        config: { temperature: 0.4 }
      });
      let source = (response.text || '').trim();
      const fenced = source.match(/^```[a-z]*\n([\s\S]*?)\n```$/i);
      if (fenced) source = fenced[1].trim();
      if (!source.includes('<script') && !source.includes('<')) {
        return json({ error: 'The model did not return a component. Try rewording the request.' }, { status: 502 });
      }
      if (source.length > 14000) {
        return json({ error: 'The component came back too long to run. Try a smaller request.' }, { status: 502 });
      }
      return json({ source });
    }

    // Mode 1: Sola Arc (Solutions Architect & Framework Consultant)
    if (data.mode === 'architect' || data.query) {
      const rawQuery = typeof data.query === 'string' ? data.query : typeof data.intent === 'string' ? data.intent : '';
      const query = rawQuery.trim();
      
      if (!query || query.length > 2000) {
        return json({ error: 'Invalid query. Query must be between 1 and 2000 characters.' }, { status: 400 });
      }

      const architectSystemPrompt = `You answer questions about Sola AIR for developers: @sola-air-ui/core, @sola-air-ui/ui, @sola-air-ui/compiler and the Relay (@sola-air-ui/relay).

What is true, so you can stay within it:
- A .sola file holds a script, markup and styles. The compiler turns it into plain JavaScript that updates the DOM directly. There is no virtual DOM.
- State is $state(...), computed values are $derived(...), side effects are $effect(...).
- A compiled component's default export is its mount function: call it with an element and props, and it returns a teardown function. That is how it goes inside React, Vue, Svelte or plain JavaScript.
- The core runtime is ${FACTS.coreSizeKb} gzipped.
- The Relay reads from PostgreSQL, MySQL and Google Sheets. A sheet must be viewable by anyone with the link, and it is read only. Do not say it supports other sources.
- @sola-air-ui/ui ships 37 components. Do not mention components outside that package as if they could be installed.
- There is a Chrome extension that overlays a companion on a page.

How to answer:
- Answer the question that was asked. Use short sentences and plain words.
- Give a short, correct code sample when code helps. Use markdown code blocks.
- If you are not sure something is supported, say you are not sure.
- Do not use marketing language, and do not claim performance or savings you can't point to.
- Never write "not X, but Y" contrasts. State the point directly.
- End on the last concrete fact or next step. No one-line summary closers.
- Avoid stock phrases: "it's important to note", "it's worth noting", "moving forward", "at the end of the day", "delve into", "robust", "comprehensive", "transformative", "game-changing", "leverage" or "utilize" (say "use"), and "furthermore", "moreover", "additionally".
- Use periods, commas or parentheses instead of em-dashes.`;

      const response = await generate('architect', {
        model: 'gemini-3.6-flash',
        contents: architectSystemPrompt + "\n\nUser Question: " + query,
        config: {
          temperature: 0.3
        }
      });

      return json({ reply: response.text || 'I don\'t have an answer for that.' });
    }

    // Mode 2: Generative UI Intent Compiler (JSON Component AST)
    // Accept `prompt` as well as `intent`: callers reasonably reach for either,
    // and reading only one of them turned a typo into a silent 400.
    const rawIntent =
      typeof data.intent === 'string' ? data.intent
      : typeof data.prompt === 'string' ? data.prompt
      : '';
    const prompt = rawIntent.trim();
    // Separate messages: an empty field and an over-long one are different
    // mistakes, and reporting both as "maximum length" sent debugging the
    // wrong way entirely.
    if (!prompt) {
      return json({ error: 'No intent provided. Send an intent string describing what to build.' }, { status: 400 });
    }
    if (prompt.length > 1000) {
      return json({ error: `Intent is too long (${prompt.length} characters). The maximum is 1000.` }, { status: 400 });
    }

    // Mode 3: Studio. The model may only use the components Studio offers, with
    // the props they declare; the answer is filtered against the same list, so
    // a block the canvas cannot mount or the export cannot write never reaches
    // the client.
    if (data.mode === 'studio') {
      const catalog = STUDIO_COMPONENTS.map((c) => {
        const props = (UI_MANIFEST.props[c.name] ?? []).filter((p) => !/^on[A-Za-z]/.test(p));
        return `- ${c.name}: ${c.blurb} Props: ${props.join(', ')}. Example props: ${JSON.stringify(c.sample)}`;
      }).join('\n');
      const studioInstruction = `You lay out a dashboard or form from a fixed set of UI components.
Use only these components and only the props listed for each. Follow the shape of the example props.
${catalog}

Return ONLY JSON: an array of 3 to 8 blocks, each { "component": string, "span": 1 | 2 | 3, "props": object }.
The canvas is 3 columns wide. Fill props with realistic content for the request. Plain words, no lorem ipsum.
Do not invent measurements. If the request gives no figure, use an obvious placeholder such as "--" or example values labelled as examples. Never claim live, synced or real-time data.
A dial's "metric" is its centre readout and must contain a number. Put the unit in "unit".`;

      const response = await generate('studio', {
        model: 'gemini-3.6-flash',
        contents: studioInstruction + '\n\nRequest: ' + prompt,
        config: { responseMimeType: 'application/json', temperature: 0.3 }
      });
      let raw: unknown;
      try {
        raw = JSON.parse(response.text || '[]');
      } catch {
        return json({ error: 'Arc answered with something that was not JSON. Try again.' }, { status: 502 });
      }
      const list: any[] = Array.isArray(raw) ? raw : Array.isArray((raw as any)?.blocks) ? (raw as any).blocks : [raw];
      const blocks = list
        .map((b) => {
          const name = String(b?.component ?? b?.type ?? '');
          const props = tidyGeneratedProps(name, b?.props ?? b?.config ?? {});
          return buildBlock(name, props, b?.span ?? b?.colSpan, UI_MANIFEST.props[name] ?? []);
        })
        .filter(Boolean);
      return json({ blocks });
    }

    const systemInstruction = `You are Sola's generative UI intent compiler.
You build clean, modern UI surfaces.
Given a user intent, output a structured JSON array of components to render.

Available Primitives:
1. 'DataCard': KPI metric tile.
   config: { title: string, value: string, trend: string, icon: 'activity' | 'trending-up' | 'check' | 'heart' }
2. 'GaugeCard': Circular SVG progress arc for load, recovery, memory, or SLA.
   config: { title: string, value: string, percentage: number (0-100), subtext: string, color: 'amber' | 'emerald' | 'sky' | 'violet' }
3. 'DynamicForm': Schema-driven auto-binding form.
   config: { title: string, endpoint: string, fields: Array<{ name: string, type: 'text' | 'number' | 'email' | 'password', label: string, required?: boolean }> }
4. 'ListBlock': Real-time reactive entity list.
   config: { title: string, items: Array<{ label: string, description: string, status: 'Active' | 'Completed' | 'Syncing' | 'Offline' }> }
5. 'StreamView': Real-time telemetry log feed.
   config: { title: string, events: Array<{ id: string, message: string, timestamp: string, type: 'info' | 'success' | 'warning' }> }
6. 'ClusterMatrix': Grid of cluster nodes and their health.
   config: { title: string, subtitle?: string, nodes: Array<{ id: string, label: string, status: 'nominal' | 'warning' | 'critical' | 'draining' | 'idle', load?: number, latency?: string, region?: string }> }
7. 'DiffAudit': Change review diff with 1-click approvals.
   config: { title: string, entityId: string, entityType: string, riskLevel: 'Low' | 'Moderate' | 'High' | 'Destructive', riskScore: number, requester: string, window: string, diffLines: Array<{ type: 'add' | 'remove' | 'context', content: string }> }
8. 'FlowWaterfall': Financial revenue realization and latency breakdown.
   config: { title: string, subtitle?: string, steps: Array<{ id: string, name: string, delta: number, type: 'start' | 'credit' | 'debit' | 'total', formattedValue: string }> }
9. 'IncidentTriageMatrix': Incident triage card with a countdown timer.
   config: { incidentId: string, title: string, severity: 'P1 - Critical' | 'P2 - High' | 'P3 - Moderate', slaRemainingMin: number, blastRadius: string, playbooks: Array<{ id: string, title: string, action: string, automated?: boolean }> }
10. 'SchemaInspector': Database table schema explorer with types, row counts, and foreign key relations.
   config: { table: string, rowCount?: string, sizeBytes?: string, columns: Array<{ name: string, type: string, isPrimary?: boolean, isNullable?: boolean, foreignKey?: string }> }
11. 'KineticNodeGraph': Highly dynamic physics-based node cluster simulation graph.
   config: { nodes: Array<{ id: string, group: number, radius: number, color: string }>, links: Array<{ source: string, target: string, value: number }> }
12. 'HapticRadialDial': Interactive rotary dial input.
   config: { value: number, min: number, max: number }

Output format: Return ONLY a JSON Array of component objects with an optional colSpan (1, 2, or 3).`;

    const response = await generate('layout', {
      model: 'gemini-3.6-flash',
      contents: systemInstruction + "\n\nUser Intent: " + prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    let parsed = JSON.parse(response.text || '[]');
    if (!Array.isArray(parsed)) {
      parsed = [parsed];
    }

    return json(parsed);

  } catch (err: any) {
    console.error('AI Intent Internal Error:', err);
    // Return sanitized error message without leaking SDK internal keys or quotas
    return json({ error: 'Unable to process AI request at this time. Please try again.' }, { status: 500 });
  }
}
