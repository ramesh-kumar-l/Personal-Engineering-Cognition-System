import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DatabaseSchema, emptyDatabase, type Database } from './schema';

export class StorageManager {
  private readonly dbPath: string;
  private readonly tmpPath: string;
  private db: Database | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(context: vscode.ExtensionContext) {
    const storageDir = context.globalStorageUri.fsPath;
    this.dbPath = path.join(storageDir, 'pecs-db.json');
    this.tmpPath = path.join(storageDir, 'pecs-db.json.tmp');
  }

  async load(): Promise<Database> {
    try {
      const raw = await fs.readFile(this.dbPath, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      const result = DatabaseSchema.safeParse(parsed);
      if (result.success) {
        this.db = result.data;
        return this.db;
      }
    } catch {
      // file missing or parse error — start fresh
    }
    this.db = emptyDatabase();
    return this.db;
  }

  async flush(): Promise<void> {
    if (!this.db) return;
    const content = JSON.stringify(this.db, null, 2);
    await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
    await fs.writeFile(this.tmpPath, content, 'utf-8');
    await fs.rename(this.tmpPath, this.dbPath);
  }

  scheduleFlush(): void {
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.flush().catch(() => undefined);
    }, 2000);
  }

  async flushImmediate(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  async get(): Promise<Database> {
    if (!this.db) {
      return this.load();
    }
    return this.db;
  }
}
