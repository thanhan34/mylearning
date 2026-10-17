'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { subscribeToNotifications, markNotificationAsRead } from '@/app/firebase/services/notification';
import { createNotificationStore, EMPTY_NOTIFICATIONS, NotificationRole } from '@/lib/notification-store';

const store = createNotificationStore(subscribeToNotifications);
const serverSnapshot = () => EMPTY_NOTIFICATIONS;

export function useNotifications(email: string | null, role: NotificationRole) {
  const subscribe = useCallback((notify: () => void) => email
    ? store.subscribe(email, role, notify) : () => {}, [email, role]);
  const snapshot = useCallback(() => email ? store.getSnapshot(email, role) : EMPTY_NOTIFICATIONS, [email, role]);
  const state = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const markAsRead = useCallback(async (id: string) => {
    if (!email) return false;
    const success = await markNotificationAsRead(id);
    if (success) store.remove(email, role, id);
    return success;
  }, [email, role]);
  return { ...state, markAsRead };
}