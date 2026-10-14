import type { AuditRangePage, AuditRangeRow, AuditDailyRow } from './attendance-audit';

// Each request remains paginated. Pause after 100 pages to bound automatic reads.
export const RANGE_AUTO_PAGE_LIMIT = 100;
export async function loadAttendanceRange(options: {
  after: string | null;
  fetchPage: (after: string | null) => Promise<AuditRangePage>;
  shouldStop: () => boolean;
  onPage: (page: AuditRangePage) => void;
}): Promise<void> {
  let after = options.after;
  const seen = new Set<string>();
  if (after) seen.add(after);
  for (let count = 0; count < RANGE_AUTO_PAGE_LIMIT; count++) {
    if (options.shouldStop()) return;
    const page = await options.fetchPage(after);
    if (page.nextCursor && seen.has(page.nextCursor)) throw new Error('Con trỏ thống kê bị lặp. Hãy xem thống kê lại từ đầu.');
    options.onPage(page);
    after = page.nextCursor;
    if (!after) return;
    seen.add(after);
  }
}

export function mergeAttendanceRows(previous: AuditRangeRow[], incoming: AuditRangeRow[]): AuditRangeRow[] {
  if (previous.length && (previous.length !== incoming.length || previous.some(row => !incoming.some(next => next.type === row.type)))) {
    throw new Error('Phân công đã thay đổi trong khi tải. Hãy xem thống kê lại từ đầu.');
  }
  return incoming.map(row => {
    const old = previous.find(value => value.type === row.type);
    return { type: row.type, total: row.total + (old?.total || 0), feedback: row.feedback + (old?.feedback || 0), within: row.within + (old?.within || 0) };
  });
}

export function mergeAttendanceDailyRows(previous: AuditDailyRow[], incoming: AuditDailyRow[]): AuditDailyRow[] {
  const merged = new Map<string, AuditDailyRow>();
  for (const row of [...previous, ...incoming]) {
    const key = JSON.stringify([row.date, row.type]);
    const old = merged.get(key);
    merged.set(key, { ...row, total: row.total + (old?.total || 0), feedback: row.feedback + (old?.feedback || 0), within: row.within + (old?.within || 0) });
  }
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

// Include zero-submission days without issuing extra reads or inferring attendance.
export function completeAttendanceDailyRows(rows: AuditDailyRow[], types: string[], start: string, end: string): AuditDailyRow[] {
  const existing = new Map(rows.map(row => [JSON.stringify([row.date, row.type]), row]));
  const result: AuditDailyRow[] = [];
  for (let time = Date.parse(start); time <= Date.parse(end); time += 86400000) {
    const date = new Date(time).toISOString().slice(0, 10);
    for (const type of [...new Set(types)].sort()) {
      result.push(existing.get(JSON.stringify([date, type])) || { date, type, total: 0, feedback: 0, within: 0 });
    }
  }
  return result;
}

export function summarizeAttendanceDays(rows: AuditDailyRow[]) {
  const days = new Map<string, AuditDailyRow[]>();
  for (const row of rows) {
    const items = days.get(row.date) || [];
    items.push(row);
    days.set(row.date, items);
  }
  const summary = { passed: 0, failed: 0, noSubmissions: 0, total: days.size };
  for (const items of days.values()) {
    const submitted = items.filter(row => row.total > 0);
    if (!submitted.length) summary.noSubmissions++;
    else if (submitted.every(row => row.feedback * 100 >= row.total * 30)) summary.passed++;
    else summary.failed++;
  }
  return summary;
}