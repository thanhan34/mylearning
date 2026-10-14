// Browser-only, bounded cache. Never share account data across server requests.
type Entry = { promise: Promise<unknown>; expiresAt: number };
const entries = new Map<string, Entry>();
const MAX_ENTRIES = 200;

export function invalidateCache(prefix = '') {
  for (const key of entries.keys()) {
    if (key.startsWith(prefix)) entries.delete(key);
  }
}

export function cachedRequest<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  if (typeof window === 'undefined') return loader();
  const now = Date.now();
  const cached = entries.get(key);
  if (cached && cached.expiresAt > now) return cached.promise as Promise<T>;
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
  if (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value!);
  const entry: Entry = { promise: Promise.resolve(), expiresAt: now + ttlMs };
  entry.promise = Promise.resolve().then(loader).catch(error => {
    if (entries.get(key) === entry) entries.delete(key);
    throw error;
  });
  entries.set(key, entry);
  return entry.promise as Promise<T>;
}