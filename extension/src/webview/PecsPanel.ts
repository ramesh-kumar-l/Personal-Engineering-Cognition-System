import * as vscode from 'vscode';
import { generateNonce } from '../utils/config';
import type {
  RepoSummary, SearchResult, TimelineEntry, MemoryDetail, StalenessReport,
  WorkflowListItem, WorkflowRun,
} from '../storage/schema';

export type ExtensionToWebview =
  | { type: 'repoSummary'; payload: RepoSummary }
  | { type: 'searchResults'; payload: SearchResult[] }
  | { type: 'timeline'; payload: TimelineEntry[] }
  | { type: 'memoryDetail'; payload: MemoryDetail }
  | { type: 'stalenessReport'; payload: StalenessReport }
  | { type: 'workflowList'; payload: WorkflowListItem[] }
  | { type: 'workflowDetail'; payload: import('../storage/schema').WorkflowDetail }
  | { type: 'workflowProgress'; payload: WorkflowRun }
  | { type: 'loading'; payload: { message: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'memoryRecorded'; payload: { title: string } }
  | { type: 'memoryLinked'; payload: { sourceTitle: string; targetTitle: string } };

export type WebviewToExtension =
  | { type: 'search'; query: string }
  | { type: 'openMemoryDetail'; id: string }
  | { type: 'linkFromDetail'; sourceId: string }
  | { type: 'listWorkflows' }
  | { type: 'openWorkflowDetail'; id: string }
  | { type: 'ready' };

type MessageHandler = (msg: WebviewToExtension) => void;

export class PecsPanel implements vscode.WebviewViewProvider {
  static readonly viewType = 'pecs.sidebarView';

  private _view?: vscode.WebviewView;
  private messageHandlers: MessageHandler[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist')],
    };

    webviewView.webview.html = this.buildHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((msg: WebviewToExtension) => {
      for (const handler of this.messageHandlers) {
        handler(msg);
      }
    });
  }

  postMessage(msg: ExtensionToWebview): void {
    this._view?.webview.postMessage(msg);
  }

  reveal(): void {
    this._view?.show(true);
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandlers.push(handler);
  }

  private buildHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview.js')
    );
    const nonce = generateNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PECS</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 8px;
    }
    /* Tab bar */
    #tab-bar {
      display: flex;
      gap: 2px;
      margin-bottom: 8px;
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 4px;
    }
    .tab {
      background: none;
      border: none;
      color: var(--vscode-descriptionForeground);
      cursor: pointer;
      font-size: 11px;
      font-family: var(--vscode-font-family);
      padding: 3px 8px;
      border-radius: 2px;
    }
    .tab.active {
      color: var(--vscode-foreground);
      background: var(--vscode-toolbar-activeBackground);
    }
    .tab:hover:not(.active) { background: var(--vscode-list-hoverBackground); }

    /* Search bar */
    #search-bar { display: flex; gap: 4px; margin-bottom: 8px; }
    #search-input {
      flex: 1;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
      padding: 4px 8px;
      border-radius: 2px;
      font-size: var(--vscode-font-size);
    }
    #search-input:focus { outline: 1px solid var(--vscode-focusBorder); }

    /* Shared */
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--vscode-sideBarSectionHeader-foreground);
      margin: 12px 0 4px;
    }
    .result-item {
      padding: 6px 8px;
      border-radius: 3px;
      cursor: pointer;
      margin-bottom: 2px;
    }
    .result-item:hover { background: var(--vscode-list-hoverBackground); }
    .result-title { font-weight: 500; }
    .result-excerpt {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .result-meta {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-top: 2px;
    }
    .summary-block {
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      padding: 8px;
      font-size: 12px;
      line-height: 1.5;
    }
    .empty-state {
      text-align: center;
      color: var(--vscode-descriptionForeground);
      padding: 24px 8px;
      font-size: 12px;
    }
    .loading { color: var(--vscode-descriptionForeground); font-size: 12px; padding: 8px; }

    /* Type badges */
    .badge {
      display: inline-block;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 4px;
      border-radius: 2px;
      margin-right: 4px;
    }
    .badge-debug    { background: #1e3a5f; color: #64b5f6; }
    .badge-decision { background: #3b2e5a; color: #ba68c8; }
    .badge-learning { background: #1e4a2e; color: #66bb6a; }
    .badge-incident { background: #4a1e1e; color: #ef9a9a; }
    .badge-note     { background: #3a3a1e; color: #fff176; }

    /* Staleness dot */
    .stale-dot {
      display: inline-block;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-left: 4px;
      vertical-align: middle;
    }
    .stale-dot.fresh  { background: #66bb6a; }
    .stale-dot.stale  { background: #ef9a9a; }
    .stale-dot.unknown { background: #9e9e9e; }

    /* Link count */
    .link-count {
      display: inline-block;
      font-size: 9px;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 8px;
      padding: 0 5px;
      margin-left: 4px;
    }

    /* Date group header */
    .date-group {
      font-size: 10px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 10px 0 4px;
      padding-bottom: 2px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }

    /* Detail view */
    #detail-view { display: none; }
    .back-btn {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground);
      cursor: pointer;
      font-size: 11px;
      font-family: var(--vscode-font-family);
      padding: 2px 0;
      margin-bottom: 8px;
    }
    .back-btn:hover { text-decoration: underline; }
    .detail-content {
      background: var(--vscode-textCodeBlock-background);
      border-radius: 3px;
      padding: 8px;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
      margin: 6px 0;
    }
    .detail-meta-row {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin: 3px 0;
    }
    .detail-meta-row strong { color: var(--vscode-foreground); }
    .linked-chip {
      display: inline-block;
      background: var(--vscode-badge-background);
      color: var(--vscode-badge-foreground);
      border-radius: 10px;
      padding: 2px 8px;
      font-size: 10px;
      margin: 2px;
      cursor: pointer;
    }
    .linked-chip:hover { opacity: 0.8; }

    /* Staleness report */
    .stale-counters {
      display: flex;
      gap: 8px;
      margin: 8px 0;
    }
    .stale-counter {
      flex: 1;
      text-align: center;
      padding: 6px;
      border-radius: 3px;
      background: var(--vscode-textCodeBlock-background);
      font-size: 11px;
    }
    .stale-counter .count { font-size: 18px; font-weight: 700; display: block; }
    .stale-counter.fresh  .count { color: #66bb6a; }
    .stale-counter.stale  .count { color: #ef9a9a; }
    .stale-counter.unknown .count { color: #9e9e9e; }

    /* Workflow styles */
    .run-status {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 1px 5px;
      border-radius: 8px;
    }
    .run-status.completed  { background: #1e4a2e; color: #66bb6a; }
    .run-status.running    { background: #1e3a5f; color: #64b5f6; }
    .run-status.cancelled  { background: #3a3a1e; color: #fff176; }
    .run-status.failed     { background: #4a1e1e; color: #ef9a9a; }
    .run-status.paused     { background: #3b2e5a; color: #ba68c8; }
    .run-status.pending    { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); }
    .stage-item {
      margin: 6px 0;
      border-left: 2px solid var(--vscode-panel-border);
      padding-left: 8px;
    }
    .stage-item.active { border-left-color: #64b5f6; }
    .stage-name {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 3px;
    }
    .step-item {
      display: flex;
      gap: 6px;
      align-items: flex-start;
      padding: 3px 0;
    }
    .step-status {
      font-size: 11px;
      min-width: 12px;
      color: var(--vscode-descriptionForeground);
      flex-shrink: 0;
    }
    .step-item.completed .step-status { color: #66bb6a; }
    .step-item.failed    .step-status { color: #ef9a9a; }
    .step-item.skipped   .step-status { color: #9e9e9e; }
    .step-name { font-size: 11px; font-weight: 500; }
    .step-desc { font-size: 10px; color: var(--vscode-descriptionForeground); margin-top: 1px; }
    .step-output {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      font-style: italic;
      margin-top: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  </style>
</head>
<body>
  <div id="tab-bar">
    <button class="tab active" data-tab="search">Search</button>
    <button class="tab" data-tab="timeline">Timeline</button>
    <button class="tab" data-tab="workflows">Playbooks</button>
  </div>

  <div id="search-tab">
    <div id="search-bar">
      <input id="search-input" type="text" placeholder="Search memories..." autocomplete="off">
    </div>
    <div id="app">
      <div class="empty-state">
        Run <strong>PECS: Summarize Repo</strong> or search your engineering memories.
      </div>
    </div>
  </div>

  <div id="timeline-tab" style="display:none">
    <div id="timeline-content">
      <div class="empty-state">Run <strong>PECS: View Memory Timeline</strong> to load.</div>
    </div>
  </div>

  <div id="workflows-tab" style="display:none">
    <div id="workflows-content">
      <div class="empty-state">Run <strong>PECS: List Workflows</strong> to load playbooks.</div>
    </div>
  </div>

  <div id="detail-view"></div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
