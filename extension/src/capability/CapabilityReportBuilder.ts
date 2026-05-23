import type { TechnologyEntry, WorkflowMaturity, CapabilitySnapshot } from '../storage/schema';

export class CapabilityReportBuilder {
  static buildMarkdown(snapshot: CapabilitySnapshot): string {
    const { technologies, workflowMaturity: wm, capturedAt, memoryCount } = snapshot;
    const date = new Date(capturedAt).toLocaleString();

    const lines: string[] = [
      `# Engineering Capability Report`,
      `_Generated: ${date}_`,
      '',
      `## Summary`,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Technologies tracked | ${technologies.length} |`,
      `| Total memories | ${memoryCount} |`,
      `| Workflows defined | ${wm.totalWorkflows} |`,
      `| Total workflow runs | ${wm.totalRuns} |`,
      `| Workflow success rate | ${formatPct(wm.successRate)} |`,
      '',
    ];

    // Technologies by category
    const byCategory = groupByCategory(technologies);
    const categoryOrder: TechnologyEntry['category'][] = [
      'language', 'framework', 'tool', 'platform', 'service', 'pattern',
    ];

    lines.push('## Technology Exposure');
    for (const cat of categoryOrder) {
      const entries = byCategory[cat];
      if (!entries || entries.length === 0) continue;
      lines.push('');
      lines.push(`### ${capitalize(cat)}s`);
      const sorted = [...entries].sort((a, b) => b.exposureCount - a.exposureCount);
      for (const t of sorted) {
        const workspaces = t.workspaceIds.length;
        lines.push(
          `- **${t.name}** — ${t.exposureCount} mention${t.exposureCount !== 1 ? 's' : ''}` +
          ` across ${workspaces} workspace${workspaces !== 1 ? 's' : ''}` +
          (t.tags.length > 0 ? ` _(${t.tags.slice(0, 3).join(', ')})_` : ''),
        );
      }
    }

    // Workflow maturity section
    lines.push('');
    lines.push('## Workflow Maturity');
    if (wm.totalWorkflows === 0) {
      lines.push('No workflows defined yet. Create playbooks with `PECS: Create Workflow`.');
    } else {
      lines.push(`- **${wm.totalWorkflows}** workflow${wm.totalWorkflows !== 1 ? 's' : ''} defined`);
      lines.push(`- **${wm.totalRuns}** total run${wm.totalRuns !== 1 ? 's' : ''}`);
      lines.push(`- **${formatPct(wm.successRate)}** success rate`);
      lines.push(`- Avg **${wm.avgStagesPerWorkflow}** stages / workflow`);
      lines.push(`- Avg **${wm.avgStepsPerWorkflow}** steps / workflow`);
      if (wm.mostRunWorkflowName) {
        lines.push(`- Most-run playbook: **${wm.mostRunWorkflowName}**`);
      }
    }

    lines.push('');
    return lines.join('\n');
  }

  /** Returns a minimal summary string for notifications. */
  static buildSummaryLine(snapshot: CapabilitySnapshot): string {
    const { technologies, workflowMaturity: wm } = snapshot;
    return (
      `${technologies.length} technolog${technologies.length !== 1 ? 'ies' : 'y'} tracked · ` +
      `${wm.totalWorkflows} workflow${wm.totalWorkflows !== 1 ? 's' : ''} · ` +
      `${formatPct(wm.successRate)} success rate`
    );
  }
}

function groupByCategory(
  entries: TechnologyEntry[],
): Partial<Record<TechnologyEntry['category'], TechnologyEntry[]>> {
  const out: Partial<Record<TechnologyEntry['category'], TechnologyEntry[]>> = {};
  for (const e of entries) {
    (out[e.category] ??= []).push(e);
  }
  return out;
}

function formatPct(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
