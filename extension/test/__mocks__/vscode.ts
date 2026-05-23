import { vi } from 'vitest';

export const workspace = {
  getConfiguration: vi.fn(() => ({
    get: vi.fn(),
    has: vi.fn(),
    inspect: vi.fn(),
    update: vi.fn(),
  })),
  workspaceFolders: [] as unknown[],
  name: 'test-workspace',
  onDidChangeConfiguration: vi.fn(() => ({ dispose: vi.fn() })),
};

export const window = {
  showErrorMessage: vi.fn(),
  showInformationMessage: vi.fn(),
  showWarningMessage: vi.fn(),
  showInputBox: vi.fn(),
  showQuickPick: vi.fn(),
  withProgress: vi.fn((_opts: unknown, task: (progress: unknown) => Promise<unknown>) =>
    task({ report: vi.fn() })
  ),
  createOutputChannel: vi.fn(() => ({
    appendLine: vi.fn(),
    append: vi.fn(),
    clear: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  })),
  registerWebviewViewProvider: vi.fn(() => ({ dispose: vi.fn() })),
};

export const commands = {
  registerCommand: vi.fn(() => ({ dispose: vi.fn() })),
  executeCommand: vi.fn(),
};

export const Uri = {
  joinPath: vi.fn((_base: unknown, ...paths: string[]) => ({
    fsPath: paths.join('/'),
    toString: () => paths.join('/'),
  })),
  file: vi.fn((path: string) => ({ fsPath: path })),
};

export const ExtensionContext = {};

export enum ProgressLocation {
  Notification = 15,
  SourceControl = 1,
  Window = 10,
}

export const ProgressLocation_Notification = 15;
