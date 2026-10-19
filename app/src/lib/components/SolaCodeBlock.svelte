<script lang="ts">
  let {
    code = '',
    language = 'typescript',
    title = '',
    showLineNumbers = true,
    copyable = true
  } = $props<{
    code?: string;
    language?: string;
    title?: string;
    showLineNumbers?: boolean;
    copyable?: boolean;
  }>();

  let copied = $state(false);
  let copyTimeout: ReturnType<typeof setTimeout>;

  const lines = $derived(code ? code.split('\n') : ['']);

  // `.sola` sources get the Sola file icon beside their name, like an editor tab.
  const isSola = $derived(language === 'sola' || title.endsWith('.sola'));

  function escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function highlightLine(rawLine: string): string {
    if (!rawLine) return '&nbsp;';

    // Tokenizer matching:
    // 1: Comments (//... or #...)
    // 2: Strings ("..." or '...' or `...`)
    // 3: Keywords (const, let, var, function, return, if, else, etc.)
    // 4: Types & Literals (true, false, null, undefined, string, number, etc.)
    // 5: Numbers (integers, floats)
    const regex = /(\/\/[^\n]*|#[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|import|export|from|default|class|extends|new|async|await|try|catch|finally|throw|switch|case|break|continue|typeof|instanceof|interface|type)\b)|(\b(?:true|false|null|undefined|string|number|boolean|any|void|never|unknown|Promise|Array|Record|Object|Function|Set|Map)\b)|(\b\d+(?:\.\d+)?\b)/g;

    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(rawLine)) !== null) {
      if (match.index > lastIndex) {
        result += escapeHtml(rawLine.slice(lastIndex, match.index));
      }

      if (match[1]) {
        // Comments -> slate-500
        result += `<span class="text-slate-500 dark:text-slate-400 italic">${escapeHtml(match[0])}</span>`;
      } else if (match[2]) {
        // Strings -> amber-300
        result += `<span class="text-amber-700 dark:text-amber-300">${escapeHtml(match[0])}</span>`;
      } else if (match[3]) {
        // Keywords -> emerald-400
        result += `<span class="text-blue-600 dark:text-blue-400 font-medium">${escapeHtml(match[0])}</span>`;
      } else if (match[4]) {
        // Types/Literals -> violet-400
        result += `<span class="text-violet-600 dark:text-violet-400">${escapeHtml(match[0])}</span>`;
      } else if (match[5]) {
        // Numbers -> sky-400
        result += `<span class="text-sky-600 dark:text-sky-400">${escapeHtml(match[0])}</span>`;
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < rawLine.length) {
      result += escapeHtml(rawLine.slice(lastIndex));
    }

    return result;
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      copied = true;
      clearTimeout(copyTimeout);
      copyTimeout = setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy code to clipboard: ', err);
    }
  }
</script>

<div class="relative w-full rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-[#0a0f1a] overflow-hidden shadow-xs">
  <!-- Header Bar -->
  <div class="flex items-center justify-between px-4 py-2.5 bg-slate-100/70 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10 select-none">
    <div class="flex items-center gap-2.5">
      {#if isSola}
        <img src="/sola-file-icon.png" alt="" width="16" height="16" class="w-4 h-4 shrink-0" />
      {/if}
      {#if title}
        <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">
          {title}
        </span>
      {/if}
      {#if language}
        <span class="px-2 py-0.5 text-xs font-mono font-medium rounded-md uppercase tracking-wider bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-400">
          {language}
        </span>
      {/if}
    </div>

    {#if copyable}
      <button
        type="button"
        onclick={handleCopy}
        class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10"
        aria-label="Copy code to clipboard"
      >
        {#if copied}
          <svg class="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <span class="text-blue-600 dark:text-blue-400">Copied!</span>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>Copy</span>
        {/if}
      </button>
    {/if}
  </div>

  <!-- Code Block Body with Horizontal Scroll -->
  <div class="p-4 overflow-x-auto flex font-mono text-xs sm:text-sm leading-6">
    <!-- Optional Line Numbers -->
    {#if showLineNumbers}
      <div
        class="select-none pr-4 text-right text-slate-400 dark:text-slate-600 font-mono text-xs sm:text-sm leading-6 border-r border-slate-200 dark:border-white/10 flex-shrink-0"
        aria-hidden="true"
      >
        {#each lines as _, i}
          <div>{i + 1}</div>
        {/each}
      </div>
    {/if}

    <!-- Code Content Lines -->
    <div class="flex-1 min-w-0 {showLineNumbers ? 'pl-4' : ''} font-mono text-xs sm:text-sm leading-6 text-slate-800 dark:text-slate-200">
      {#each lines as line}
        <div class="whitespace-pre">{@html highlightLine(line)}</div>
      {/each}
    </div>
  </div>
</div>
