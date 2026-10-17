<script lang="ts">
  type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

  let {
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    label = '',
    onclick = () => {},
    children
  } = $props<{
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    label?: string;
    onclick?: (e: MouseEvent) => void;
    children?: any;
  }>();

  let isPressed = $state(false);

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
    default: 'px-4 py-2.5 text-sm gap-2 rounded-xl',
    lg: 'px-6 py-3 text-sm gap-2.5 rounded-xl',
    icon: 'w-9 h-9 rounded-xl flex items-center justify-center'
  };

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-slate-900 dark:bg-blue-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-blue-400 shadow-sm',
    secondary: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10',
    ghost: 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5',
    destructive: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    outline: 'bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/15 hover:bg-slate-50 dark:hover:bg-white/5'
  };
</script>

<button
  class="relative inline-flex items-center justify-center font-semibold transition-all duration-150 select-none cursor-pointer
    {sizeClasses[size]} {variantClasses[variant]}
    {disabled || loading ? 'opacity-50 pointer-events-none' : ''}
    {isPressed ? 'scale-[0.97]' : 'scale-100'}"
  {disabled}
  onclick={onclick}
  onmousedown={() => isPressed = true}
  onmouseup={() => isPressed = false}
  onmouseleave={() => isPressed = false}
  aria-label={label || undefined}
  aria-busy={loading}
>
  {#if loading}
    <svg class="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3"/>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  {/if}
  {#if label}
    <span>{label}</span>
  {/if}
  {@render children?.()}
</button>
