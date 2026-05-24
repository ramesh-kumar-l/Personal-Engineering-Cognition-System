// Renderer process — communicates with main via contextBridge (window.pecs)

declare global {
  interface Window {
    pecs: {
      search: (query: string, workspaceId?: string) => Promise<SearchResult[]>;
      recordMemory: (data: MemoryInput) => Promise<Memory>;
      getCapabilities: () => Promise<CapabilitySnapshot | null>;
      getStatus: () => Promise<Status>;
    };
  }
}

type SearchResult = {
  id: string; title: string; excerpt: string; score: number;
  memoryType?: string; createdAt?: string; workspaceId?: string;
};
type Memory = { id: string; title: string; type: string; createdAt: string; workspaceId: string };
type MemoryInput = { workspaceId: string; type: string; title: string; content: string; tags: string[] };
type Status = { version: string; status: string; uptime: number; port: number; memoryCount: number };
type CapabilitySnapshot = { technologies: { name: string; category: string; exposureCount: number }[]; workflowMaturity: { totalWorkflows: number; successRate: number } };

// ── Tab navigation ──────────────────────────────────────────────────────────

document.querySelectorAll<HTMLButtonElement>('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const tabId = `tab-${btn.dataset['tab']}`;
    document.getElementById(tabId)?.classList.add('active');
  });
});

// ── Status bar ──────────────────────────────────────────────────────────────

async function refreshStatus(): Promise<void> {
  if (!window.pecs) return;
  try {
    const s = await window.pecs.getStatus();
    const el = document.getElementById('status-line');
    if (el) el.textContent = `v${s.version} · ${s.memoryCount} memories · API :${s.port}`;
  } catch {
    // silent — status line stays at default
  }
}

// ── Search ──────────────────────────────────────────────────────────────────

const searchInput = document.getElementById('search-input') as HTMLInputElement;
const searchBtn = document.getElementById('search-btn') as HTMLButtonElement;
const resultsDiv = document.getElementById('search-results') as HTMLDivElement;

function renderResults(results: SearchResult[]): void {
  if (results.length === 0) {
    resultsDiv.innerHTML = '<p style="color: var(--text2); margin-top: 8px;">No results found.</p>';
    return;
  }
  resultsDiv.innerHTML = results.map(r => `
    <div class="result-card">
      <div class="result-title">
        ${escHtml(r.title)}
        <span class="result-score">${(r.score * 100).toFixed(0)}%</span>
      </div>
      <div class="result-meta">
        ${r.memoryType ?? 'note'} · ${r.workspaceId ?? 'desktop'} · ${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
      </div>
      <div class="result-excerpt">${escHtml(r.excerpt)}</div>
    </div>
  `).join('');
}

async function doSearch(): Promise<void> {
  const query = searchInput.value.trim();
  if (!query) return;
  resultsDiv.innerHTML = '<p style="color:var(--text2)">Searching…</p>';
  try {
    const results = await window.pecs.search(query);
    renderResults(results);
  } catch (e) {
    resultsDiv.innerHTML = `<p style="color:var(--error)">Search failed: ${escHtml(String(e))}</p>`;
  }
}

searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSearch(); });

// ── Record Memory ───────────────────────────────────────────────────────────

const recordForm = document.getElementById('record-form') as HTMLFormElement;
const recStatus = document.getElementById('record-status') as HTMLParagraphElement;

recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = (document.getElementById('rec-title') as HTMLInputElement).value.trim();
  const type = (document.getElementById('rec-type') as HTMLSelectElement).value;
  const content = (document.getElementById('rec-content') as HTMLTextAreaElement).value.trim();
  const tagsRaw = (document.getElementById('rec-tags') as HTMLInputElement).value;
  const workspace = (document.getElementById('rec-workspace') as HTMLInputElement).value.trim() || 'desktop';

  if (!title || !content) return;

  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);
  try {
    await window.pecs.recordMemory({ workspaceId: workspace, type, title, content, tags });
    recStatus.textContent = 'Memory saved!';
    recStatus.className = 'status-msg ok';
    recordForm.reset();
    (document.getElementById('rec-workspace') as HTMLInputElement).value = 'desktop';
    refreshStatus();
  } catch (e) {
    recStatus.textContent = `Error: ${String(e)}`;
    recStatus.className = 'status-msg err';
  }
});

// ── Capabilities ────────────────────────────────────────────────────────────

const loadCapsBtn = document.getElementById('load-caps-btn') as HTMLButtonElement;
const capsContent = document.getElementById('capabilities-content') as HTMLDivElement;

loadCapsBtn.addEventListener('click', async () => {
  capsContent.innerHTML = '<p style="color:var(--text2)">Loading…</p>';
  try {
    const snap = await window.pecs.getCapabilities();
    if (!snap) {
      capsContent.innerHTML = '<p style="color:var(--text2)">No capability snapshot yet. Use the VSCode extension\'s "PECS: Track Capabilities" command to generate one.</p>';
      return;
    }
    const techCount = snap.technologies.length;
    const wf = snap.workflowMaturity;
    capsContent.innerHTML = `<pre>${escHtml(
      `Technologies: ${techCount}\n` +
      snap.technologies.map(t => `  ${t.name} (${t.category}) — ${t.exposureCount} mentions`).join('\n') +
      `\n\nWorkflows: ${wf.totalWorkflows}   Success rate: ${Math.round(wf.successRate * 100)}%`
    )}</pre>`;
  } catch (e) {
    capsContent.innerHTML = `<p style="color:var(--error)">Error: ${escHtml(String(e))}</p>`;
  }
});

// ── Utilities ───────────────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Init
refreshStatus();
