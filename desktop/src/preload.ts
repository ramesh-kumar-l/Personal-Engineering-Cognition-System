import { contextBridge, ipcRenderer } from 'electron';

type SearchResult = {
  id: string; title: string; excerpt: string; score: number;
  memoryType?: string; createdAt?: string; workspaceId?: string;
};
type Memory = { id: string; title: string; content: string; type: string; createdAt: string; workspaceId: string };
type StatusResult = { version: string; status: string; uptime: number; port: number };

contextBridge.exposeInMainWorld('pecs', {
  search: (query: string, workspaceId?: string): Promise<SearchResult[]> =>
    ipcRenderer.invoke('pecs:search', query, workspaceId),

  recordMemory: (data: { workspaceId: string; type: string; title: string; content: string; tags: string[] }): Promise<Memory> =>
    ipcRenderer.invoke('pecs:recordMemory', data),

  getMemories: (workspaceId?: string): Promise<Memory[]> =>
    ipcRenderer.invoke('pecs:getMemories', workspaceId),

  getCapabilities: (): Promise<unknown> =>
    ipcRenderer.invoke('pecs:capabilities'),

  getStatus: (): Promise<StatusResult> =>
    ipcRenderer.invoke('pecs:status'),
});
