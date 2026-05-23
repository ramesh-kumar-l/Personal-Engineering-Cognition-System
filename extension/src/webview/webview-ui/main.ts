import type { ExtensionToWebview, WebviewToExtension } from '../PecsPanel';
import type { RepoSummary, SearchResult, TimelineEntry, MemoryDetail, StalenessReport } from '../../storage/schema';

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewToExtension): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

// ─── DOM refs ────────────────────────────────────────────────────────────────

const searchTab = document.getElementById('search-tab')!;
const timelineTab = document.getElementById('timeline-tab')!;
const detailView = document.getElementById('detail-view')!;
const app = document.getElementById('app')!;
const timelineContent = document.getElementById('timeline-content')!;
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// ─── Tab navigation ──────────────────────────────────────────────────────────

type ActiveTab = 'search' | 'timeline';
let activeTab: ActiveTab = 'search';

document.getElementById('tab-bar')!.addEventListener('click', (e) => {
  const btn = (e.target as Element).closest('[data-tab]') as HTMLElement | null;
  if (!btn) return;
  switchTab(btn.dataset.tab as ActiveTab);
});

function switchTab(tab: ActiveTab): void {
  activeTab = tab;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', (b as HTMLElement).dataset.tab === tab));
  searchTab.style.display = tab === 'search' ? '' : 'none';
  timelineTab.style.display = tab === 'timeline' ? '' : 'none';
  detailView.style.display = 'none';
  detailView.innerHTML = '';
}

// ─── Detail view navigation ───────────────────────────────────────────────────

function openDetail(html: string, onBack: () => void): void {
  searchTab.style.display = 'none';
  timelineTab.style.display = 'none';
  detailView.style.display = '';
  detailView.innerHTML = html;

  detailView.querySelector('.back-btn')?.addEventListener('click', () => {
    detailView.style.display = 'none';
    detailView.innerHTML = '';
    if (activeTab === 'search') searchTab.style.display = '';
    else timelineTab.style.display = '';
    onBack();
  });

  detailView.querySelectorAll('.linked-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = (chip as HTMLElement).dataset.id!;
      vscode.postMessage({ type: 'openMemoryDetail', id });
    });
  });

  detailView.querySelector('.link-btn')?.addEventListener('click', () => {
    const id = (detailView.querySelector('.link-btn') as HTMLElement).dataset.id!;
    vscode.postMessage({ type: 'linkFromDetail', sourceId: id });
  });
}

// ─── Search ──────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!query) { showEmpty(); return; }
  debounceTimer = setTimeout(() => {
    vscode.postMessage({ type: 'search', query });
  }, 300);
});

// ─── Message router ──────────────────────────────────────────────────────────

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as ExtensionToWebview;
  switch (msg.type) {
    case 'repoSummary':      renderSummary(msg.payload); break;
    case 'searchResults':    renderResults(msg.payload); break;
    case 'timeline':         renderTimeline(msg.payload); break;
    case 'memoryDetail':     renderDetail(msg.payload); break;
    case 'stalenessReport':  renderStalenessReport(msg.payload); break;
    case 'loading':          showLoading(msg.payload.message); break;
    case 'error':            showError(msg.payload.message); break;
    case 'memoryRecorded':   showBanner(`Memory recorded: ${msg.payload.title}`); break;
    case 'memoryLinked':     showBanner(`Linked: ${msg.payload.sourceTitle} ↔ ${msg.payload.targetTitle}`); break;
  }
});

// ─── Renderers ───────────────────────────────────────────────────────────────

function renderSummary(summary: RepoSummary): void {
  switchTab('search');
  const modules = summary.keyModules
    .map(m => `<div class="result-item">
      <div class="result-title">${esc(m.name)}</div>
      <div class="result-excerpt">${esc(m.purpose)}</div>
    </div>`)
    .join('');

  const stack = summary.techStack.map(t => `<span class="badge badge-note">${esc(t)}</span>`).join(' ');

  app.innerHTML = `
    <div class="section-title">Architecture</div>
    <div class="summary-block">${esc(summary.architecture)}</div>
    ${summary.techStack.length ? `<div class="section-title">Tech Stack</div><div style="padding:4px 0">${stack}</div>` : ''}
    ${summary.keyModules.length ? `<div class="section-title">Key Modules</div>${modules}` : ''}
    <div class="result-meta" style="margin-top:8px">${summary.fileCount} files · ${esc(summary.model)} · ${new Date(summary.generatedAt).toLocaleDateString()}</div>
  `;
}

function workspaceName(wsId: string): string {
  // Extract last path segment from workspace URI (e.g. file:///E:/projects/myapp → myapp)
  const decoded = decodeURIComponent(wsId).replace(/\\/g, '/');
  const parts = decoded.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? wsId;
}

function renderResults(results: SearchResult[]): void {
  if (results.length === 0) {
    app.innerHTML = '<div class="empty-state">No memories found for this query.</div>';
    return;
  }

  // Detect cross-workspace results (more than one unique workspaceId)
  const workspaceIds = new Set(results.map(r => r.workspaceId).filter(Boolean));
  const isCrossWorkspace = workspaceIds.size > 1;

  const items = results.map(r => {
    const wsChip = isCrossWorkspace && r.workspaceId
      ? `<span class="badge badge-note" title="${esc(r.workspaceId)}" style="font-style:italic">${esc(workspaceName(r.workspaceId))}</span>`
      : '';
    return `
    <div class="result-item" data-id="${esc(r.id)}">
      <div class="result-title">
        <span class="badge badge-${r.memoryType ?? 'note'}">${r.memoryType ?? 'note'}</span>${wsChip}${esc(r.title)}
      </div>
      <div class="result-excerpt">${esc(r.excerpt)}</div>
      <div class="result-meta">score ${r.score.toFixed(2)} ${r.createdAt ? '· ' + new Date(r.createdAt).toLocaleDateString() : ''}</div>
    </div>`;
  }).join('');

  app.innerHTML = `<div class="section-title">${results.length} Result${results.length !== 1 ? 's' : ''}${isCrossWorkspace ? ' · all workspaces' : ''}</div>${items}`;

  app.querySelectorAll('.result-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = (item as HTMLElement).dataset.id!;
      vscode.postMessage({ type: 'openMemoryDetail', id });
    });
  });
}

function renderTimeline(entries: TimelineEntry[]): void {
  switchTab('timeline');

  if (entries.length === 0) {
    timelineContent.innerHTML = '<div class="empty-state">No memories recorded yet.<br>Use <strong>PECS: Record Memory</strong> to start.</div>';
    return;
  }

  const groups = groupByDate(entries);
  let html = '';

  for (const [label, items] of groups) {
    html += `<div class="date-group">${esc(label)}</div>`;
    for (const e of items) {
      const staleDot = e.stalenessStatus
        ? `<span class="stale-dot ${e.stalenessStatus}" title="${e.stalenessStatus}"></span>`
        : '';
      const linkBadge = e.linkedCount > 0
        ? `<span class="link-count" title="${e.linkedCount} linked">↔${e.linkedCount}</span>`
        : '';
      html += `
        <div class="result-item" data-id="${esc(e.id)}">
          <div class="result-title">
            <span class="badge badge-${e.type}">${e.type}</span>${esc(e.title)}${staleDot}${linkBadge}
          </div>
          <div class="result-meta">${new Date(e.createdAt).toLocaleDateString()}${e.filePath ? ' · ' + esc(shortPath(e.filePath)) : ''}</div>
        </div>`;
    }
  }

  timelineContent.innerHTML = html;

  timelineContent.querySelectorAll('.result-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = (item as HTMLElement).dataset.id!;
      vscode.postMessage({ type: 'openMemoryDetail', id });
    });
  });
}

function renderDetail(detail: MemoryDetail): void {
  const m = detail.memory;
  const linkedHtml = detail.linkedMemories.length
    ? detail.linkedMemories.map(l =>
        `<span class="linked-chip" data-id="${esc(l.id)}" title="${esc(l.type)}">
          <span class="badge badge-${l.type}" style="margin:0">${l.type}</span> ${esc(l.title)}
        </span>`
      ).join('')
    : '<span style="color:var(--vscode-descriptionForeground);font-size:11px">None</span>';

  const stalenessHtml = m.stalenessStatus
    ? `<span class="stale-dot ${m.stalenessStatus}"></span> ${m.stalenessStatus}`
    : '—';

  const html = `
    <button class="back-btn">← Back</button>
    <div>
      <span class="badge badge-${m.type}">${m.type}</span>
      <strong>${esc(m.title)}</strong>
    </div>
    <div class="detail-content">${esc(m.content)}</div>
    <div class="detail-meta-row"><strong>Created:</strong> ${new Date(m.createdAt).toLocaleString()}</div>
    ${m.filePath ? `<div class="detail-meta-row"><strong>File:</strong> ${esc(shortPath(m.filePath))}${m.lineRange ? ` :${m.lineRange.start + 1}–${m.lineRange.end + 1}` : ''}</div>` : ''}
    ${m.commitHash ? `<div class="detail-meta-row"><strong>Commit:</strong> <code>${esc(m.commitHash.slice(0, 8))}</code></div>` : ''}
    <div class="detail-meta-row"><strong>Staleness:</strong> ${stalenessHtml}</div>
    ${m.tags.length ? `<div class="detail-meta-row"><strong>Tags:</strong> ${m.tags.map(t => `<span class="badge badge-note">${esc(t)}</span>`).join(' ')}</div>` : ''}
    <div class="section-title">Linked Memories</div>
    <div>${linkedHtml}</div>
    <div style="margin-top:8px">
      <button class="back-btn link-btn" data-id="${esc(m.id)}" style="color:var(--vscode-textLink-foreground)">+ Link another memory</button>
    </div>
  `;

  openDetail(html, () => { /* restore handled by openDetail */ });
}

function renderStalenessReport(report: StalenessReport): void {
  switchTab('search');

  if (report.total === 0) {
    app.innerHTML = '<div class="empty-state">No memories with file references to check.</div>';
    return;
  }

  const staleList = report.staleMemories.length
    ? report.staleMemories.map(m =>
        `<div class="result-item" data-id="${esc(m.id)}">
          <div class="result-title">${esc(m.title)}</div>
          <div class="result-excerpt">${m.filePath ? esc(shortPath(m.filePath)) : '—'}</div>
        </div>`
      ).join('')
    : '<div class="empty-state" style="padding:8px">No stale memories found.</div>';

  app.innerHTML = `
    <div class="section-title">Staleness Report — ${report.total} memories checked</div>
    <div class="stale-counters">
      <div class="stale-counter fresh"><span class="count">${report.fresh}</span>Fresh</div>
      <div class="stale-counter stale"><span class="count">${report.stale}</span>Stale</div>
      <div class="stale-counter unknown"><span class="count">${report.unknown}</span>Unknown</div>
    </div>
    ${report.stale > 0 ? `<div class="section-title">Stale Memories</div>${staleList}` : ''}
  `;

  app.querySelectorAll('.result-item[data-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = (item as HTMLElement).dataset.id!;
      vscode.postMessage({ type: 'openMemoryDetail', id });
    });
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function showLoading(message: string): void {
  app.innerHTML = `<div class="loading">${esc(message)}</div>`;
}

function showError(message: string): void {
  app.innerHTML = `<div class="empty-state" style="color:var(--vscode-errorForeground)">${esc(message)}</div>`;
}

function showEmpty(): void {
  app.innerHTML = '<div class="empty-state">Run <strong>PECS: Summarize Repo</strong> or search your engineering memories.</div>';
}

function showBanner(message: string): void {
  const banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;top:8px;right:8px;left:8px;background:var(--vscode-notificationToast-background);color:var(--vscode-notificationToast-foreground);padding:6px 10px;border-radius:3px;font-size:11px;z-index:100;text-align:center';
  banner.textContent = message;
  document.body.appendChild(banner);
  setTimeout(() => banner.remove(), 3000);
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortPath(filePath: string): string {
  const parts = filePath.replace(/\\/g, '/').split('/');
  return parts.length > 2 ? '…/' + parts.slice(-2).join('/') : filePath;
}

function groupByDate(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 6 * 86400000;

  const groups = new Map<string, TimelineEntry[]>();

  for (const e of entries) {
    const d = new Date(e.createdAt).setHours(0, 0, 0, 0);
    let label: string;
    if (d >= today) label = 'Today';
    else if (d >= yesterday) label = 'Yesterday';
    else if (d >= thisWeek) label = 'This Week';
    else label = new Date(e.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

    const arr = groups.get(label) ?? [];
    arr.push(e);
    groups.set(label, arr);
  }

  return groups;
}

// ─── Boot ─────────────────────────────────────────────────────────────────────

vscode.postMessage({ type: 'ready' });
