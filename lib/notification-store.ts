import type { Notification } from '@/app/firebase/services/types';

export type NotificationRole = 'teacher' | 'admin' | 'assistant';
export interface NotificationState {
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
}
type Start = (email: string, role: NotificationRole, next: (items: Notification[]) => void,
  error: (error: Error) => void, signal: AbortSignal) => Promise<() => void>;
const LOADING: NotificationState = { notifications: [], isLoading: true, error: null };
export const EMPTY_NOTIFICATIONS: NotificationState = { notifications: [], isLoading: false, error: null };

// One stream per identity/role, shared across responsive UI consumers. No persistent cache.
export function createNotificationStore(start: Start) {
  type Entry = { state: NotificationState; observers: Set<() => void>; controller: AbortController;
    stop?: () => void; disposed: boolean };
  const entries = new Map<string, Entry>();
  const keyOf = (email: string, role: NotificationRole) => JSON.stringify([email, role]);
  function publish(entry: Entry, state: NotificationState) {
    if (entry.disposed || !entry.observers.size) return;
    entry.state = state;
    for (const notify of entry.observers) notify();
  }
  return {
    getSnapshot(email: string, role: NotificationRole): NotificationState {
      return entries.get(keyOf(email, role))?.state || LOADING;
    },
    subscribe(email: string, role: NotificationRole, notify: () => void) {
      const key = keyOf(email, role);
      let entry = entries.get(key);
      if (!entry) {
        entry = { state: LOADING, observers: new Set(), controller: new AbortController(), disposed: false };
        entries.set(key, entry);
        const current = entry;
        // Defer setup so Strict Mode's synchronous cleanup/remount shares the same lookup.
        void Promise.resolve().then(async () => {
          if (current.disposed) return;
          try {
            const stop = await start(email, role,
              items => publish(current, { notifications: items, isLoading: false, error: null }),
              error => publish(current, { notifications: [], isLoading: false, error: error.message }),
              current.controller.signal);
            if (current.disposed) stop();
            else current.stop = stop;
          } catch (error) {
            publish(current, { notifications: [], isLoading: false,
              error: error instanceof Error ? error.message : 'Error setting up notifications' });
          }
        });
      }
      const current = entry;
      // Wrap to reference-count even when a caller supplies the same callback twice.
      const observer = () => notify();
      current.observers.add(observer);
      let released = false;
      return () => {
        if (released) return;
        released = true;
        current.observers.delete(observer);
        if (current.observers.size) return;
        queueMicrotask(() => {
          if (current.observers.size || current.disposed) return;
          current.disposed = true;
          current.controller.abort();
          current.stop?.();
          if (entries.get(key) === current) entries.delete(key);
        });
      };
    },
    remove(email: string, role: NotificationRole, id: string) {
      const entry = entries.get(keyOf(email, role));
      if (entry) publish(entry, { ...entry.state,
        notifications: entry.state.notifications.filter(item => item.id !== id) });
    },
  };
}