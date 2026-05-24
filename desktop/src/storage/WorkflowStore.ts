import { v4 as uuidv4 } from 'uuid';
import type { StorageManager } from './StorageManager';
import type { Workflow, WorkflowRun } from './schema';

type WorkflowData = Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runs'>;

export class WorkflowStore {
  constructor(private readonly storage: StorageManager) {}

  async create(data: WorkflowData): Promise<Workflow> {
    const db = await this.storage.get();
    const now = new Date().toISOString();
    const workflow: Workflow = { ...data, id: uuidv4(), createdAt: now, updatedAt: now, runs: [] };
    db.workflows = [...(db.workflows ?? []), workflow];
    this.storage.scheduleFlush();
    return workflow;
  }

  async getById(id: string): Promise<Workflow | undefined> {
    const db = await this.storage.get();
    return (db.workflows ?? []).find(w => w.id === id);
  }

  async getAll(): Promise<Workflow[]> {
    const db = await this.storage.get();
    return db.workflows ?? [];
  }

  async update(id: string, updates: Partial<Omit<Workflow, 'id' | 'createdAt'>>): Promise<Workflow | undefined> {
    const db = await this.storage.get();
    const workflows = db.workflows ?? [];
    const idx = workflows.findIndex(w => w.id === id);
    if (idx === -1) return undefined;
    workflows[idx] = { ...workflows[idx], ...updates, updatedAt: new Date().toISOString() };
    this.storage.scheduleFlush();
    return workflows[idx];
  }

  async delete(id: string): Promise<boolean> {
    const db = await this.storage.get();
    const before = (db.workflows ?? []).length;
    db.workflows = (db.workflows ?? []).filter(w => w.id !== id);
    if (db.workflows.length < before) {
      this.storage.scheduleFlush();
      return true;
    }
    return false;
  }

  async addRun(workflowId: string, run: WorkflowRun): Promise<void> {
    const db = await this.storage.get();
    const workflow = (db.workflows ?? []).find(w => w.id === workflowId);
    if (!workflow) return;
    workflow.runs = [...(workflow.runs ?? []), run];
    workflow.updatedAt = new Date().toISOString();
    this.storage.scheduleFlush();
  }

  async updateRun(workflowId: string, runId: string, updates: Partial<WorkflowRun>): Promise<void> {
    const db = await this.storage.get();
    const workflow = (db.workflows ?? []).find(w => w.id === workflowId);
    if (!workflow) return;
    const idx = workflow.runs.findIndex(r => r.id === runId);
    if (idx === -1) return;
    workflow.runs[idx] = { ...workflow.runs[idx], ...updates };
    workflow.updatedAt = new Date().toISOString();
    this.storage.scheduleFlush();
  }
}
