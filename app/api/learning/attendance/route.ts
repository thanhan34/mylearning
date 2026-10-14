import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, AccessError, apiError } from '@/lib/server/access';
import { AUDIT_STAFF_PAGE_SIZE, AUDIT_HOMEWORK_PAGE_SIZE, AUDIT_SUBMISSION_PAGE_SIZE, auditWindow, validAuditDate, vietnamDate, summarizeAudit, feedbackTiming } from '@/lib/attendance-audit';
import type { AuditStaff, AuditRangeRow, AuditDailyRow } from '@/lib/attendance-audit';
import type { HomeworkSubmission } from '@/app/firebase/services/types';

export const dynamic = 'force-dynamic';
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 1500 && !value.includes('/') && value !== '.' && value !== '..';
const json = (body: unknown) => NextResponse.json(body, { headers: { 'Cache-Control': 'private, no-store' } });
const encode = (scope: string, id: string) => Buffer.from(JSON.stringify({ scope, id })).toString('base64url');
function cursor(value: string | null, scope: string): string | null {
  if (value === null) return null;
  try {
    if (!value || value.length > 6000 || !/^[\w-]+$/.test(value)) throw new Error();
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (parsed.scope !== scope || !validId(parsed.id)) throw new Error();
    return parsed.id;
  } catch { throw new AccessError('Con trỏ phân trang không hợp lệ. Hãy tải lại từ trang đầu.', 400); }
}
function staffData(id: string, data: FirebaseFirestore.DocumentData): AuditStaff {
  return { id, name: data.name || data.email || id, role: data.role,
    assignedFeedbackTypes: Array.isArray(data.assignedFeedbackTypes) ? data.assignedFeedbackTypes.filter((type: unknown) => typeof type === 'string') : [] };
}
const versionOf = (data: FirebaseFirestore.DocumentData, staff: AuditStaff) => createHash('sha256')
  .update(JSON.stringify([data.date, data.userId, data.submissions || [], staff.assignedFeedbackTypes])).digest('hex');

// Read-only audit. Never infer a whole day's attendance from one page of homework.
export async function GET(request: Request) {
  try {
    const actor = await currentAccount();
    if (!['admin', 'admin_support'].includes(actor.role)) throw new AccessError('Chỉ admin và hỗ trợ admin được đối soát chấm công.');
    const params = new URL(request.url).searchParams;
    const mode = params.get('mode') || 'staff';
    const db = adminDb();
    if (mode === 'staff') {
      const after = cursor(params.get('after'), 'staff');
      let query = db.collection('users').where('role', 'in', ['teacher', 'assistant'])
        .orderBy(FieldPath.documentId()).limit(AUDIT_STAFF_PAGE_SIZE + 1);
      if (after) query = query.startAfter(after);
      const result = await query.get();
      const docs = result.docs.slice(0, AUDIT_STAFF_PAGE_SIZE);
      return json({ staff: docs.map(doc => staffData(doc.id, doc.data())),
        nextCursor: result.size > AUDIT_STAFF_PAGE_SIZE ? encode('staff', docs[docs.length - 1].id) : null });
    }
    if (mode === 'range') {
      const start = params.get('start');
      const end = params.get('end');
      const staffId = params.get('staffId');
      if (!validAuditDate(start) || !validAuditDate(end) || start > end || end > vietnamDate() ||
        Date.parse(end) - Date.parse(start) > 30 * 86400000 || !validId(staffId)) {
        throw new AccessError('Chọn khoảng ngày hợp lệ, tối đa 31 ngày và không vượt hôm nay.', 400);
      }
      const staffDoc = await db.collection('users').doc(staffId).get();
      if (!staffDoc.exists || !['teacher', 'assistant'].includes(staffDoc.data()?.role)) throw new AccessError('Không tìm thấy nhân sự.', 404);
      const staff = staffData(staffId, staffDoc.data()!);
      const types = [...new Set(staff.assignedFeedbackTypes)].sort();
      const scope = JSON.stringify([staffId, start, end, types]);
      let after: { date: string; id: string } | null = null;
      if (params.has('after')) {
        try {
          const token = params.get('after')!;
          if (!token || token.length > 6000) throw new Error();
          const parsed = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
          if (parsed.scope !== scope || !validId(parsed.id) || !validAuditDate(parsed.date) || parsed.date < start || parsed.date > end) throw new Error();
          after = parsed;
        } catch { throw new AccessError('Khoảng ngày hoặc phân công đã thay đổi. Hãy xem thống kê lại từ đầu.', 400); }
      }
      const rows: AuditRangeRow[] = types.map(type => ({ type, total: 0, feedback: 0, within: 0 }));
      const daily = new Map<string, AuditDailyRow>();
      if (!rows.length) return json({ rows, dailyRows: [], scanned: 0, nextCursor: null, fetchedAt: new Date().toISOString() });
      let query = db.collection('homework').where('date', '>=', start).where('date', '<=', end)
        .orderBy('date').orderBy(FieldPath.documentId()).limit(AUDIT_HOMEWORK_PAGE_SIZE + 1);
      if (after) query = query.startAfter(after.date, after.id);
      const result = await query.get();
      const docs = result.docs.slice(0, AUDIT_HOMEWORK_PAGE_SIZE);
      for (const doc of docs) {
        const data = doc.data();
        for (const sub of (data.submissions || []) as HomeworkSubmission[]) {
          const row = rows.find(row => row.type === sub.type);
          if (!row) continue;
          const key = JSON.stringify([data.date, sub.type]);
          const dayRow = daily.get(key) || { date: data.date, type: sub.type, total: 0, feedback: 0, within: 0 };
          daily.set(key, dayRow);
          const feedback = sub.feedback?.trim() && sub.feedbackBy === staffId ? 1 : 0;
          const within = feedbackTiming(sub, staffId, data.date) === 'within' ? 1 : 0;
          for (const target of [row, dayRow]) {
            target.total++;
            target.feedback += feedback;
            target.within += within;
          }
        }
      }
      const last = docs[docs.length - 1];
      return json({ rows, dailyRows: [...daily.values()], scanned: docs.length, fetchedAt: new Date().toISOString(),
        nextCursor: result.size > AUDIT_HOMEWORK_PAGE_SIZE ? Buffer.from(JSON.stringify({ scope, date: last.data().date, id: last.id })).toString('base64url') : null });
    }
    if (!['day', 'detail'].includes(mode)) throw new AccessError('Chế độ không hợp lệ.', 400);
    const date = params.get('date');
    const staffId = params.get('staffId');
    if (!validAuditDate(date) || date > vietnamDate() || !validId(staffId)) throw new AccessError('Ngày hoặc nhân sự không hợp lệ.', 400);
    const scope = `day:${staffId}:${date}`;
    const after = cursor(params.get('after'), scope);
    const documentId = params.get('documentId');
    const type = params.get('type');
    const pageText = params.get('page') || '0';
    if (mode === 'detail' && (!validId(documentId) || !type || !/^\d{1,6}$/.test(pageText) || !/^[a-f0-9]{64}$/.test(params.get('version') || ''))) {
      throw new AccessError('Tham số chi tiết không hợp lệ.', 400);
    }
    const staffDoc = await db.collection('users').doc(staffId).get();
    if (!staffDoc.exists || !['teacher', 'assistant'].includes(staffDoc.data()?.role)) throw new AccessError('Không tìm thấy giáo viên/trợ giảng.', 404);
    const staff = staffData(staffId, staffDoc.data()!);
    if (mode === 'day') {
      if (!staff.assignedFeedbackTypes.length) return json({ staff, date, window: auditWindow(date), homework: [], nextCursor: null, fetchedAt: new Date().toISOString() });
      let query = db.collection('homework').where('date', '==', date).orderBy(FieldPath.documentId()).limit(AUDIT_HOMEWORK_PAGE_SIZE + 1);
      if (after) query = query.startAfter(after);
      const result = await query.get();
      const docs = result.docs.slice(0, AUDIT_HOMEWORK_PAGE_SIZE);
      return json({ staff, date, window: auditWindow(date), fetchedAt: new Date().toISOString(),
        homework: docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, studentId: data.userId || '', student: data.userName || data.userId || 'Chưa rõ học viên',
            version: versionOf(data, staff), groups: summarizeAudit(data.submissions || [], staff.assignedFeedbackTypes, staff.id, date) };
        }), nextCursor: result.size > AUDIT_HOMEWORK_PAGE_SIZE ? encode(scope, docs[docs.length - 1].id) : null });
    }
    if (!staff.assignedFeedbackTypes.includes(type!)) throw new AccessError('Dạng bài không thuộc phân công hiện tại.', 409);
    const doc = await db.collection('homework').doc(documentId!).get();
    const data = doc.data();
    if (!doc.exists || data?.date !== date) throw new AccessError('Không tìm thấy hồ sơ trong ngày đã chọn.', 404);
    if (versionOf(data!, staff) !== params.get('version')) throw new AccessError('Bài nộp, feedback hoặc phân công đã thay đổi. Đóng chi tiết và bấm Làm mới dữ liệu để tải lại từ trang đầu.', 409);
    const submissions: HomeworkSubmission[] = (data!.submissions || []).filter((sub: HomeworkSubmission) => sub.type === type);
    const page = Number(pageText);
    const offset = page * AUDIT_SUBMISSION_PAGE_SIZE; // Slice embedded array, never a Firestore query offset.
    if (offset >= submissions.length && page > 0) throw new AccessError('Trang chi tiết không tồn tại.', 400);
    return json({ page, total: submissions.length, hasNext: offset + AUDIT_SUBMISSION_PAGE_SIZE < submissions.length, fetchedAt: new Date().toISOString(),
      submissions: submissions.slice(offset, offset + AUDIT_SUBMISSION_PAGE_SIZE).map(sub => ({
        id: sub.id || '', type: sub.type, questionNumber: sub.questionNumber, date,
        link: sub.link || '', feedback: sub.feedback || '', feedbackBy: sub.feedbackBy || '',
        feedbackByName: sub.feedbackByName || '', feedbackByRole: sub.feedbackByRole || '', feedbackAt: sub.feedbackAt || '',
        timing: feedbackTiming(sub, staff.id, date),
      })) });
  } catch (error) { return apiError(error); }
}