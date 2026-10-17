import { streamingResponse, jsonResponse, errorResponse, toExpress } from './utils.js';

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';

/**
 * OpenAI provider for Sola AIR.
 *
 * @example
 * import { OpenAIProvider } from '@sola-air-ui/providers/openai'
 * const provider = OpenAIProvider({ apiKey: process.env.OPENAI_KEY })
 * export const POST = provider.handler
 */
export function OpenAIProvider({
  apiKey,
  model = 'gpt-4o',
  maxTokens = 4096,
  system,
  baseURL = OPENAI_API,
  headers: extraHeaders
} = {}) {
  async function handler(request) {
    try {
      const { messages, model: reqModel, stream = false } = await request.json();

      const allMessages = [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...messages
      ];

      const body = {
        model: reqModel || model,
        max_tokens: maxTokens,
        messages: allMessages,
        stream
      };

      const res = await fetch(baseURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          ...extraHeaders
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        return errorResponse(err, res.status);
      }

      if (stream) {
        return streamingResponse(_parseOpenAIStream(res));
      }

      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return jsonResponse(text);
    } catch (err) {
      return errorResponse(err.message);
    }
  }

  return { handler, express: toExpress(handler) };
}

/**
 * Azure OpenAI — same wire protocol, different URL + auth header.
 * @example
 * AzureOpenAIProvider({
 *   apiKey: process.env.AZURE_KEY,
 *   endpoint: 'https://my-resource.openai.azure.com',
 *   deployment: 'my-gpt4o-deployment',
 *   apiVersion: '2024-02-01'
 * })
 */
export function AzureOpenAIProvider({ apiKey, endpoint, deployment, apiVersion = '2024-02-01', ...rest } = {}) {
  const baseURL = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;
  return OpenAIProvider({ apiKey, baseURL, headers: { 'api-key': apiKey }, ...rest });
}

async function* _parseOpenAIStream(res) {
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
      if (payload === '[DONE]') return;
      try {
        const evt = JSON.parse(payload);
        const token = evt.choices?.[0]?.delta?.content;
        if (token) yield token;
      } catch { /* skip */ }
    }
  }
}
