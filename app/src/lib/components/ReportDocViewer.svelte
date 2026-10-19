<script lang="ts">
  export interface ReportDocConfig {
    title: string;
    author?: string;
    date?: string;
    classification?: 'Internal Only' | 'Confidential' | 'Public' | 'Executive Brief';
    rawHtml?: string;
    markdownText?: string;
    sections?: Array<{
      id: string;
      heading: string;
      content: string;
      alertType?: 'note' | 'tip' | 'warning' | 'caution';
      table?: {
        headers: string[];
        rows: string[][];
      };
      codeBlock?: {
        language: string;
        code: string;
      };
    }>;
  }

  let { config } = $props<{ config: ReportDocConfig }>();

  let copied = $state(false);

  const defaultSections = [
    {
      id: 'exec-summary',
      heading: '1. Executive Incident Summary',
      content: 'During the 08:42 UTC deployment cycle, anomalous connection spikes saturated the primary Aurora PostgreSQL connection pool, triggering elevated latency across upstream edge checkout services.',
      alertType: 'note' as const
    },
    {
      id: 'impact-metrics',
      heading: '2. Blast Radius & Service Impact',
      content: 'Edge gateway rate limiting protected the primary database from total collapse. 42,000 checkout sessions experienced elevated latency (+280ms) with zero data corruption.',
      table: {
        headers: ['Service Subsystem', 'Impacted Sessions', 'Peak Latency (p99)', 'Resolution Status'],
        rows: [
          ['API Gateway Ingress', '42,100', '1,420 ms', 'Mitigated via Route53'],
          ['Aurora PostgreSQL Pool', '18,400', '3,890 ms', 'Connection Throttle Scaled'],
          ['PCI Payment Vault', '0', '42 ms', 'Nominal (Isolated)']
        ]
      }
    },
    {
      id: 'remediation-diff',
      heading: '3. Applied Hotfix Configuration',
      content: 'The connection pool maximum was increased from 250 to 2,500 connections with an aggressive 15s idle timeout policy.',
      codeBlock: {
        language: 'yaml',
        code: `database:\n  pool:\n    max_connections: 2500\n    min_idle: 50\n    idle_timeout_sec: 15\n    connection_timeout_ms: 2000`
      }
    },
    {
      id: 'mitigation-timeline',
      heading: '4. Action Items & Preventive Guardrails',
      content: 'Automated Moveworks ActionContracts have been provisioned to scale container worker replicas whenever connection pool saturation exceeds 80% for >60s.',
      alertType: 'tip' as const
    }
  ];

  const sections = $derived(config.sections && config.sections.length > 0 ? config.sections : defaultSections);

  function copyMarkdown() {
    let md = `# ${config.title || 'Technical Architecture Brief'}\n\n`;
    sections.forEach(s => {
      md += `## ${s.heading}\n\n${s.content}\n\n`;
      if (s.table) {
        md += `| ${s.table.headers.join(' | ')} |\n`;
        md += `| ${s.table.headers.map(() => '---').join(' | ')} |\n`;
        s.table.rows.forEach(r => {
          md += `| ${r.join(' | ')} |\n`;
        });
        md += '\n';
      }
      if (s.codeBlock) {
        md += `\`\`\`${s.codeBlock.language}\n${s.codeBlock.code}\n\`\`\`\n\n`;
      }
    });

    navigator.clipboard?.writeText(md);
    copied = true;
    setTimeout(() => copied = false, 2000);
  }

  function downloadHtml() {
    let htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${config.title || 'Report'}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1e293b; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; font-size: 24px; color: #0f172a; }
    h2 { margin-top: 28px; font-size: 18px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: left; }
    th { background: #f1f5f9; font-weight: bold; }
    pre { background: #0f172a; color: #38bdf8; padding: 14px; border-radius: 8px; font-family: monospace; overflow-x: auto; }
    .alert { padding: 12px 16px; border-radius: 8px; margin: 14px 0; border-left: 4px solid; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${config.title || 'Technical Report'}</h1>
  <p><strong>Author:</strong> ${config.author || 'Sola Systems Architect'} | <strong>Date:</strong> ${config.date || new Date().toISOString().split('T')[0]}</p>
`;

    sections.forEach(s => {
      htmlContent += `  <h2>${s.heading}</h2>\n  <p>${s.content}</p>\n`;
      if (s.table) {
        htmlContent += `  <table>\n    <thead>\n      <tr>${s.table.headers.map(h => `<th>${h}</th>`).join('')}</tr>\n    </thead>\n    <tbody>\n`;
        s.table.rows.forEach(r => {
          htmlContent += `      <tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>\n`;
        });
        htmlContent += `    </tbody>\n  </table>\n`;
      }
      if (s.codeBlock) {
        htmlContent += `  <pre><code>${s.codeBlock.code}</code></pre>\n`;
      }
    });

    htmlContent += `</body>\n</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(config.title || 'sola-report').toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="relative bg-white/95 dark:bg-white/[0.02] border border-slate-200/90 dark:border-white/[0.04] rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col gap-6">
  
  <!-- Top Document Header Banner -->
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-white/[0.04]">
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20">
          {config.classification || 'Internal Technical Brief'}
        </span>
        <span class="text-xs font-mono text-slate-500 dark:text-slate-400">
          {config.date || 'August 28, 2026'}
        </span>
      </div>
      <h3 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
        {config.title || 'SRE Architecture Postmortem Brief'}
      </h3>
      <p class="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-[68ch]">
        Author: {config.author || 'Principal Systems Architect'} • Format: Native HTML/Markdown
      </p>
    </div>

    <!-- Action Toolbar (Export HTML & Copy Markdown) -->
    <div class="flex items-center gap-2 shrink-0">
      <button 
        onclick={downloadHtml}
        class="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.08] hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer">
        <svg class="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        <span>Export HTML</span>
      </button>

      <button 
        onclick={copyMarkdown}
        class="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all active:scale-[0.97] cursor-pointer">
        {#if copied}
          <svg class="w-3.5 h-3.5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-blue-400">Copied MD!</span>
        {:else}
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          <span>Copy MD</span>
        {/if}
      </button>
    </div>
  </div>

  <!-- Document Body Stream -->
  <div class="flex flex-col gap-6 font-sans">
    {#each sections as s}
      <div class="flex flex-col gap-2.5">
        <h4 class="text-sm sm:text-base font-semibold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
          <span>{s.heading}</span>
        </h4>
        
        <p class="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-[68ch]">
          {s.content}
        </p>

        <!-- Alert Callout if present -->
        {#if s.alertType === 'note'}
          <div class="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10/80 border border-sky-200 dark:border-sky-500/20/80 text-sky-900 text-xs font-mono flex items-start gap-2.5">
            <svg class="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <span class="leading-relaxed"><strong>System Note:</strong> Direct-DOM rendering preserves document repaint speed without layout shifts.</span>
          </div>
        {:else if s.alertType === 'tip'}
          <div class="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-500/10/80 border border-blue-200 dark:border-blue-500/20/80 text-blue-900 text-xs font-mono flex items-start gap-2.5">
            <svg class="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/></svg>
            <span class="leading-relaxed"><strong>Automation Recommendation:</strong> Provision Moveworks ActionContract triggers for proactive database failover.</span>
          </div>
        {/if}

        <!-- Table Formatting if present -->
        {#if s.table}
          <div class="overflow-x-auto rounded-2xl border border-slate-200/90 dark:border-white/[0.04] shadow-2xs mt-1">
            <table class="w-full text-left text-xs font-mono">
              <thead class="bg-slate-50 dark:bg-white/[0.04] border-b border-slate-200 dark:border-white/[0.04] text-slate-700 dark:text-slate-300 uppercase font-semibold text-xs">
                <tr>
                  {#each s.table.headers as th}
                    <th class="px-3.5 py-2.5">{th}</th>
                  {/each}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white dark:bg-white/[0.02]">
                {#each s.table.rows as row}
                  <tr class="hover:bg-slate-50/80 dark:bg-white/[0.04] transition-colors">
                    {#each row as cell, i}
                      <td class="px-3.5 py-2 text-slate-800 dark:text-slate-200 {i === 0 ? 'font-bold' : ''}">{cell}</td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        <!-- Code Block if present -->
        {#if s.codeBlock}
          <div class="relative group mt-1">
            <div class="absolute top-2.5 right-3 text-xs font-mono text-slate-500 dark:text-slate-400 uppercase">
              {s.codeBlock.language}
            </div>
            <pre class="p-4 rounded-2xl bg-slate-950 dark:bg-black/40 text-sky-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed"><code>{s.codeBlock.code}</code></pre>
          </div>
        {/if}
      </div>
    {/each}
  </div>

</div>
