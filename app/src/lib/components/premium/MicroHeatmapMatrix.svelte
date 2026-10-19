<script lang="ts">
  import { onMount } from 'svelte';

  let { config = {} }: { config?: {
    rows?: number;
    cols?: number;
  }} = $props();

  const rows = config.rows || 30;
  const cols = config.cols || 80;
  
  let svgElement: SVGSVGElement;
  let pathElement: SVGPathElement;
  
  const cells = new Float32Array(rows * cols);
  for (let i = 0; i < cells.length; i++) {
    cells[i] = Math.random();
  }

  onMount(() => {
    let frameId: number;
    
    function tick() {
      const width = svgElement?.clientWidth || 800;
      const height = svgElement?.clientHeight || 300;
      
      const cellW = width / cols;
      const cellH = height / rows;
      
      let d = '';
      
      // Randomly update a few cells for live effect
      for(let i=0; i < 20; i++) {
        cells[Math.floor(Math.random() * cells.length)] = Math.random();
      }

      // We use a single path for rendering ALL cells that are above a certain threshold
      // For a heatmap, we can use 3 different paths (low, med, high) to apply 3 different colors,
      // which is incredibly faster than 2400 <rect> elements.
      
      let dHigh = '';
      let dMed = '';
      let dLow = '';

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const val = cells[r * cols + c];
          const x = c * cellW;
          const y = r * cellH;
          const pad = 1;
          
          const rectD = `M${x+pad},${y+pad} h${cellW-pad*2} v${cellH-pad*2} h-${cellW-pad*2} Z `;
          
          if (val > 0.7) dHigh += rectD;
          else if (val > 0.4) dMed += rectD;
          else if (val > 0.1) dLow += rectD;
        }
      }
      
      if (pathHigh) pathHigh.setAttribute('d', dHigh);
      if (pathMed) pathMed.setAttribute('d', dMed);
      if (pathLow) pathLow.setAttribute('d', dLow);

      frameId = requestAnimationFrame(tick);
    }
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });

  let pathHigh: SVGPathElement;
  let pathMed: SVGPathElement;
  let pathLow: SVGPathElement;
</script>

<div class="w-full h-full min-h-[300px] bg-slate-950 dark:bg-black/40 rounded-2xl overflow-hidden relative shadow-inner p-2">
  <svg bind:this={svgElement} class="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)]">
    <!-- Base empty grid -->
    <rect width="100%" height="100%" fill="rgba(255,255,255,0.02)" />
    
    <!-- Rendered via 3 single paths for ultra-high performance -->
    <path bind:this={pathLow} fill="#064e3b" />
    <path bind:this={pathMed} fill="#10b981" />
    <path bind:this={pathHigh} fill="#34d399" />
  </svg>
</div>
