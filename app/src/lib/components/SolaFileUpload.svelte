<script lang="ts">
  let {
    accept = '.json, .csv, .ts, .svg',
    maxSizeMb = 10,
    multiple = false,
    onupload = (_files: File[]) => {}
  } = $props<{
    accept?: string;
    maxSizeMb?: number;
    multiple?: boolean;
    onupload?: (files: File[]) => void;
  }>();

  let isDragging = $state(false);
  let files = $state<Array<{ name: string; size: string; progress: number }>>([
    { name: 'telemetry_stream.json', size: '2.4 MB', progress: 100 },
    { name: 'schema_manifest.ts', size: '48 KB', progress: 70 }
  ]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function handleFileDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      const added = Array.from(e.dataTransfer.files).map(f => ({
        name: f.name,
        size: formatBytes(f.size),
        progress: 100
      }));
      files = [...files, ...added];
      onupload(Array.from(e.dataTransfer.files));
    }
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }
</script>

<div class="w-full space-y-4">
  <!-- Drop Area -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    ondragover={(e) => { e.preventDefault(); isDragging = true; }}
    ondragleave={() => (isDragging = false)}
    ondrop={handleFileDrop}
    class="relative rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none {isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 scale-[1.01]' : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 bg-slate-50/50 dark:bg-white/[0.02]'}"
  >
    <input
      type="file"
      aria-label="Upload files"
      {accept}
      {multiple}
      class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
      onchange={(e) => {
        const target = e.target as HTMLInputElement;
        if (target.files) {
          const added = Array.from(target.files).map(f => ({
            name: f.name,
            size: formatBytes(f.size),
            progress: 100
          }));
          files = [...files, ...added];
          onupload(Array.from(target.files));
        }
      }}
    />

    <div class="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-3">
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    </div>

    <h4 class="text-sm font-semibold text-slate-900 dark:text-white">
      Click to upload or drag & drop files
    </h4>
    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[68ch]">
      Supports {accept} (Max {maxSizeMb}MB)
    </p>
  </div>

  <!-- Uploaded Files List -->
  {#if files.length > 0}
    <div class="space-y-2">
      {#each files as file, idx}
        <div class="flex items-center justify-between p-3 bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-xs">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 shrink-0">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[68ch]">{file.name}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[68ch]">{file.size}</p>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <div class="w-16 bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div class="bg-blue-500 h-full rounded-full" style="width: {file.progress}%"></div>
            </div>
            <button
              type="button"
              onclick={() => removeFile(idx)}
              aria-label="Remove {file.name}"
              class="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-rose-500 transition-colors"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M18 6 6 18"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
