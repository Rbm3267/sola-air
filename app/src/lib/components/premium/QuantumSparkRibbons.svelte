<script lang="ts">
  import { onMount } from 'svelte';

  let { config = {} }: { config?: {
    streams?: number;
    pointsPerStream?: number;
  }} = $props();

  const streamsCount = config.streams || 3;
  const pointsCount = config.pointsPerStream || 50;
  
  let svgElement: SVGSVGElement;
  let paths: SVGPathElement[] = [];
  
  // Data matrix: streams x points
  const data = Array.from({ length: streamsCount }, () => 
    Array.from({ length: pointsCount }, () => Math.random() * 100)
  );

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];

  onMount(() => {
    let frameId: number;
    let offset = 0;

    function tick() {
      offset += 0.05;
      const width = svgElement?.clientWidth || 800;
      const height = svgElement?.clientHeight || 400;
      const dx = width / (pointsCount - 1);

      for (let s = 0; s < streamsCount; s++) {
        // Shift data to simulate scrolling
        data[s].shift();
        // Add new point with some noise
        const last = data[s][data[s].length - 1];
        data[s].push(Math.max(0, Math.min(100, last + (Math.random() - 0.5) * 20)));

        // Generate SVG Path using Catmull-Rom or simple bezier
        let d = `M 0 ${height - (data[s][0] / 100) * height}`;
        for (let p = 1; p < pointsCount; p++) {
          const x = p * dx;
          const y = height - (data[s][p] / 100) * height;
          // Add a bit of sine wave for extra ribbon effect based on offset
          const ribbonY = y + Math.sin(offset + p * 0.2 + s) * 20;
          d += ` L ${x} ${ribbonY}`;
        }
        
        if (paths[s]) {
          paths[s].setAttribute('d', d);
        }
      }

      frameId = requestAnimationFrame(tick);
    }
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  });
</script>

<div class="w-full h-full min-h-[300px] bg-slate-950 dark:bg-black/40 rounded-2xl overflow-hidden relative shadow-inner">
  <svg bind:this={svgElement} class="absolute inset-0 w-full h-full">
    <defs>
      <filter id="quantum-glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
    
    {#each Array(streamsCount) as _, s}
      <path
        bind:this={paths[s]}
        fill="none"
        stroke={colors[s % colors.length]}
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
        filter="url(#quantum-glow)"
        opacity="0.8"
      />
    {/each}
  </svg>
</div>
