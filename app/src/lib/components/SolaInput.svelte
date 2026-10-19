<script lang="ts">
  let {
    value = '',
    label = '',
    placeholder = '',
    type = 'text',
    error = '',
    hint = '',
    disabled = false,
    oninput = (_v: string) => {}
  } = $props<{
    value?: string;
    label?: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'url';
    error?: string;
    hint?: string;
    disabled?: boolean;
    oninput?: (value: string) => void;
  }>();

  const id = $props.id();
  let focused = $state(false);
  let hasValue = $derived(value.length > 0);
  // The label rests inside the field only while it would be the only text there.
  // With a placeholder, a value or focus, it sits on the border so the two never overlap.
  let floated = $derived(focused || hasValue || placeholder.length > 0);

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    oninput(value);
  }
  function clear() { value = ''; oninput(''); }
</script>

<div class="w-full {disabled ? 'opacity-50' : ''}">
  <div class="relative">
    {#if label}
      <label for={id} class="absolute left-3 transition-all duration-200 pointer-events-none
        {floated
          ? '-top-2 text-xs font-semibold px-1 bg-white dark:bg-[#0f172a] z-10'
          : 'top-2.5 text-sm'}
        {error ? 'text-rose-600 dark:text-rose-400' : focused ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}">
        {label}
      </label>
    {/if}
    <input
      {id}
      {type}
      {value}
      {placeholder}
      {disabled}
      aria-invalid={error ? 'true' : undefined}
      aria-describedby={error || hint ? `${id}-note` : undefined}
      oninput={handleInput}
      onfocus={() => focused = true}
      onblur={() => focused = false}
      class="w-full px-3 py-2.5 text-sm rounded-xl border transition-all outline-none
        bg-white dark:bg-white/5 text-slate-900 dark:text-white
        placeholder:text-slate-500 dark:placeholder:text-slate-400
        {error
          ? 'border-rose-400 dark:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
          : focused
            ? 'border-blue-500 dark:border-blue-500 ring-2 ring-blue-500/20'
            : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'}
"
    />
    {#if hasValue && !disabled}
      <button
        type="button"
        onclick={clear}
        class="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
        aria-label="Clear input"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    {/if}
  </div>
  {#if error}
    <p id="{id}-note" class="mt-1.5 text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1 max-w-[68ch]">
      <svg class="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
      {error}
    </p>
  {:else if hint}
    <p id="{id}-note" class="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-[68ch]">{hint}</p>
  {/if}
</div>
