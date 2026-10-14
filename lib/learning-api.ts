import { invalidateCache } from './client-cache';

export async function learningApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api/learning/${path}`, {
    ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.');
  // Invalidate after success, including mutations made outside the legacy services.
  if ((options?.method || 'GET').toUpperCase() !== 'GET') {
    invalidateCache('homework:');
    invalidateCache('attendance:');
  }
  return data as T;
}