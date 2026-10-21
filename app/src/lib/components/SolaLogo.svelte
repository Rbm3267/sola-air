<script lang="ts">
  let { 
    size = 'sm', 
    interactive = true,
    spinning = false,
    showGlow = true,
    class: className = ''
  } = $props<{
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero' | number;
    interactive?: boolean;
    spinning?: boolean;
    showGlow?: boolean;
    class?: string;
  }>();

  const sizeClasses: Record<string, string> = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
    hero: 'w-28 h-28 md:w-36 md:h-36'
  };

  let isNumeric = $derived(typeof size === 'number');
  let dimensionStyle = $derived(isNumeric ? `width: ${size}px; height: ${size}px;` : '');
  let resolvedClass = $derived(!isNumeric ? (sizeClasses[size as string] || 'w-8 h-8') : '');
  // Rendered width in CSS px, so the browser picks the smallest resized logo that is sharp at this size.
  const sizePx: Record<string, string> = { xs: '24px', sm: '32px', md: '40px', lg: '56px', xl: '80px', hero: '(min-width: 768px) 144px, 112px' };
  let sizes = $derived(isNumeric ? `${size}px` : (sizePx[size as string] || '32px'));
</script>

<div class="relative inline-flex items-center justify-center select-none shrink-0 group/logo {interactive ? 'cursor-pointer' : ''} {className}">
  
  <!-- Backlit Aurora Ambient Glow -->
  {#if showGlow}
    <div class="absolute -inset-1.5 rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-violet-500 opacity-20 group-hover/logo:opacity-40 blur-md transition-all duration-500 pointer-events-none"></div>
  {/if}

  <!-- Solar Logo Image -->
  <div 
    class="relative z-10 flex items-center justify-center transition-transform duration-500 ease-out transform-gpu {spinning ? 'animate-sola-spin' : ''} group-hover/logo:scale-105"
  >
    <img 
      src="/logo-128.webp"
      srcset="/logo-64.webp 64w, /logo-128.webp 128w, /logo-288.webp 288w"
      {sizes}
      width="128"
      height="128"
      alt="Sola Sun Logo"
      style={dimensionStyle}
      class="{resolvedClass} object-contain drop-shadow-[0_2px_8px_rgba(14,165,233,0.3)]"
    />
  </div>
</div>

<style>
  @keyframes sola-spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .animate-sola-spin {
    animation: sola-spin 32s linear infinite;
  }

  .group\/logo:hover .animate-sola-spin {
    animation-duration: 12s;
  }
</style>
