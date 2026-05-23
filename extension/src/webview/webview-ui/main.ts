import type { ExtensionToWebview, WebviewToExtension } from '../PecsPanel';
import type { RepoSummary, SearchResult } from '../../storage/schema';

declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewToExtension): void;
  getState(): unknown;
  setState(state: unknown): void;
};

const vscode = acquireVsCodeApi();

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const app = document.getElementById('app') as HTMLDivElement;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

searchInput.addEventListener('input', () => {
  const query = searchInput.value.trim();
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!query) {
    showEmpty();
    return;
  }
  debounceTimer = setTimeout(() => {
    vscode.postMessage({ type: 'search', query });
  }, 300);
});

window.addEventListener('message', (event: MessageEvent) => {
  const msg = event.data as ExtensionToWebview;
  switch (msg.type) {
    case 'repoSummary':
      renderSummary(msg.payload);
      break;
    case 'searchResults':
      renderResults(msg.payload);
      break;
    case 'loading':
      showLoading(msg.payload.message);
      break;
    case 'error':
      showError(msg.payload.message);
      break;
    case 'memoryRecorded':
      showBanner(`Memory recorded: ${msg.payload.title}`);
      break;
  }
});

function renderSummary(summary: RepoSummary): void {
  const modules = summary.keyModules
    .map(m => `<div class="result-item"><div class="result-title">${esc(m.name)}</div><div class="result-excerpt">${esc(m.purpose)}</div></div>`)
    .join('');

  const stack = summary.techStack.map(t => `<span class="tag">${esc(t)}</span>`).join(' ');

  app.innerHTML = `
    <div class="section-title">Architecture</div>
    <div class="summary-block">${esc(summary.architecture)}</div>
    ${summary.techStack.length ? `<div class="section-title">Tech Stack</div><div style="padding:4px 0">${stack}</div>` : ''}
    ${summary.keyModules.length ? `<div class="section-title">Key Modules</div>${modules}` : ''}
    <div class="result-meta" style="margin-top:8px">${summary.fileCount} files · ${summary.model} · ${new Date(summary.generatedAt).toLocaleDateString()}</div>
  `;
}

function renderResults(results: SearchResult[]): void {
  if (results.length === 0) {
    app.innerHTML = '<div class="empty-state">No memories found for this query.</div>';
    return;
  }

  const items = results.map(r => `
    <div class="result-item">
      <div class="result-title">${esc(r.title)}</div>
      <div class="result-excerpt">${esc(r.excerpt)}</div>
      <div class="result-meta">${r.memoryType ?? 'note'} · score ${r.score.toFixed(2)} ${r.createdAt ? '· ' + new Date(r.createdAt).toLocaleDateString() : ''}</div>
    </div>
  `).join('');

  app.innerHTML = `<div class="section-title">${results.length} Result${results.length !== 1 ? 's' : ''}</div>${items}`;
}

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
  banner.style.cssText = 'position:fixed;top:8px;right:8px;background:var(--vscode-notificationToast-background);color:var(--vscode-notificationToast-foreground);padding:6px 12px;border-radius:3px;font-size:12px;z-index:100';
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

// Signal ready
vscode.postMessage({ type: 'ready' });
