# @sola-air-ui/sentinel

Notice when someone hesitates on a form, and describe what you saw.

No dependencies. No build step. Works in React, Svelte, or plain DOM, and does
not require the Sola runtime or rewriting any of your components.

```bash
npm install @sola-air-ui/sentinel
```

## What it does

It watches focus, typing and blur across a form; decides when a pause is
actually meaningful rather than a keystroke gap; and builds a natural-language
prompt describing the activity. What you do with that prompt is yours — call a
model, look up a similar record, show a hint.

The gate is the interesting part. Naive versions fire on every change; this one
requires a real quiet period after real activity, rate-limits itself, and needs
more than one event before it will say anything.

## React

```jsx
import { useSentinel } from '@sola-air-ui/sentinel/react';

function IncidentForm() {
  const { ref, prompt } = useSentinel({ onSuggest: (p) => ask(p) });

  return (
    <form ref={ref}>
      <label htmlFor="d">Short description</label>
      <input id="d" name="short_description" />
      <label htmlFor="c">Caller</label>
      <input id="c" name="caller" />
    </form>
  );
}
```

Nothing inside the form changes — no wrapper components, no per-field handlers.

## Svelte

```svelte
<script>
  import { sentinel } from '@sola-air-ui/sentinel/svelte';
  let prompt = null;
</script>

<form use:sentinel={{ onSuggest: (p) => (prompt = p) }}>
  <!-- unchanged -->
</form>
```

## Plain DOM

```js
import { observe } from '@sola-air-ui/sentinel';

const { disconnect } = observe(document.querySelector('#incident-form'), {
  onSuggest: (prompt) => console.log(prompt)
});
```

Useful where a framework cannot go — an enterprise portal widget, a
browser extension, an embedded surface in a page you do not control.

## Privacy

It observes what people type, so the defaults are conservative:

- `password`, `hidden` and `file` inputs are never read, and their events are
  not recorded at all.
- Fields whose `autocomplete` marks them as a one-time code, a current or new
  password, or a card field are excluded the same way.
- Anything carrying `data-sentinel-ignore`, or inside an element that does, is
  excluded.
- `redact(fieldName, value, el)` rewrites a value before it is recorded. Return
  `''` to keep only its length.

Values stay in memory, in a bounded buffer (50 events, 60 seconds). Nothing is
sent anywhere — the package makes no network calls.

## Tuning the gate

| Option | Default | What it controls |
|---|---|---|
| `idleThresholdMs` | `1500` | Quiet period after activity before firing |
| `minSuggestIntervalMs` | `8000` | Minimum gap between suggestions |
| `minEventsForSuggestion` | `2` | Events required before saying anything |
| `pollMs` | `250` | How often the gate is checked |

## Also exported

`createSentinel()` gives you the observer directly if you would rather record
events yourself — it also tracks rage-clicks and a `flowIndex` derived from
friction severity, backtracking, and pacing variance.

MIT.
