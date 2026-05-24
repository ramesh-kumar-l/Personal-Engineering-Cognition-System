import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as os from 'os';
import * as http from 'http';
import { StorageManager } from './storage/StorageManager';
import { MemoryStore } from './storage/MemoryStore';
import { WorkflowStore } from './storage/WorkflowStore';
import { CapabilityStore } from './storage/CapabilityStore';
import { DesktopSearchEngine } from './search/DesktopSearchEngine';
import { CloudSync } from './sync/CloudSync';
import { PecsTray } from './tray';
import { getOrCreateToken } from './utils/tokenStore';
import { createApiServer } from './server/ApiServer';

const VERSION = '0.6.0';
const PECS_DIR = path.join(os.homedir(), '.pecs');
const API_PORT = parseInt(process.env['PECS_PORT'] ?? '39457', 10);

let isQuitting = false;
let server: http.Server | null = null;
const tray = new PecsTray();

async function createWindow(preloadPath: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    show: false,
    title: 'PECS — Personal Engineering Cognition System',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  await win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  win.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });

  return win;
}

app.whenReady().then(async () => {
  const storageManager = new StorageManager(PECS_DIR);
  await storageManager.load();

  const memoryStore = new MemoryStore(storageManager);
  const workflowStore = new WorkflowStore(storageManager);
  const capabilityStore = new CapabilityStore(storageManager);
  const searchEngine = new DesktopSearchEngine(memoryStore);
  const cloudSync = new CloudSync(memoryStore);
  const token = await getOrCreateToken(PECS_DIR);
  const startedAt = new Date();

  // Start local REST API server bound to loopback only
  const apiApp = createApiServer({ memoryStore, capabilityStore, searchEngine, cloudSync, token, version: VERSION, startedAt });
  server = apiApp.listen(API_PORT, '127.0.0.1', () => {
    console.log(`[PECS] API server listening on http://127.0.0.1:${API_PORT}`);
    console.log(`[PECS] Token stored at: ${path.join(PECS_DIR, 'api-token')}`);
  });
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[PECS] Port ${API_PORT} already in use. Is another PECS Desktop instance running?`);
    }
  });

  const preloadPath = path.join(__dirname, 'preload.js');
  const win = await createWindow(preloadPath);
  tray.create(win, API_PORT);

  // IPC handlers — renderer communicates via contextBridge without needing auth
  ipcMain.handle('pecs:search', async (_event, query: string, workspaceId?: string) => {
    return searchEngine.query(query, workspaceId);
  });

  ipcMain.handle('pecs:recordMemory', async (_event, data: Record<string, unknown>) => {
    return memoryStore.add({
      workspaceId: (data['workspaceId'] as string) ?? 'desktop',
      type: (data['type'] as 'note') ?? 'note',
      title: data['title'] as string,
      content: data['content'] as string,
      tags: (data['tags'] as string[]) ?? [],
      filePath: data['filePath'] as string | undefined,
    });
  });

  ipcMain.handle('pecs:getMemories', async (_event, workspaceId?: string) => {
    return workspaceId
      ? memoryStore.getAll(workspaceId)
      : memoryStore.getAllWorkspaces();
  });

  ipcMain.handle('pecs:capabilities', async () => {
    return capabilityStore.getLatestSnapshot();
  });

  ipcMain.handle('pecs:status', async () => {
    const uptime = Math.floor((Date.now() - startedAt.getTime()) / 1000);
    const memoryCount = await memoryStore.count();
    return { version: VERSION, status: 'running', uptime, port: API_PORT, memoryCount };
  });

  // Silence unused variable warning — workflowStore available for future IPC handlers
  void workflowStore;

  app.on('activate', () => {
    if (win.isVisible()) win.focus();
    else win.show();
  });
});

app.on('before-quit', () => {
  isQuitting = true;
  server?.close();
  tray.destroy();
});

// Keep running in tray when all windows are closed (except Linux without systray support)
app.on('window-all-closed', () => {
  if (process.platform === 'linux') app.quit();
});
