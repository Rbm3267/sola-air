import assert from 'node:assert';
import { describe, it } from 'node:test';
import { GeminiProvider } from '../src/gemini.js';
import { OpenAIProvider, AzureOpenAIProvider } from '../src/openai.js';
import { HuggingFaceProvider } from '../src/huggingface.js';

describe('@sola-air-ui/providers', () => {
  it('GeminiProvider uses ?key= for non-streaming and &key= for streaming', async () => {
    const realFetch = globalThis.fetch;
    const calls = [];
    globalThis.fetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'ok' }] } }] }),
        body: {
          getReader() {
            let sent = false;
            return {
              async read() {
                if (sent) return { done: true, value: undefined };
                sent = true;
                return {
                  done: false,
                  value: new TextEncoder().encode('data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}\n\n')
                };
              }
            };
          }
        }
      };
    };

    try {
      const provider = GeminiProvider({ apiKey: 'test+key/1', model: 'gemini-2.5-flash' });

      const res1 = await provider.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'hello' }], stream: false })
      });
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(
        calls[0].url,
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=test%2Bkey%2F1'
      );

      const res2 = await provider.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'hello' }], stream: true })
      });
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(
        calls[1].url,
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=test%2Bkey%2F1'
      );
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('AzureOpenAIProvider sends api-key and Authorization headers to the deployment URL', async () => {
    const realFetch = globalThis.fetch;
    let captured = null;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'azure-ok' } }] })
      };
    };

    try {
      const azure = AzureOpenAIProvider({
        apiKey: 'az-secret-123',
        endpoint: 'https://my-resource.openai.azure.com',
        deployment: 'gpt4o-prod',
        apiVersion: '2024-02-01'
      });

      const res = await azure.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'ping' }], stream: false })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        captured.url,
        'https://my-resource.openai.azure.com/openai/deployments/gpt4o-prod/chat/completions?api-version=2024-02-01'
      );
      assert.strictEqual(captured.init.headers['api-key'], 'az-secret-123');
      assert.strictEqual(captured.init.headers['Authorization'], 'Bearer az-secret-123');

      const openAI = OpenAIProvider({ apiKey: 'sk-test' });
      await openAI.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'ping' }], stream: false })
      });
      assert.strictEqual(captured.init.headers['Authorization'], 'Bearer sk-test');
      // Only Azure needs the key in a second header; don't send it to anyone else.
      assert.strictEqual(captured.init.headers['api-key'], undefined);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('HuggingFaceProvider sends Bearer token and targets HF router endpoint', async () => {
    const realFetch = globalThis.fetch;
    let captured = null;
    globalThis.fetch = async (url, init) => {
      captured = { url, init };
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'hf-ok' } }] })
      };
    };

    try {
      const hf = HuggingFaceProvider({
        apiKey: 'hf_secret_123',
        model: 'bennett-xdlabs/sola-air-1.5b'
      });

      const res = await hf.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'build stat card' }], stream: false })
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(
        captured.url,
        'https://api-inference.huggingface.co/models/bennett-xdlabs/sola-air-1.5b/v1/chat/completions'
      );
      assert.strictEqual(captured.init.headers['Authorization'], 'Bearer hf_secret_123');

      // Test streaming
      globalThis.fetch = async (url, init) => {
        let sent = false;
        return {
          ok: true,
          body: {
            getReader() {
              return {
                async read() {
                  if (sent) return { done: true, value: undefined };
                  sent = true;
                  return {
                    done: false,
                    value: new TextEncoder().encode('data: {"choices":[{"delta":{"content":"token1"}}]}\ndata: [DONE]\n\n')
                  };
                },
                releaseLock() {}
              };
            }
          }
        };
      };

      const streamRes = await hf.handler({
        json: async () => ({ messages: [{ role: 'user', content: 'test stream' }], stream: true })
      });
      assert.strictEqual(streamRes.status, 200);
      assert.strictEqual(streamRes.headers.get('Content-Type'), 'text/event-stream');
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
