<script lang="ts">
  let {
    src = '',
    alt = '',
    initials = '',
    size = 'default',
    status = 'none',
    shape = 'circle'
  } = $props<{
    src?: string;
    alt?: string;
    initials?: string;
    size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
    status?: 'online' | 'offline' | 'busy' | 'away' | 'none';
    shape?: 'circle' | 'rounded';
  }>();

  let imgError = $state(false);

  const sizeMap: Record<string, string> = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    default: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base'
  };

  const statusColors: Record<string, string> = {
    online: 'bg-blue-500',
    offline: 'bg-slate-400',
    busy: 'bg-rose-500',
    away: 'bg-amber-500',
    none: ''
  };

  const statusSize: Record<string, string> = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    default: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-3.5 h-3.5 border-2'
  };

  const bgColors = ['bg-sky-700', 'bg-blue-600', 'bg-violet-600', 'bg-amber-700', 'bg-rose-600', 'bg-indigo-600'];

  function hashColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return bgColors[Math.abs(hash) % bgColors.length];
  }
</script>

<div class="relative inline-flex shrink-0">
  <div class="{sizeMap[size]} {shape === 'circle' ? 'rounded-full' : 'rounded-lg'} overflow-hidden flex items-center justify-center font-bold text-white select-none
    {src && !imgError ? '' : hashColor(initials || alt || 'U')}">
    {#if src && !imgError}
      <img
        {src}
        {alt}
        class="w-full h-full object-cover"
        onerror={() => imgError = true}
      />
    {:else}
      {(initials || alt || 'U').slice(0, 2).toUpperCase()}
    {/if}
  </div>

  {#if status !== 'none'}
    <span class="absolute bottom-0 right-0 {statusSize[size]} {statusColors[status]} rounded-full border-white dark:border-[#0f172a] ring-0"></span>
  {/if}
</div>
