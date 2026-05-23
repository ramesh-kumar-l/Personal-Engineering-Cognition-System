import * as vscode from 'vscode';
import { generateNonce } from '../utils/config';
import type { RepoSummary, SearchResult } from '../storage/schema';

export type ExtensionToWebview =
  | { type: 'repoSummary'; payload: RepoSummary }
  | { type: 'searchResults'; payload: SearchResult[] }
  | { type: 'loading'; payload: { message: string } }
  | { type: 'error'; payload: { message: string } }
  | { type: 'memoryRecorded'; payload: { title: string } };

export type WebviewToExtension =
  | { type: 'search'; query: string }
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
    #search-bar {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
    }
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
  </style>
</head>
<body>
  <div id="search-bar">
    <input id="search-input" type="text" placeholder="Search memories..." autocomplete="off">
  </div>
  <div id="app">
    <div class="empty-state">
      Run <strong>PECS: Summarize Repo</strong> or search your engineering memories.
    </div>
  </div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}
