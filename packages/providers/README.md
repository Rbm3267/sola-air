# @sola-air-ui/providers

Server-side LLM provider adapters for [Sola AIR](https://sola-air.dev)'s `$intent`/`createIntent` primitive — a common streaming interface over Anthropic, OpenAI, Gemini, and Ollama so your `.sola` components don't need to know which model is answering.

## Install

```bash
npm install @sola-air-ui/providers
```

## Usage

Create the adapter for your provider on the server (never ship API keys to the browser). Each one returns `{ handler, express }`. `handler` takes a fetch `Request` and returns a `Response`, so it drops into any route that speaks fetch:

```js
// src/routes/api/intent/+server.js (SvelteKit)
import { AnthropicProvider } from '@sola-air-ui/providers/anthropic';
// or: import { OpenAIProvider, AzureOpenAIProvider } from '@sola-air-ui/providers/openai';
// or: import { GeminiProvider } from '@sola-air-ui/providers/gemini';
// or: import { OllamaProvider } from '@sola-air-ui/providers/ollama';

const provider = AnthropicProvider({ apiKey: process.env.ANTHROPIC_API_KEY });

export const POST = ({ request }) => provider.handler(request);
```

For Express, use `app.post('/api/intent', express.json(), provider.express)`.

On the client, `configureIntent({ endpoint: '/api/intent' })` points `$intent` at that route. The request body is `{ messages, model, stream }`. A non-streaming reply is `{ result }`, and a streaming one is server-sent events.

To run [`sola-air-1.5b`](https://huggingface.co/bennett-xdlabs/sola-air-1.5b) locally, use `OllamaProvider({ model: 'hf.co/bennett-xdlabs/sola-air-1.5b' })`. The server has to reach Ollama, so the app server and Ollama need to be on the same machine or network.

## Supported providers

| Provider | Import path |
|---|---|
| Anthropic (Claude) | `@sola-air-ui/providers/anthropic` |
| OpenAI | `@sola-air-ui/providers/openai` |
| Google Gemini | `@sola-air-ui/providers/gemini` |
| Ollama (local models) | `@sola-air-ui/providers/ollama` |

All four adapters support streaming responses.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
