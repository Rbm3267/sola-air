import { streamingResponse, jsonResponse, errorResponse, toExpress } from './utils.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Google Gemini provider for Sola AIR.
 *
 * @example
 * import { GeminiProvider } from '@sola-air-ui/providers/gemini'
 * const provider = GeminiProvider({ apiKey: process.env.GEMINI_KEY })
 * export const POST = provider.handler
 */
export function GeminiProvider({
  apiKey,
  model = 'gemini-2.5-flash',
  maxTokens = 4096,
  system
} = {}) {
  async function handler(request) {
    try {
      const { messages, model: reqModel, stream = false } = await request.json();

      const activeModel = reqModel || model;
      const action = stream ? 'streamGenerateContent?alt=sse' : 'generateContent';
      const sep = action.includes('?') ? '&' : '?';
      const url = `${GEMINI_BASE}/${activeModel}:${action}${sep}key=${encodeURIComponent(apiKey)}`;

      // Gemini uses 'contents' with 'parts', and roles are 'user'/'model'
      const contents = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

      const body = {
        contents,
        generationConfig: { maxOutputTokens: maxTokens },
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {})
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        return errorResponse(err, res.status);
      }

      if (stream) {
        return streamingResponse(_parseGeminiStream(res));
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return jsonResponse(text);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  return { handler, express: toExpress(handler) };
}

async function* _parseGeminiStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    const lines = buf.split('\n');
    buf = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6).trim();
      try {
        const evt = JSON.parse(payload);
        const text = evt.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch { /* skip */ }
    }
  }
}
