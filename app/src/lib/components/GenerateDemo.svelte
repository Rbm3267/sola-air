<script lang="ts">
  // Describe a small interface; the model writes a .sola file; the real compiler
  // compiles it here in the browser; the result runs in a sealed frame.
  //
  // The frame is the safety boundary. It is sandboxed without allow-same-origin,
  // so it has no access to this page, its cookies or its storage, and its own
  // content security policy blocks every network request. The source is shown
  // beside the result so you can read what ran.
  import SolaIcons from './SolaIcons.svelte';

  type Phase = 'idle' | 'writing' | 'fixing' | 'done' | 'error';

  const EXAMPLES = [
    'A tip calculator with a bill field, a tip slider and the total split between people',
    'A habit tracker with seven days of checkboxes and a streak count',
    'A bar chart whose values I can change by typing numbers',
    'A pomodoro timer with start, pause and reset'
  ];

  let ask = $state('');
  let phase = $state<Phase>('idle');
  let message = $state('');
  let source = $state('');
  let frameDoc = $state('');
  let tab = $state<'preview' | 'source'>('preview');
  let copied = $state(false);

  const busy = $derived(phase === 'writing' || phase === 'fixing');

  // A block the compiler accepts but cannot close would show up as text on the
  // page, so count them the way sola-check does.
  function unbalanced(code: string): string {
    const body = code
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '');
    for (const kind of ['if', 'each']) {
      const open = (body.match(new RegExp(`\\{#${kind}\\b`, 'g')) ?? []).length;
      const close = (body.match(new RegExp(`\\{/${kind}\\}`, 'g')) ?? []).length;
      if (open !== close) return `${open} {#${kind}} but ${close} {/${kind}}`;
    }
    return '';
  }

  async function ask_model(prompt: string, previousSource = '', error = ''): Promise<string> {
    const res = await fetch('/api/intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sola', prompt, previousSource, error })
    });
    const text = await res.text();
    let data: any = {};
    try { data = JSON.parse(text); } catch { /* handled below */ }
    if (!res.ok) throw new Error(data?.error || 'Could not generate that. Try again in a moment.');
    if (typeof data?.source !== 'string') {
      throw new Error(typeof data?.reply === 'string' ? data.reply : 'The assistant sent back something I could not read.');
    }
    return data.source;
  }

  // Returns the compiled script, or throws with the reason it failed.
  async function build(src: string): Promise<string> {
    const { compile } = await import('@sola-air-ui/compiler');
    const out = compile(src, { target: 'iife', exportName: 'GeneratedComponent', sourcemap: false, filename: 'generated.sola' });
    const problem = unbalanced(src);
    if (problem) throw new Error(`Unbalanced block: ${problem}`);
    return out.code;
  }

  // </script inside the code would end the tag early.
  const safe = (js: string) => js.replace(/<\/(script)/gi, '<\\/$1');

  async function frame(code: string): Promise<string> {
    const core = (await import('virtual:sola-core-iife')).default as string;
    return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>html{color-scheme:light}body{margin:0;padding:16px;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;background:#fff}</style>
</head><body><div id="root"></div>
<script>${safe(core)}<\/script>
<script>${safe(code)}<\/script>
<script>try{window.GeneratedComponent(document.getElementById('root'),{})}catch(e){document.body.textContent='This component could not run: '+e.message}<\/script>
</body></html>`;
  }

  async function generate(prompt = ask) {
    const text = prompt.trim();
    if (!text || busy) return;
    ask = text;
    phase = 'writing';
    message = 'Writing the component…';
    try {
      let src = await ask_model(text);
      let code = '';
      try {
        code = await build(src);
      } catch (first: any) {
        // One repair attempt, with the compiler's own message.
        phase = 'fixing';
        message = 'It did not compile. Asking for a fix…';
        src = await ask_model(text, src, String(first?.message ?? first));
        code = await build(src);
      }
      source = src;
      frameDoc = await frame(code);
      tab = 'preview';
      phase = 'done';
      message = '';
    } catch (e: any) {
      phase = 'error';
      message = String(e?.message ?? e) || 'Something went wrong. Try again.';
    }
  }

  function copySource() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(source);
      copied = true;
      setTimeout(() => (copied = false), 1800);
    }
  }
</script>

<div class="flex flex-col gap-6">
  <div class="bg-white/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
    <div class="flex flex-col gap-1">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="text-base sm:text-lg font-bold text-slate-950 dark:text-slate-50 tracking-tight">Generate a component</h3>
        <span class="text-xs font-mono font-semibold uppercase bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">Experimental</span>
      </div>
      <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-[68ch] leading-relaxed">
        Describe a small interface. A model writes a <code class="font-mono">.sola</code> file, the Sola compiler builds it in your browser, and it runs in a sealed frame that can't reach this page or the network.
      </p>
    </div>

    <form class="flex flex-col sm:flex-row gap-2" onsubmit={(e) => { e.preventDefault(); generate(); }}>
      <input
        bind:value={ask}
        maxlength="500"
        placeholder="e.g. a loan calculator with a rate slider"
        aria-label="What should it build?"
        class="flex-1 min-w-0 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
      />
      <button type="submit" disabled={busy || !ask.trim()} class="px-5 py-3 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer hover:bg-blue-500 transition-colors">
        {busy ? 'Working…' : 'Generate'}
      </button>
    </form>

    <div class="flex flex-wrap gap-2">
      {#each EXAMPLES as ex}
        <button type="button" onclick={() => generate(ex)} disabled={busy} class="text-xs text-left bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-2xl hover:border-blue-400 disabled:opacity-50 cursor-pointer transition-colors">
          {ex}
        </button>
      {/each}
    </div>

    {#if busy}
      <p role="status" class="text-xs sm:text-sm font-mono text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <span class="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>{message}
      </p>
    {:else if phase === 'error'}
      <p role="alert" class="text-xs sm:text-sm text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl px-4 py-2.5">{message}</p>
    {/if}
  </div>

  {#if phase === 'done'}
    <div class="bg-white/90 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-4 sm:p-6 shadow-xs flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-1 bg-slate-100 dark:bg-white/[0.08] p-1 rounded-full border border-slate-200 dark:border-white/[0.04]" role="group" aria-label="View">
          <button type="button" aria-pressed={tab === 'preview'} onclick={() => (tab = 'preview')} class="px-4 py-1.5 rounded-full text-xs font-mono font-medium cursor-pointer {tab === 'preview' ? 'bg-white dark:bg-white/10 text-slate-950 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}">Result</button>
          <button type="button" aria-pressed={tab === 'source'} onclick={() => (tab = 'source')} class="px-4 py-1.5 rounded-full text-xs font-mono font-medium cursor-pointer {tab === 'source' ? 'bg-white dark:bg-white/10 text-slate-950 dark:text-white shadow-sm' : 'text-slate-600 dark:text-slate-400'}">Source (.sola)</button>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" onclick={() => generate(ask)} class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 cursor-pointer">Try again</button>
          <button type="button" onclick={copySource} class="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-blue-400 cursor-pointer">{copied ? 'Copied' : 'Copy source'}</button>
        </div>
      </div>

      {#if tab === 'preview'}
        <iframe
          title="Generated component"
          sandbox="allow-scripts"
          srcdoc={frameDoc}
          class="w-full h-[26rem] rounded-2xl border border-slate-200 dark:border-white/10 bg-white"
        ></iframe>
        <p class="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2"><SolaIcons name="shell" size={14} /> Runs in a sealed frame with no network and no access to this page.</p>
      {:else}
        <pre class="bg-slate-950 text-slate-200 rounded-2xl p-4 sm:p-5 text-xs sm:text-sm font-mono leading-relaxed overflow-x-auto max-h-[32rem]">{source}</pre>
      {/if}
    </div>
  {/if}
</div>
