import { createSeed, createExpandedSeed, MockData, MockDocuments } from './seed';

export interface Constraint { kind: 'where' | 'orderBy' | 'limit' | 'startAfter'; field?: string; op?: string; value?: any; }
export interface Reference { path: string; type: 'document' | 'collection'; constraints?: Constraint[]; }
export interface Mutation { kind: 'set' | 'update' | 'delete' | 'create'; path: string; data?: MockData; merge?: boolean; }
export interface Command { kind: 'read' | 'commit'; ref?: Reference; writes?: Mutation[]; revision?: number; }
export interface Result { documents: { path: string; data: MockData }[]; revision: number; }
interface Store { documents: MockDocuments; revision: number; seedVersion?: number; }
const SEED_VERSION = 2;
const globalStore = globalThis as typeof globalThis & { __learningMockStore?: Store };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const field = (data: MockData, key: string): any => key.split('.').reduce((value, part) => value?.[part], data);
const scalar = (value: any): any => value?.__mockTimestamp ?? value;
const equal = (a: any, b: any) => JSON.stringify(a) === JSON.stringify(b);
const compare = (a: any, b: any) => scalar(a) < scalar(b) ? -1 : scalar(a) > scalar(b) ? 1 : 0;

function matches(actual: any, op: string, expected: any): boolean {
  switch (op) {
    case '==': return equal(actual, expected);
    case '!=': return actual !== undefined && !equal(actual, expected);
    case '<': return actual !== undefined && compare(actual, expected) < 0;
    case '<=': return actual !== undefined && compare(actual, expected) <= 0;
    case '>': return actual !== undefined && compare(actual, expected) > 0;
    case '>=': return actual !== undefined && compare(actual, expected) >= 0;
    case 'in': return expected.some((value: any) => equal(actual, value));
    case 'not-in': return actual !== undefined && !expected.some((value: any) => equal(actual, value));
    case 'array-contains': return Array.isArray(actual) && actual.some(value => equal(value, expected));
    case 'array-contains-any': return Array.isArray(actual) && actual.some(value => expected.some((item: any) => equal(value, item)));
    default: throw new Error(`Mock query operator not supported: ${op}`);
  }
}

function applyFields(target: MockData, values: MockData) {
  for (const [key, value] of Object.entries(values)) {
    const parts = key.split('.');
    if (parts.some(part => ['__proto__', 'constructor', 'prototype'].includes(part))) throw new Error('Invalid field');
    let parent = target;
    for (const part of parts.slice(0, -1)) parent = parent[part] ||= {};
    const leaf = parts[parts.length - 1];
    if (value?.__mockTransform) {
      const previous = Array.isArray(parent[leaf]) ? parent[leaf] : [];
      if (value.__mockTransform === 'union') parent[leaf] = [...previous, ...value.values.filter((item: any) => !previous.some((old: any) => equal(old, item)))];
      else if (value.__mockTransform === 'remove') parent[leaf] = previous.filter((item: any) => !value.values.some((old: any) => equal(old, item)));
      else throw new Error('Unsupported mock transform');
    } else parent[leaf] = clone(value);
  }
}

// One authoritative store on the Next.js server, shared by browser SDK calls and Admin APIs.
// Synchronous commits are atomic within this single development process.
export function execute(command: Command): Result {
  const store = globalStore.__learningMockStore ||= { documents: createSeed(), revision: 0, seedVersion: SEED_VERSION };
  // Hot reload preserves globalThis. Upgrade older stores without resetting demo edits.
  if ((store.seedVersion ?? 0) < SEED_VERSION) {
    const additions = createExpandedSeed();
    if ((store.seedVersion ?? 0) < 1) additions['users/mock-admin_support'] = createSeed()['users/mock-admin_support'];
    let changed = false;
    for (const [path, data] of Object.entries(additions)) {
      if (!store.documents[path]) { store.documents[path] = data; changed = true; }
    }
    if (changed) store.revision++;
    store.seedVersion = SEED_VERSION;
  }
  if (command.kind === 'commit') {
    if (command.revision !== undefined && command.revision !== store.revision) throw new Error('MOCK_CONFLICT');
    const next = clone(store.documents);
    for (const write of command.writes || []) {
      if (!write.path || write.path.split('/').length % 2 !== 0 || /(^|\/)(__proto__|constructor|prototype)(\/|$)/.test(write.path)) throw new Error('Invalid document path');
      if (write.kind === 'delete') { delete next[write.path]; continue; }
      if (write.kind === 'update' && !next[write.path]) throw new Error('Document does not exist');
      if (write.kind === 'create' && next[write.path]) throw new Error('Document already exists');
      const data = write.kind === 'update' || write.merge ? next[write.path] || {} : {};
      applyFields(data, write.data || {});
      next[write.path] = data;
    }
    store.documents = next;
    store.revision++;
    return { documents: [], revision: store.revision };
  }
  if (command.kind !== 'read' || !command.ref) throw new Error('Invalid mock command');
  const ref = command.ref;
  let documents = Object.entries(store.documents).filter(([path]) => ref.type === 'document' ? path === ref.path : path.startsWith(`${ref.path}/`) && path.split('/').length === ref.path.split('/').length + 1)
    .map(([path, data]) => ({ path, data: clone(data) }));
  const constraints = ref.constraints || [];
  const valueOf = (item: typeof documents[number], key: string) => key === '__name__' ? item.path.split('/').pop() : field(item.data, key);
  for (const constraint of constraints.filter(c => c.kind === 'where')) documents = documents.filter(item => matches(valueOf(item, constraint.field!), constraint.op!, constraint.value));
  const ordering = constraints.filter(c => c.kind === 'orderBy');
  if (!ordering.length) ordering.push({ kind: 'orderBy', field: '__name__', op: 'asc' });
  documents = documents.filter(item => ordering.every(order => valueOf(item, order.field!) !== undefined));
  const compareValues = (item: typeof documents[number], values: any[]) => {
    for (let i = 0; i < values.length; i++) {
      const order = ordering[i];
      if (!order) throw new Error('Unsupported mock cursor');
      const result = compare(valueOf(item, order.field!), values[i]) * (order.op === 'desc' ? -1 : 1);
      if (result) return result;
    }
    return 0;
  };
  documents.sort((a, b) => compareValues(a, ordering.map(order => valueOf(b, order.field!))) || compare(a.path, b.path));
  const after = constraints.find(c => c.kind === 'startAfter');
  if (after) documents = documents.filter(item => compareValues(item, after.value) > 0);
  const limit = constraints.find(c => c.kind === 'limit');
  if (limit) documents = documents.slice(0, limit.value);
  return { documents, revision: store.revision };
}