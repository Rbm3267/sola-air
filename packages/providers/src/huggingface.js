import { streamingResponse, jsonResponse, errorResponse, toExpress } from './utils.js';

/**
 * Hugging Face Inference API / Inference Endpoints provider for Sola AIR.
 *
 * @example
 * import { HuggingFaceProvider } from '@sola-air-ui/providers'
 * const provider = HuggingFaceProvider({ model: 'bennett-xdlabs/sola-air-1.5b' })
 * export const POST = provider.handler
 */
export function HuggingFaceProvider({
  model = 'bennett-xdlabs/sola-air-1.5b',
  apiKey = (typeof process !== 'undefined' ? process.env?.HF_TOKEN || process.env?.HUGGINGFACE_API_KEY : ''),
  endpoint,
  signal: defaultSignal
} = {}) {
  const url = endpoint || `https://api-inference.huggingface.co/models/${model}/v1/chat/completions`;

  async function handler(request) {
    try {
      const { messages, model: reqModel, stream = false, temperature = 0.2, max_tokens = 2048, signal } = await request.json();

      const headers = {
        'Content-Type': 'application/json'
      };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        signal: signal || defaultSignal,
        body: JSON.stringify({
          model: reqModel || model,
          messages,
          stream,
          temperature,
          max_tokens
        })
      });

      if (!res.ok) {
        const err = await res.text();
        return errorResponse(err, res.status);
      }

      if (stream) {
        return streamingResponse(_parseSseStream(res));
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? data[0]?.generated_text ?? '';
      return jsonResponse(text);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  return { handler, express: toExpress(handler) };
}

async function* _parseSseStream(res) {
  if (!res.body) {
    throw new Error('Hugging Face response body is missing');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        buf += decoder.decode(new Uint8Array(), { stream: false });
        break;
      }
      buf += decoder.decode(value, { stream: true });

      const lines = buf.split('\n');
      buf = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') return;
        try {
          const evt = JSON.parse(dataStr);
          const token = evt.choices?.[0]?.delta?.content;
          if (token) yield token;
        } catch { /* skip non-json */ }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
