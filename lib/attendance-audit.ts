import type { HomeworkSubmission } from '@/app/firebase/services/types';

export const AUDIT_STAFF_PAGE_SIZE = 10;
export const AUDIT_HOMEWORK_PAGE_SIZE = 5;
export const AUDIT_SUBMISSION_PAGE_SIZE = 20;
export interface AuditRangeRow { type: string; total: number; feedback: number; within: number }
export interface AuditDailyRow extends AuditRangeRow { date: string }
export interface AuditRangePage { rows: AuditRangeRow[]; dailyRows: AuditDailyRow[]; scanned: number; nextCursor: string | null; fetchedAt: string }
export function vietnamDate(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function validAuditDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
export function auditWindow(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const closeMonth = day > 20 ? month : month - 1;
  const end = new Date(Date.UTC(year, closeMonth, 20)).toISOString().slice(0, 10);
  const start = new Date(Date.UTC(year, closeMonth - 1, 21)).toISOString().slice(0, 10);
  const threeDays = new Date(Date.parse(date) + 3 * 86400000).toISOString().slice(0, 10);
  const deadlineDate = threeDays < end ? threeDays : end;
  return { start, end, deadlineDate, deadline: new Date(`${deadlineDate}T23:59:59.999+07:00`).toISOString() };
}
export type FeedbackTiming = 'missing' | 'other' | 'unknown' | 'late' | 'within';
export function feedbackTiming(sub: HomeworkSubmission, staffId: string, date: string): FeedbackTiming {
  if (!sub.feedback?.trim()) return 'missing';
  if (!sub.feedbackBy) return 'unknown';
  if (sub.feedbackBy !== staffId) return 'other';
  // Require an explicit timezone; never interpret legacy timestamps in the server timezone.
  if (!sub.feedbackAt || !/(Z|[+-]\d{2}:\d{2})$/i.test(sub.feedbackAt)) return 'unknown';
  const timestamp = Date.parse(sub.feedbackAt);
  if (!Number.isFinite(timestamp) || timestamp < Date.parse(`${date}T00:00:00+07:00`)) return 'unknown';
  return timestamp <= Date.parse(auditWindow(date).deadline) ? 'within' : 'late';
}
export interface AuditStaff { id: string; name: string; role: string; assignedFeedbackTypes: string[] }
export interface AuditGroup { type: string; total: number; minimum: number; within: number; late: number; unknown: number; other: number; missing: number }
export interface AuditHomework { id: string; student: string; studentId: string; version: string; groups: AuditGroup[] }
export interface AuditStaffPage { staff: AuditStaff[]; nextCursor: string | null }
export interface AuditDayPage {
  staff: AuditStaff; date: string; window: ReturnType<typeof auditWindow>; homework: AuditHomework[]; nextCursor: string | null; fetchedAt: string;
}
export interface AuditDetailPage {
  submissions: (HomeworkSubmission & { timing: FeedbackTiming })[]; total: number; page: number; hasNext: boolean; fetchedAt: string;
}
export function summarizeAudit(submissions: HomeworkSubmission[], types: string[], staffId: string, date: string): AuditGroup[] {
  return [...new Set(types)].flatMap(type => {
    const items = submissions.filter(sub => sub.type === type);
    if (!items.length) return [];
    const counts = { within: 0, late: 0, unknown: 0, other: 0, missing: 0 };
    for (const sub of items) counts[feedbackTiming(sub, staffId, date)]++;
    return [{ type, total: items.length, minimum: Math.ceil(items.length * 0.3), ...counts }];
  });
}