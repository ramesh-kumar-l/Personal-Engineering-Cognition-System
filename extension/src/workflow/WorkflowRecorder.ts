import { v4 as uuidv4 } from 'uuid';
import type { Memory, Workflow, WorkflowStage } from '../storage/schema';

type WorkflowData = Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runs'>;

export class WorkflowRecorder {
  // Groups memories by calendar date; each date becomes a stage, each memory a manual step
  static fromMemories(memories: Memory[], name: string, description: string): WorkflowData {
    const groups = new Map<string, Memory[]>();
    for (const m of memories) {
      const key = new Date(m.createdAt).toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
      const arr = groups.get(key) ?? [];
      arr.push(m);
      groups.set(key, arr);
    }

    const stages: WorkflowStage[] = [...groups.entries()].map(([dateKey, mems]) => ({
      id: uuidv4(),
      name: dateKey,
      description: `${mems.length} step${mems.length !== 1 ? 's' : ''} from this session`,
      requiresApproval: false,
      steps: mems.map(m => ({
        id: uuidv4(),
        name: m.title,
        description: m.content.length > 200 ? m.content.slice(0, 197) + '…' : m.content,
        type: 'manual' as const,
        requiresApproval: false,
      })),
    }));

    return {
      name,
      description,
      tags: [...new Set(memories.flatMap(m => m.tags))],
      stages,
      recordedFromMemoryIds: memories.map(m => m.id),
    };
  }
}
