<script lang="ts">
  // The command bar used by the playground and by Studio's AI field: a prompt
  // glyph, a text field, a microphone and a send button. One component so the two
  // cannot drift apart. Voice uses the browser's speech recognition where there is
  // one; when speech ends with text in the field, it sends.
  import { onMount } from 'svelte';

  let {
    value = $bindable(''),
    busy = false,
    placeholder = '',
    inputLabel,
    submitLabel,
    onsubmit
  } = $props<{
    value?: string;
    busy?: boolean;
    placeholder?: string;
    /** Accessible name of the text field. */
    inputLabel: string;
    /** Accessible name and tooltip of the send button. */
    submitLabel: string;
    onsubmit: (text: string) => void;
  }>();

  let isListening = $state(false);
  let speechSupported = $state(false);
  let speechError = $state('');
  let recognition: any = null;

  onMount(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    speechSupported = true;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => { isListening = true; };
    recognition.onresult = (event: any) => {
      value = Array.from(event.results).map((result: any) => result[0].transcript).join('');
    };
    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      isListening = false;
    };
    recognition.onend = () => {
      isListening = false;
      if (value.trim()) send();
    };
    return () => {
      try { recognition?.abort(); } catch { /* not running */ }
    };
  });

  function toggleSpeech() {
    if (!speechSupported || !recognition) {
      speechError = 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.';
      return;
    }
    speechError = '';
    if (isListening) {
      recognition.stop();
      isListening = false;
    } else {
      value = '';
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  }

  function send() {
    const text = value.trim();
    if (!text || busy) return;
    onsubmit(text);
  }
</script>

<div class="max-w-2xl mx-auto w-full">
  <div class="bg-white dark:bg-white/[0.02] backdrop-blur-3xl border {isListening ? 'border-rose-400 shadow-[0_0_30px_rgba(244,63,94,0.25)]' : 'border-slate-200 dark:border-white/[0.04] shadow-[0_12px_40px_rgba(15,23,42,0.06)]'} rounded-2xl p-2 transition-all duration-300 relative">
    <form class="flex items-center gap-2 sm:gap-3 w-full relative z-10" onsubmit={(e) => { e.preventDefault(); send(); }}>
      <div class="pl-3 sm:pl-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true">
        {#if busy}
          <svg class="w-5 h-5 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/></svg>
        {:else if isListening}
          <div class="flex items-center gap-1">
            <span class="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce"></span>
            <span class="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:0.15s]"></span>
            <span class="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:0.3s]"></span>
          </div>
        {:else}
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
        {/if}
      </div>

      <input
        type="text"
        bind:value
        aria-label={inputLabel}
        placeholder={isListening ? 'Listening... speak now' : placeholder}
        style="outline: none !important; box-shadow: none !important; border: none !important;"
        class="flex-1 min-w-0 bg-transparent py-4 px-2 text-slate-900 dark:text-white text-sm sm:text-base font-medium placeholder-slate-400 border-0 outline-none focus:outline-none focus:ring-0 appearance-none"
      />

      <button
        type="button"
        onclick={toggleSpeech}
        aria-label="Voice intent recognition"
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl transition-all flex items-center justify-center cursor-pointer shrink-0 {isListening ? 'bg-rose-500 text-white shadow-md animate-pulse' : 'bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-slate-300 hover:bg-slate-200'}"
        title={isListening ? 'Stop listening' : 'Speak intent via microphone'}
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" x2="12" y1="19" y2="22"/>
        </svg>
      </button>

      <button
        type="submit"
        disabled={busy || !value.trim()}
        aria-label={submitLabel}
        title={submitLabel}
        style={!busy && value.trim() ? 'background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: #ffffff !important;' : ''}
        class="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl font-bold transition-all active:scale-[0.97] disabled:bg-slate-100 dark:disabled:bg-white/[0.08] disabled:text-slate-500 dark:disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center shadow-md shrink-0 cursor-pointer"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>
    </form>
  </div>
  {#if speechError}
    <p role="alert" class="mt-2 text-center text-xs sm:text-sm text-rose-700 dark:text-rose-300">{speechError}</p>
  {/if}
</div>
