# Ambient Suggestion POC (`createSentinel` + `$intent`)

Standalone zero-bundler proof of concept showing **Sola Sentinel** observing form focus/blur/revisit behavior in the browser and triggering a live **`$intent` / `createIntent`** request through a minimal Node HTTP server backed by Gemini (`gemini-3.6-flash`).

## Prerequisites

1. Build the Sola Core IIFE bundle first so `/vendor/sola-core.iife.js` exists:
   ```bash
   npm run build --workspace=@sola-air-ui/core
   ```
2. Set `GEMINI_API_KEY` in your environment (or in `app/.env`):
   ```bash
   export GEMINI_API_KEY="your-api-key"
   ```
   *(If no API key is configured, `/api/intent` returns a safe `{ label: null }` stub so the page still runs locally.)*

## Running

```bash
node examples/ambient-poc/server.mjs
```

Then open [http://localhost:4310](http://localhost:4310) and focus/blur the form fields to watch Sola Sentinel populate the observation buffer and render an `AmbientSuggestion` component when significance thresholds are met.
