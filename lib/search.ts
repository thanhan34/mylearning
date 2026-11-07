/** Normalize Vietnamese text for case- and accent-insensitive substring search. */
export function normalizeSearch(value: string): string {
  return value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
}