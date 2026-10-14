import { Timestamp } from 'firebase/firestore';
import type { Command, Constraint, Mutation, Reference, Result } from './engine';

export function encode(value: any): any {
  if (value?.toMillis instanceof Function) return { __mockTimestamp: value.toMillis() };
  if (value instanceof Date) return { __mockTimestamp: value.getTime() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).map(([k, v]) => [k, encode(v)]));
  return value;
}
export function decode(value: any): any {
  if (value && typeof value.__mockTimestamp === 'number') return Timestamp.fromMillis(value.__mockTimestamp);
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decode(v)]));
  return value;
}

async function send(command: Command): Promise<Result> {
  if (typeof window === 'undefined') {
    const { execute } = await import('./engine');
    return execute(encode(command));
  }
  const response = await fetch('/api/mock-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(encode(command)), cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Mock data request failed');
  return result;
}

const newId = () => crypto.randomUUID();
export function reference(type: Reference['type'], parent: any, ...segments: string[]): Reference & { id: string } {
  const path = [parent?.path, ...segments].filter(Boolean).join('/') || (type === 'document' ? newId() : '');
  return { type, path, id: path.split('/').pop()! };
}

export class MockQuery {
  constructor(public path: string, public constraints: Constraint[] = [], public type: Reference['type'] = 'collection') {}
  get id() { return this.path.split('/').pop()!; }
  private with(constraint: Constraint) { return new MockQuery(this.path, [...this.constraints, constraint], this.type); }
  where(field: string, op: string, value: any) { return this.with({ kind: 'where', field, op, value }); }
  orderBy(field: any, op = 'asc') { return this.with({ kind: 'orderBy', field: typeof field === 'string' ? field : '__name__', op }); }
  limit(value: number) { return this.with({ kind: 'limit', value }); }
  startAfter(...value: any[]) { return this.with({ kind: 'startAfter', value }); }
  select(..._fields: string[]) { return this; }
  doc(id = newId()) { return new MockQuery(`${this.path}/${id}`, [], 'document'); }
  collection(path: string) { return new MockQuery(`${this.path}/${path}`); }
  async get(): Promise<any> { return snapshot(this, await send({ kind: 'read', ref: this }), true); }
  async set(data: any, options?: { merge?: boolean }) { await send({ kind: 'commit', writes: [{ kind: 'set', path: this.path, data, merge: options?.merge }] }); }
  async update(data: any) { await send({ kind: 'commit', writes: [{ kind: 'update', path: this.path, data }] }); }
  async delete() { await send({ kind: 'commit', writes: [{ kind: 'delete', path: this.path }] }); }
  async add(data: any) { const ref = this.doc(); await ref.set(data); return ref; }
}

function documentSnapshot(path: string, data: any, admin: boolean): any {
  const exists = data !== undefined;
  return { id: path.split('/').pop(), ref: admin ? new MockQuery(path, [], 'document') : reference('document', null, path),
    exists: admin ? exists : () => exists, data: () => exists ? decode(encode(data)) : undefined,
    get: (key: string) => key.split('.').reduce((value, part) => value?.[part], decode(data)),
    metadata: { fromCache: false, hasPendingWrites: false },
  };
}
function snapshot(ref: Reference, result: Result, admin = false): any {
  if (ref.type === 'document') return documentSnapshot(ref.path, result.documents[0]?.data, admin);
  const docs = result.documents.map(item => documentSnapshot(item.path, item.data, admin));
  return { docs, size: docs.length, empty: !docs.length, forEach: (callback: any) => docs.forEach(callback), metadata: { fromCache: false, hasPendingWrites: false } };
}

function batch() {
  const writes: Mutation[] = [];
  const api = {
    set(ref: Reference, data: any, options?: { merge?: boolean }) { writes.push({ kind: 'set', path: ref.path, data, merge: options?.merge }); return api; },
    update(ref: Reference, data: any) { writes.push({ kind: 'update', path: ref.path, data }); return api; },
    delete(ref: Reference) { writes.push({ kind: 'delete', path: ref.path }); return api; },
    create(ref: Reference, data: any) { writes.push({ kind: 'create', path: ref.path, data }); return api; },
    commit: (revision?: number) => send({ kind: 'commit', writes, revision }),
  };
  return api;
}
async function transaction(callback: (tx: any) => Promise<any>, admin = false) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const writes = batch();
    let revision: number | undefined;
    try {
      const value = await callback({ ...writes, get: async (ref: Reference) => {
        const result = await send({ kind: 'read', ref });
        if (revision !== undefined && revision !== result.revision) throw new Error('MOCK_CONFLICT');
        revision = result.revision;
        return snapshot(ref, result, admin);
      } });
      await writes.commit(revision);
      return value;
    } catch (error) { if (!(error instanceof Error) || error.message !== 'MOCK_CONFLICT' || attempt === 4) throw error; }
  }
}

export const mockSdk = {
  collection: (parent: any, ...segments: string[]) => reference('collection', parent, ...segments),
  doc: (parent: any, ...segments: string[]) => reference('document', parent, ...(segments.length ? segments : [newId()])),
  query: (ref: Reference, ...constraints: Constraint[]) => ({ ...ref, constraints: [...(ref.constraints || []), ...constraints] }),
  where: (field: string, op: string, value: any): Constraint => ({ kind: 'where', field, op, value }),
  orderBy: (field: string, op = 'asc'): Constraint => ({ kind: 'orderBy', field, op }),
  limit: (value: number): Constraint => ({ kind: 'limit', value }),
  getDoc: async (ref: Reference) => snapshot(ref, await send({ kind: 'read', ref })),
  getDocs: async (ref: Reference) => snapshot(ref, await send({ kind: 'read', ref })),
  setDoc: (ref: Reference, data: any, options?: { merge?: boolean }) => batch().set(ref, data, options).commit(),
  updateDoc: (ref: Reference, data: any) => batch().update(ref, data).commit(),
  deleteDoc: (ref: Reference) => batch().delete(ref).commit(),
  addDoc: async (ref: Reference, data: any) => { const created = reference('document', ref, newId()); await batch().set(created, data).commit(); return created; },
  arrayUnion: (...values: any[]) => ({ __mockTransform: 'union', values }),
  arrayRemove: (...values: any[]) => ({ __mockTransform: 'remove', values }),
  writeBatch: () => batch(),
  runTransaction: (_db: any, callback: (tx: any) => Promise<any>) => transaction(callback),
  onSnapshot: (ref: Reference, ...args: any[]) => {
    const observer = args.find(arg => typeof arg === 'function' || typeof arg?.next === 'function');
    const next = typeof observer === 'function' ? observer : observer?.next?.bind(observer);
    const error = typeof observer === 'function' ? args[args.indexOf(observer) + 1] : observer?.error?.bind(observer);
    let stopped = false;
    let previous = '';
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await send({ kind: 'read', ref });
        const serialized = JSON.stringify(result.documents);
        if (!stopped && previous !== serialized) { previous = serialized; next?.(snapshot(ref, result)); }
      } catch (err) { if (!stopped) { stopped = true; if (error) error(err); else console.error('Mock listener:', err); } }
      if (!stopped) timer = setTimeout(poll, 1500);
    };
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  },
};

export const mockAdminDb = {
  collection: (path: string) => new MockQuery(path),
  doc: (path: string) => new MockQuery(path, [], 'document'),
  batch,
  runTransaction: (callback: (tx: any) => Promise<any>) => transaction(callback, true),
};