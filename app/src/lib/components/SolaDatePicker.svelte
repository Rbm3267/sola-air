<script lang="ts">
  type DateRange = { start: string; end: string };

  let {
    value = '',
    range = false,
    rangeValue = { start: '', end: '' },
    label = 'Select Date',
    placeholder = 'Pick a date...',
    disabled = false,
    onchange = (_v: string | DateRange) => {}
  } = $props<{
    value?: string;
    range?: boolean;
    rangeValue?: DateRange;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    onchange?: (val: string | DateRange) => void;
  }>();

  let isOpen = $state(false);
  let currentMonth = $state(new Date().getMonth());
  let currentYear = $state(new Date().getFullYear());

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  let daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());
  let firstDayOfWeek = $derived(new Date(currentYear, currentMonth, 1).getDay());

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear--;
    } else {
      currentMonth--;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear++;
    } else {
      currentMonth++;
    }
  }

  function formatDate(year: number, month: number, day: number): string {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  }

  function selectDate(day: number) {
    const formatted = formatDate(currentYear, currentMonth, day);
    if (!range) {
      value = formatted;
      onchange(formatted);
      isOpen = false;
    } else {
      if (!rangeValue.start || (rangeValue.start && rangeValue.end)) {
        rangeValue = { start: formatted, end: '' };
      } else {
        if (new Date(formatted) < new Date(rangeValue.start)) {
          rangeValue = { start: formatted, end: rangeValue.start };
        } else {
          rangeValue = { start: rangeValue.start, end: formatted };
        }
        onchange(rangeValue);
        isOpen = false;
      }
    }
  }

  function isSelected(day: number): boolean {
    const dateStr = formatDate(currentYear, currentMonth, day);
    if (!range) return value === dateStr;
    return rangeValue.start === dateStr || rangeValue.end === dateStr;
  }

  function isInRange(day: number): boolean {
    if (!range || !rangeValue.start || !rangeValue.end) return false;
    const dateStr = formatDate(currentYear, currentMonth, day);
    return dateStr > rangeValue.start && dateStr < rangeValue.end;
  }

  function quickSelect(preset: 'today' | '7days' | '30days') {
    const today = new Date();
    const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === 'today') {
      if (range) {
        rangeValue = { start: todayStr, end: todayStr };
        onchange(rangeValue);
      } else {
        value = todayStr;
        onchange(value);
      }
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      const pastStr = formatDate(past.getFullYear(), past.getMonth(), past.getDate());
      rangeValue = { start: pastStr, end: todayStr };
      onchange(rangeValue);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(today.getDate() - 30);
      const pastStr = formatDate(past.getFullYear(), past.getMonth(), past.getDate());
      rangeValue = { start: pastStr, end: todayStr };
      onchange(rangeValue);
    }
    isOpen = false;
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="relative inline-block w-full max-w-xs text-left" onclick={(e) => e.stopPropagation()}>
  {#if label}
    <label class="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
  {/if}

  <button
    type="button"
    onclick={() => !disabled && (isOpen = !isOpen)}
    class="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-white/20 transition-all cursor-pointer shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 {disabled ? 'opacity-50 pointer-events-none' : ''}"
  >
    <div class="flex items-center gap-2.5 truncate">
      <svg class="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      <span class={(!value && !rangeValue.start) ? 'text-slate-400 dark:text-slate-500' : ''}>
        {#if range}
          {rangeValue.start && rangeValue.end ? `${rangeValue.start} → ${rangeValue.end}` : rangeValue.start ? `${rangeValue.start} → ...` : placeholder}
        {:else}
          {value || placeholder}
        {/if}
      </span>
    </div>
    <svg class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  </button>

  {#if isOpen}
    <div class="absolute z-50 mt-2 p-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-72 animate-[fadeSlide_150ms_ease-out]">
      <!-- Quick Presets -->
      <div class="flex items-center gap-1 mb-3 pb-3 border-b border-slate-100 dark:border-white/5">
        <button onclick={() => quickSelect('today')} class="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors">Today</button>
        {#if range}
          <button onclick={() => quickSelect('7days')} class="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors">Last 7d</button>
          <button onclick={() => quickSelect('30days')} class="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-500/10 hover:text-blue-600 transition-colors">Last 30d</button>
        {/if}
      </div>

      <!-- Month / Year Header -->
      <div class="flex items-center justify-between mb-3">
        <button type="button" aria-label="Previous month" onclick={prevMonth} class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <span class="text-xs font-semibold text-slate-900 dark:text-white">
          {months[currentMonth]} {currentYear}
        </span>
        <button type="button" aria-label="Next month" onclick={nextMonth} class="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 transition-colors">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Days Grid -->
      <div class="grid grid-cols-7 gap-1 text-center text-xs">
        {#each daysOfWeek as day}
          <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 py-1">{day}</span>
        {/each}

        {#each Array(firstDayOfWeek) as _}
          <div></div>
        {/each}

        {#each Array(daysInMonth) as _, i}
          {@const dayNum = i + 1}
          {@const selected = isSelected(dayNum)}
          {@const inRange = isInRange(dayNum)}
          <button
            type="button"
            onclick={() => selectDate(dayNum)}
            class="h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer
              {selected ? 'bg-blue-500 text-slate-950 font-semibold shadow-xs' : ''}
              {inRange ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400' : ''}
              {!selected && !inRange ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5' : ''}"
          >
            {dayNum}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  @keyframes fadeSlide {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
