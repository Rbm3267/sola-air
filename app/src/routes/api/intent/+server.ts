import { json } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { env } from '$env/dynamic/private';
import { FACTS } from '$lib/data/site';

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

    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
      return json({ 
        reply: "Sola Arc is running in sovereign offline mode. Sola components compile directly into native reactive DOM nodes via @sola-air-ui/compiler with zero-VDOM signals. For live AI generation, configure GEMINI_API_KEY in your environment." 
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Mode 1: Sola Arc (Solutions Architect & Framework Consultant)
    if (data.mode === 'architect' || data.query) {
      const rawQuery = typeof data.query === 'string' ? data.query : typeof data.intent === 'string' ? data.intent : '';
      const query = rawQuery.trim();
      
      if (!query || query.length > 2000) {
        return json({ error: 'Invalid query. Query must be between 1 and 2000 characters.' }, { status: 400 });
      }

      const architectSystemPrompt = `You are **Sola Arc**, the autonomous Principal UI & Systems Solutions Architect for the Sola Reactive Runtime ecosystem (@sola-air-ui/core, @sola-air-ui/ui, @sola-air-ui/compiler, @sola/relay).

Your Mission:
1. Explain how Sola embeds and modernizes existing web applications (React 19, Next.js App Router, Svelte 5, Vue 3, Angular, or legacy enterprise platforms and custom monoliths).
2. Answer "How would this work in my UI?" with concrete architectural guidance, Shadow DOM isolation strategies, and exact copy-paste integration code snippets.
3. Explain the Zero-VDOM ${FACTS.coreSizeKb} Signal Mesh (@sola-air-ui/core) and how fine-grained signals eliminate virtual DOM reconciliation overhead and re-rendering lag.
4. Show developers how to eliminate complex form boilerplate using Sola's declarative DynamicForm and DataCard schemas that configure from UI with 0 code changes.
5. Provide guidance on the Sola Chrome Extension (Live Browser Overlay) for in-situ sandbox testing without production deployments.

Formatting:
- Structure your response with crisp markdown headers, bullet points, and syntax-highlighted code blocks (javascript, typescript, svelte, or bash).
- Write production-grade, concise code snippets.
- Maintain a world-class, confident, Apple / Linear / Stripe level polish.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: architectSystemPrompt + "\n\nUser Question: " + query,
        config: {
          temperature: 0.3
        }
      });

      return json({ reply: response.text || 'I am ready to architect your Sola integration.' });
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

    const systemInstruction = `You are Sola's generative UI intent compiler.
You build clean, modern, world-class UI surfaces (Linear, Apple, Vercel grade polish).
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
6. 'ClusterMatrix': High-density distributed node matrix and cluster health grid.
   config: { title: string, subtitle?: string, nodes: Array<{ id: string, label: string, status: 'nominal' | 'warning' | 'critical' | 'draining' | 'idle', load?: number, latency?: string, region?: string }> }
7. 'DiffAudit': Change review diff with 1-click approvals.
   config: { title: string, entityId: string, entityType: string, riskLevel: 'Low' | 'Moderate' | 'High' | 'Destructive', riskScore: number, requester: string, window: string, diffLines: Array<{ type: 'add' | 'remove' | 'context', content: string }> }
8. 'FlowWaterfall': Financial revenue realization and latency breakdown.
   config: { title: string, subtitle?: string, steps: Array<{ id: string, name: string, delta: number, type: 'start' | 'credit' | 'debit' | 'total', formattedValue: string }> }
9. 'IncidentTriageMatrix': Mission-control emergency incident triage capsule with countdown timer.
   config: { incidentId: string, title: string, severity: 'P1 - Critical' | 'P2 - High' | 'P3 - Moderate', slaRemainingMin: number, blastRadius: string, playbooks: Array<{ id: string, title: string, action: string, automated?: boolean }> }
10. 'SchemaInspector': Database table schema explorer with types, row counts, and foreign key relations.
   config: { table: string, rowCount?: string, sizeBytes?: string, columns: Array<{ name: string, type: string, isPrimary?: boolean, isNullable?: boolean, foreignKey?: string }> }
11. 'KineticNodeGraph': Highly dynamic physics-based node cluster simulation graph.
   config: { nodes: Array<{ id: string, group: number, radius: number, color: string }>, links: Array<{ source: string, target: string, value: number }> }
12. 'HapticRadialDial': Interactive rotary dial input.
   config: { value: number, min: number, max: number }

Output format: Return ONLY a JSON Array of component objects with an optional colSpan (1, 2, or 3).`;

    const response = await ai.models.generateContent({
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
