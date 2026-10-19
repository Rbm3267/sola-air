<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    value = $bindable(''),
    label = '',
    placeholder = '',
    rows = 4,
    maxLength,
    error = '',
    hint = '',
    disabled = false,
    resize = 'vertical',
    autoResize = false,
    id = `sola-textarea-${Math.random().toString(36).substring(2, 9)}`,
    oninput = () => {},
    children
  }: {
    value?: string;
    label?: string;
    placeholder?: string;
    rows?: number;
    maxLength?: number;
    error?: string;
    hint?: string;
    disabled?: boolean;
    resize?: 'none' | 'vertical' | 'both';
    autoResize?: boolean;
    id?: string;
    oninput?: (e: Event & { currentTarget: HTMLTextAreaElement }) => void;
    children?: Snippet;
  } = $props();

  let textareaRef = $state<HTMLTextAreaElement | null>(null);

  function adjustHeight() {
    if (autoResize && textareaRef) {
      textareaRef.style.height = 'auto';
      textareaRef.style.height = `${textareaRef.scrollHeight}px`;
    }
  }

  $effect(() => {
    if (autoResize && value !== undefined) {
      adjustHeight();
    }
  });

  function handleInput(e: Event & { currentTarget: HTMLTextAreaElement }) {
    value = e.currentTarget.value;
    if (autoResize) {
      adjustHeight();
    }
    oninput(e);
  }

  const resizeClassMap: Record<string, string> = {
    none: 'resize-none',
    vertical: 'resize-y',
    both: 'resize'
  };

  let charCount = $derived((value ?? '').length);
  let isNearLimit = $derived(maxLength !== undefined && charCount >= maxLength * 0.9);
  let isAtLimit = $derived(maxLength !== undefined && charCount >= maxLength);
</script>

<div class="w-full flex flex-col gap-1.5 font-sans">
  {#if label}
    <div class="flex items-center justify-between">
      <label
        for={id}
        class="text-xs font-semibold text-slate-700 dark:text-slate-300 select-none cursor-pointer"
      >
        {label}
      </label>
      {#if maxLength !== undefined}
        <span
          class="text-xs font-mono transition-colors duration-150 {isAtLimit
            ? 'text-rose-700 dark:text-rose-400 font-semibold'
            : isNearLimit
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'}"
        >
          {charCount}/{maxLength}
        </span>
      {/if}
    </div>
  {/if}

  <div class="relative w-full">
    <textarea
      bind:this={textareaRef}
      {id}
      {rows}
      maxlength={maxLength}
      {placeholder}
      {disabled}
      value={value}
      oninput={handleInput}
      aria-invalid={Boolean(error)}
      aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      class="w-full px-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-white/5 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-150 outline-none
        {autoResize ? 'resize-none overflow-hidden' : resizeClassMap[resize] || 'resize-y'}
        {error
          ? 'border-rose-500 dark:border-rose-500/80 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
          : 'border-slate-200 dark:border-white/10 focus:border-slate-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-slate-900/5 dark:focus:ring-blue-500/20'}
        {disabled
          ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-white/[0.02] select-none'
          : 'hover:border-slate-300 dark:hover:border-white/20'}"
    ></textarea>
  </div>

  <div class="flex items-start justify-between min-h-[18px] px-0.5">
    {#if error}
      <p
        id="{id}-error"
        class="text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1 font-medium animate-[fadeIn_150ms_ease-out]"
        role="alert"
      >
        <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{error}</span>
      </p>
    {:else if hint}
      <p id="{id}-hint" class="text-xs text-slate-500 dark:text-slate-400">
        {hint}
      </p>
    {:else}
      <span></span>
    {/if}

    {#if !label && maxLength !== undefined}
      <span
        class="text-xs font-mono ml-auto transition-colors duration-150 {isAtLimit
          ? 'text-rose-500 font-semibold'
          : isNearLimit
            ? 'text-amber-500 dark:text-amber-400'
            : 'text-slate-500 dark:text-slate-400'}"
      >
        {charCount}/{maxLength}
      </span>
    {/if}
  </div>

  {@render children?.()}
</div>
