export type SemanticHit = { id: string; score: number };

type HNSWNode = {
  id: string;
  vector: number[];
  level: number;
  neighbors: string[][]; // neighbors[l] = neighbor IDs at layer l
};

// Min-heap keyed by similarity (top = worst/furthest = lowest sim)
class MinSimHeap {
  private data: Array<{ sim: number; id: string }> = [];

  push(sim: number, id: string): void {
    this.data.push({ sim, id });
    this._siftUp(this.data.length - 1);
  }

  pop(): { sim: number; id: string } | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this._siftDown(0); }
    return top;
  }

  peekMin(): number { return this.data[0]?.sim ?? -Infinity; }
  get size(): number { return this.data.length; }

  toSortedDesc(): Array<{ id: string; score: number }> {
    return [...this.data].sort((a, b) => b.sim - a.sim).map(x => ({ id: x.id, score: x.sim }));
  }

  private _siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].sim > this.data[i].sim) {
        [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
      } else break;
    }
  }

  private _siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].sim < this.data[s].sim) s = l;
      if (r < n && this.data[r].sim < this.data[s].sim) s = r;
      if (s === i) break;
      [this.data[s], this.data[i]] = [this.data[i], this.data[s]]; i = s;
    }
  }
}

// Max-heap keyed by similarity (top = best/nearest = highest sim)
class MaxSimHeap {
  private data: Array<{ sim: number; id: string }> = [];

  push(sim: number, id: string): void {
    this.data.push({ sim, id });
    this._siftUp(this.data.length - 1);
  }

  pop(): { sim: number; id: string } | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this._siftDown(0); }
    return top;
  }

  get size(): number { return this.data.length; }

  private _siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p].sim < this.data[i].sim) {
        [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
      } else break;
    }
  }

  private _siftDown(i: number): void {
    const n = this.data.length;
    while (true) {
      let s = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l].sim > this.data[s].sim) s = l;
      if (r < n && this.data[r].sim > this.data[s].sim) s = r;
      if (s === i) break;
      [this.data[s], this.data[i]] = [this.data[i], this.data[s]]; i = s;
    }
  }
}

function cosineSim(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export class HNSWIndex {
  private nodes = new Map<string, HNSWNode>();
  private entryPoint: string | null = null;
  private maxLevel = -1;

  private readonly M: number;         // max neighbors per layer (non-zero layers)
  private readonly Mmax0: number;     // max neighbors at layer 0 (denser)
  private readonly efConstruction: number;
  private readonly mL: number;        // level normalization factor

  constructor({ M = 16, efConstruction = 100 } = {}) {
    this.M = M;
    this.Mmax0 = M * 2;
    this.efConstruction = efConstruction;
    this.mL = 1 / Math.log(M);
  }

  get size(): number { return this.nodes.size; }

  insert(id: string, vector: number[]): void {
    if (this.nodes.has(id)) return;

    const level = this.randomLevel();
    const node: HNSWNode = {
      id, vector, level,
      neighbors: Array.from({ length: level + 1 }, () => []),
    };
    this.nodes.set(id, node);

    if (this.entryPoint === null) {
      this.entryPoint = id;
      this.maxLevel = level;
      return;
    }

    // Phase 1: greedy descent from maxLevel to level+1
    let ep = [this.entryPoint];
    for (let lc = this.maxLevel; lc > level; lc--) {
      const res = this.searchLayer(vector, ep, 1, lc);
      ep = res.length > 0 ? [res[0].id] : ep;
    }

    // Phase 2: insert and wire neighbors at each level
    for (let lc = Math.min(this.maxLevel, level); lc >= 0; lc--) {
      const W = this.searchLayer(vector, ep, this.efConstruction, lc);
      const Mmax = lc === 0 ? this.Mmax0 : this.M;
      const selected = W.slice(0, Mmax);

      node.neighbors[lc] = selected.map(n => n.id);

      // Add back-edges and prune oversized neighbor lists
      for (const neighbor of selected) {
        const neighborNode = this.nodes.get(neighbor.id)!;
        if (!neighborNode.neighbors[lc]) neighborNode.neighbors[lc] = [];
        neighborNode.neighbors[lc].push(id);

        if (neighborNode.neighbors[lc].length > Mmax) {
          neighborNode.neighbors[lc] = neighborNode.neighbors[lc]
            .map(nid => ({
              id: nid,
              sim: this.nodes.has(nid) ? cosineSim(neighborNode.vector, this.nodes.get(nid)!.vector) : -1,
            }))
            .sort((a, b) => b.sim - a.sim)
            .slice(0, Mmax)
            .map(n => n.id);
        }
      }

      ep = W.map(n => n.id);
    }

    if (level > this.maxLevel) {
      this.maxLevel = level;
      this.entryPoint = id;
    }
  }

  search(queryVector: number[], k: number, ef?: number): SemanticHit[] {
    if (!this.entryPoint || this.nodes.size === 0) return [];

    const searchEf = Math.max(k, ef ?? 50);
    let ep = [this.entryPoint];

    for (let lc = this.maxLevel; lc > 0; lc--) {
      const res = this.searchLayer(queryVector, ep, 1, lc);
      ep = res.length > 0 ? [res[0].id] : ep;
    }

    return this.searchLayer(queryVector, ep, searchEf, 0).slice(0, k);
  }

  remove(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    for (let lc = 0; lc <= node.level; lc++) {
      for (const neighborId of node.neighbors[lc] ?? []) {
        const neighbor = this.nodes.get(neighborId);
        if (neighbor?.neighbors[lc]) {
          neighbor.neighbors[lc] = neighbor.neighbors[lc].filter(nid => nid !== id);
        }
      }
    }

    this.nodes.delete(id);

    if (this.entryPoint === id) {
      if (this.nodes.size === 0) {
        this.entryPoint = null;
        this.maxLevel = -1;
      } else {
        // Elect highest-level node as new entry point
        let newEp: string | null = null;
        let newMax = -1;
        for (const [nid, n] of this.nodes) {
          if (n.level > newMax) { newMax = n.level; newEp = nid; }
        }
        this.entryPoint = newEp;
        this.maxLevel = newMax;
      }
    }
  }

  clear(): void {
    this.nodes.clear();
    this.entryPoint = null;
    this.maxLevel = -1;
  }

  private searchLayer(
    queryVector: number[],
    entryPoints: string[],
    ef: number,
    level: number
  ): Array<{ id: string; score: number }> {
    const visited = new Set<string>(entryPoints);
    const C = new MaxSimHeap(); // candidates: extract nearest (highest sim) first
    const W = new MinSimHeap(); // results: remove furthest (lowest sim) to keep top-ef

    for (const epId of entryPoints) {
      const epNode = this.nodes.get(epId);
      if (!epNode) continue;
      const sim = cosineSim(queryVector, epNode.vector);
      C.push(sim, epId);
      W.push(sim, epId);
    }

    while (C.size > 0) {
      const c = C.pop()!;

      // Best remaining candidate is worse than worst current result → done
      if (c.sim < W.peekMin()) break;

      const cNode = this.nodes.get(c.id)!;
      for (const neighborId of cNode.neighbors[level] ?? []) {
        if (visited.has(neighborId)) continue;
        visited.add(neighborId);

        const neighborNode = this.nodes.get(neighborId);
        if (!neighborNode) continue;

        const eSim = cosineSim(queryVector, neighborNode.vector);
        if (W.size < ef || eSim > W.peekMin()) {
          C.push(eSim, neighborId);
          W.push(eSim, neighborId);
          if (W.size > ef) W.pop(); // remove furthest
        }
      }
    }

    return W.toSortedDesc();
  }

  private randomLevel(): number {
    const level = Math.floor(-Math.log(Math.random()) * this.mL);
    return Math.min(level, 8); // cap to prevent degenerate graphs
  }
}
