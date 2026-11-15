# @sola-air-ui/providers

Server-side LLM provider adapters for [Sola AIR](https://sola-air.dev)'s `$intent`/`createIntent` primitive — a common streaming interface over Anthropic, OpenAI, Gemini, and Ollama so your `.sola` components don't need to know which model is answering.

## Install

```bash
npm install @sola-air-ui/providers
```

## Usage

Import the adapter for whichever provider you're using, on the server side (never ship API keys to the browser):

```js
import { anthropic } from '@sola-air-ui/providers/anthropic';
// or: import { openai } from '@sola-air-ui/providers/openai';
// or: import { gemini } from '@sola-air-ui/providers/gemini';
// or: import { ollama } from '@sola-air-ui/providers/ollama';

const provider = anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function handleIntentRequest(prompt) {
  return provider.stream(prompt);
}
```

Wire this into whatever API route your framework compiles `$intent` calls to hit — `configureIntent({ endpoint: '/api/intent' })` on the client side points Sola at it.

## Supported providers

| Provider | Import path | Notes |
|---|---|---|
| Hugging Face Hub | `@sola-air-ui/providers/huggingface` | Supports `bennett-xdlabs/sola-air-1.5b` via Serverless API & Endpoints |
| Ollama (local models) | `@sola-air-ui/providers/ollama` | Zero-API-key local inference (`sola-air-1.5b`, `llama3.2`, etc.) |
| Anthropic (Claude) | `@sola-air-ui/providers/anthropic` | Claude 3.5 Sonnet / Haiku |
| OpenAI | `@sola-air-ui/providers/openai` | GPT-4o / Azure OpenAI |
| Google Gemini | `@sola-air-ui/providers/gemini` | Gemini 2.5 Flash / Thinking |

All adapters support streaming responses.

## License

MIT — see the [repo root](https://github.com/rbm3267/sola-air) for the full license and [changelog](https://github.com/rbm3267/sola-air/blob/main/CHANGELOG.md).
