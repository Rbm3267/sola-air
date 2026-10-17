<script lang="ts">
  let {
    name = 'spark',
    size = 18,
    class: className = ''
  } = $props<{
    name?: 'sentinel' | 'bus' | 'shell' | 'dial' | 'spark' | 'code' | 'layers';
    size?: number;
    class?: string;
  }>();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  aria-hidden="true"
  class="shrink-0 {className}"
>
  <defs>
    <linearGradient id="sola-icon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38BDF8" />
      <stop offset="50%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#9333EA" />
    </linearGradient>
  </defs>

  {#if name === 'sentinel'}
    <path d="M3 12C5.5 7.5 8.5 7.5 12 12C15.5 16.5 18.5 16.5 21 12" stroke="url(#sola-icon-grad)" stroke-width="2" stroke-linecap="round" />
    <path d="M3 16C6.5 12.5 9.5 12.5 12 15.5C14.5 18.5 17.5 18.5 21 15" stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 3" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="url(#sola-icon-grad)" stroke-width="2" />
  {:else if name === 'bus'}
    <rect x="3" y="4" width="7.5" height="7.5" rx="2.2" fill="rgba(56,189,248,0.14)" stroke="url(#sola-icon-grad)" stroke-width="1.8" />
    <rect x="13.5" y="12.5" width="7.5" height="7.5" rx="2.2" fill="rgba(147,51,234,0.14)" stroke="url(#sola-icon-grad)" stroke-width="1.8" />
    <path d="M10.5 7.8H14.5C16.2 7.8 17.2 8.8 17.2 10.5V12.5" stroke="url(#sola-icon-grad)" stroke-width="1.8" stroke-linecap="round" />
    <path d="M13.5 16.2H9.5C7.8 16.2 6.8 15.2 6.8 13.5V11.5" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" />
  {:else if name === 'shell'}
    <rect x="2.5" y="4" width="19" height="16" rx="4" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="3 2.5" />
    <rect x="11" y="7" width="8.5" height="10" rx="2.5" fill="rgba(37,99,235,0.14)" stroke="url(#sola-icon-grad)" stroke-width="1.8" />
    <circle cx="7" cy="14.5" r="2" fill="url(#sola-icon-grad)" />
  {:else if name === 'dial'}
    <circle cx="12" cy="12" r="8.5" fill="rgba(56,189,248,0.10)" stroke="url(#sola-icon-grad)" stroke-width="1.8" stroke-dasharray="38 16" stroke-linecap="round" />
    <path d="M12 12L16.2 8.2" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" />
    <circle cx="12" cy="12" r="2.2" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.8" />
  {:else if name === 'code'}
    <path d="M8.5 8L4 12L8.5 16" stroke="url(#sola-icon-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M15.5 8L20 12L15.5 16" stroke="url(#sola-icon-grad)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M13.2 6.5L10.8 17.5" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" />
  {:else if name === 'layers'}
    <path d="M12 3.5L20.5 8L12 12.5L3.5 8L12 3.5Z" fill="rgba(56,189,248,0.14)" stroke="url(#sola-icon-grad)" stroke-width="1.8" stroke-linejoin="round" />
    <path d="M3.5 12.5L12 17L20.5 12.5" stroke="url(#sola-icon-grad)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M3.5 16.5L12 21L20.5 16.5" stroke="#38BDF8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  {:else}
    <path d="M12 3C12.8 7.5 16.5 11.2 21 12C16.5 12.8 12.8 16.5 12 21C11.2 16.5 7.5 12.8 3 12C7.5 11.2 11.2 7.5 12 3Z" fill="rgba(56,189,248,0.18)" stroke="url(#sola-icon-grad)" stroke-width="1.8" stroke-linejoin="round" />
  {/if}
</svg>
