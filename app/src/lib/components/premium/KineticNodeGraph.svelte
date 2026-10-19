<script lang="ts">
  import { onMount } from 'svelte';

  interface NodeData {
    id: string;
    group: number;
    radius: number;
    color: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
  }

  interface LinkData {
    source: string;
    target: string;
    value: number;
  }

  let { config = {} }: { config?: {
    nodes?: any[];
    links?: any[];
    width?: number;
    height?: number;
  }} = $props();

  // Mock data
  const numNodes = 80;
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
  const nodes: NodeData[] = (config.nodes || Array.from({ length: numNodes }, (_, i) => ({
    id: `n${i}`,
    group: Math.floor(Math.random() * 5),
    radius: Math.random() * 4 + 2,
    color: colors[Math.floor(Math.random() * 5)],
    x: Math.random() * 800,
    y: Math.random() * 600,
    vx: 0,
    vy: 0
  })));

  const links: LinkData[] = config.links || [];
  if (!config.links) {
    for (let i = 0; i < numNodes * 1.2; i++) {
      links.push({
        source: `n${Math.floor(Math.random() * numNodes)}`,
        target: `n${Math.floor(Math.random() * numNodes)}`,
        value: Math.random() * 2 + 0.5
      });
    }
  }

  // Pre-resolve links for O(1) access during physics loop
  const resolvedLinks = links.map(link => {
    return {
      source: nodes.find(n => n.id === link.source)!,
      target: nodes.find(n => n.id === link.target)!,
      value: link.value
    };
  }).filter(l => l.source && l.target);

  let svgElement: SVGSVGElement;
  let nodeElements: SVGCircleElement[] = [];
  let linkElements: SVGLineElement[] = [];

  let mouseX = -1000;
  let mouseY = -1000;
  let isHovering = false;
  let width = 800;
  let height = 600;

  // Physics constants
  const DAMPING = 0.85;
  const REPULSION = 150;
  const ATTRACTION = 0.02;
  const CENTER_GRAVITY = 0.03;

  onMount(() => {
    if (svgElement) {
      width = svgElement.clientWidth;
      height = svgElement.clientHeight;
    }

    let frameId: number;
    function tick() {
      // 1. Link Attraction (Hooke's Law)
      for (const link of resolvedLinks) {
        const dx = link.target.x - link.source.x;
        const dy = link.target.y - link.source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 30) * ATTRACTION;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        
        link.source.vx += fx;
        link.source.vy += fy;
        link.target.vx -= fx;
        link.target.vy -= fy;
      }

      // 2. Node Repulsion (Coulomb) - O(N^2) naive but fine for <200 nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy;
          if (distSq > 0 && distSq < 10000) {
            const dist = Math.sqrt(distSq);
            const force = REPULSION / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // 3. Center Gravity & Ambient Mouse Force
      const cx = width / 2;
      const cy = height / 2;
      for (const node of nodes) {
        // Center
        node.vx += (cx - node.x) * CENTER_GRAVITY;
        node.vy += (cy - node.y) * CENTER_GRAVITY;

        // Mouse Magnetism
        if (isHovering) {
          const dx = node.x - mouseX;
          const dy = node.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120 && dist > 0) {
            node.vx -= (dx / dist) * 0.5 * (120 - dist) * 0.05;
            node.vy -= (dy / dist) * 0.5 * (120 - dist) * 0.05;
          }
        }

        // Apply velocity
        node.vx *= DAMPING;
        node.vy *= DAMPING;
        node.x += node.vx;
        node.y += node.vy;
      }

      // 4. Zero-VDOM DOM Mutation
      for (let i = 0; i < resolvedLinks.length; i++) {
        const el = linkElements[i];
        const link = resolvedLinks[i];
        if (el) {
          el.setAttribute('x1', String(link.source.x));
          el.setAttribute('y1', String(link.source.y));
          el.setAttribute('x2', String(link.target.x));
          el.setAttribute('y2', String(link.target.y));
        }
      }
      for (let i = 0; i < nodes.length; i++) {
        const el = nodeElements[i];
        const node = nodes[i];
        if (el) {
          el.setAttribute('cx', String(node.x));
          el.setAttribute('cy', String(node.y));
        }
      }

      frameId = requestAnimationFrame(tick);
    }
    
    frameId = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameId);
  });

  function handleMouseMove(e: MouseEvent) {
    const rect = svgElement.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
    isHovering = true;
  }
</script>

<div class="w-full h-full min-h-[400px] bg-slate-950 dark:bg-black/40 rounded-2xl overflow-hidden shadow-inner relative">
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <svg
    bind:this={svgElement}
    class="w-full h-full absolute inset-0 cursor-crosshair"
    onmousemove={handleMouseMove}
    onmouseleave={() => isHovering = false}
  >
    <g class="links">
      {#each resolvedLinks as link, i}
        <line
          bind:this={linkElements[i]}
          stroke="rgba(255,255,255,0.15)"
          stroke-width={link.value}
        />
      {/each}
    </g>
    <g class="nodes">
      {#each nodes as node, i}
        <circle
          bind:this={nodeElements[i]}
          r={node.radius}
          fill={node.color}
          class="transition-opacity duration-300"
          style="filter: drop-shadow(0 0 4px {node.color}80);"
        />
      {/each}
    </g>
  </svg>
</div>
