// Test adapter only. No Firebase imports, credentials, RPC, timers or billed operations.
const clone = value => value === undefined ? undefined : structuredClone(value);
class MemoryAccountAdapter {
  constructor(seed = {}) {
    this.documents = new Map(Object.entries(clone(seed)));
    this.versions = new Map([...this.documents.keys()].map(key => [key, 1]));
    this.maxAttempts = 8;
    this.retryBeforeCommit = 0;
    this.failCommit = false;
    this.failAfterStagedWrites = 0;
    this.resetMetrics();
  }
  resetMetrics() { this.metrics = { attempts: 0, reads: 0, stagedWrites: 0, committedWrites: 0, commits: 0, retries: 0, summaryWrites: 0 }; }
  dump() { return Object.fromEntries([...this.documents].map(([key, value]) => [key, clone(value)])); }
  async runTransaction(callback) {
    for (let attempt = 0; attempt < this.maxAttempts; attempt++) {
      this.metrics.attempts++;
      const snapshot = new Map([...this.documents].map(([k, v]) => [k, clone(v)]));
      const versions = new Map(this.versions);
      const reads = new Set();
      const writes = new Map();
      let writing = false, open = true;
      const stage = (key, value) => {
        if (!open) throw Error('closed transaction');
        writing = true; this.metrics.stagedWrites++;
        writes.set(key, value);
        if (this.failAfterStagedWrites && writes.size >= this.failAfterStagedWrites) throw Error('injected staging failure');
      };
      let result;
      try {
        result = await callback({
          get: async key => {
            if (!open || writing) throw Error('read after write');
            reads.add(key); this.metrics.reads++; return clone(snapshot.get(key));
          },
          set: (key, value) => stage(key, { value: clone(value) }),
          delete: key => stage(key, null),
        });
      } finally { open = false; }
      if (this.failCommit) throw Error('injected commit failure');
      if (this.retryBeforeCommit > 0) { this.retryBeforeCommit--; this.metrics.retries++; continue; }
      if ([...reads].some(key => (versions.get(key) || 0) !== (this.versions.get(key) || 0))) {
        this.metrics.retries++; continue;
      }
      // Synchronous publish of a fully cloned candidate: no partially visible commits.
      const next = new Map(this.documents), nextVersions = new Map(this.versions);
      for (const [key, write] of writes) {
        if (write === null) next.delete(key); else next.set(key, clone(write.value));
        nextVersions.set(key, (nextVersions.get(key) || 0) + 1);
      }
      this.documents = next; this.versions = nextVersions;
      this.metrics.commits++; this.metrics.committedWrites += writes.size;
      this.metrics.summaryWrites += [...writes.keys()].filter(key => key.endsWith('/meta/summary')).length;
      return result;
    }
    throw Error('retry exhausted');
  }
}
module.exports = { MemoryAccountAdapter };