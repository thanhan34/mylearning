import { NextResponse } from 'next/server';
import { Timestamp, FieldPath } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';
import { canFeedback, isApproved, LearningAccount } from '@/lib/learning-access';
import { homeworkLinkKey, parseHomeworkLinks } from '@/lib/homework-links';
import type { HomeworkSubmission } from '@/app/firebase/services/types';

export const dynamic = 'force-dynamic';
const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(new Date(date).getTime()) && new Date(date).toISOString().slice(0, 10) === date;

export async function GET(request: Request) {
  try {
    const actor = await currentAccount();
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const hasRange = startDate !== null || endDate !== null;
    if (hasRange && (date !== null || !validDate(startDate) || !validDate(endDate) || startDate > endDate)) {
      throw new AccessError('Khoảng ngày nộp không hợp lệ. Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 400);
    }
    const paged = url.searchParams.get('paged') === '1';
    const after = url.searchParams.get('after');
    if (paged && ((!date && !hasRange) || (after && (after.includes('/') || after.length > 1500)))) throw new AccessError('Tham số phân trang không hợp lệ.', 400);
    let rangeCursor: { date: string; id: string } | null = null;
    if (paged && hasRange && after) {
      try {
        rangeCursor = JSON.parse(after);
        if (!rangeCursor || !validDate(rangeCursor.date) || typeof rangeCursor.id !== 'string' || !rangeCursor.id ||
          rangeCursor.date < startDate! || rangeCursor.date > endDate!) throw new Error('Invalid cursor');
      } catch { throw new AccessError('Tham số phân trang không hợp lệ.', 400); }
    }
    if (date && !validDate(date)) throw new AccessError('Ngày không hợp lệ.', 400);
    if (!['student', 'admin', 'admin_support'].includes(actor.role) && !actor.assignedFeedbackTypes?.length) {
      return NextResponse.json({ homework: [], truncated: false, nextCursor: null });
    }
    let query = adminDb().collection('homework').limit(paged ? 21 : 501);
    if (actor.role === 'student') query = query.where('userId', '==', actor.id);
    if (hasRange) query = query.where('date', '>=', startDate).where('date', '<=', endDate).orderBy('date', 'desc');
    else if (date) query = query.where('date', '==', date);
    else {
      const start = new Date(); start.setDate(start.getDate() - 30);
      query = query.where('date', '>=', start.toISOString().slice(0, 10)).orderBy('date', 'desc');
    }
    if (paged) {
      // Match the date index's implicit document ID direction to avoid a custom index.
      query = query.orderBy(FieldPath.documentId(), hasRange ? 'desc' : 'asc');
      if (rangeCursor) query = query.startAfter(rangeCursor.date, rangeCursor.id);
      else if (after) query = query.startAfter(after);
    }
    const snapshot = await query.get();
    const pageSize = paged ? 20 : 500;
    const docs = snapshot.docs.slice(0, pageSize);
    const homework = docs.map(doc => {
      const data = doc.data();
      return { id: doc.id, userId: data.userId, userName: data.userName || data.userId, date: data.date,
        submissions: (data.submissions || []).filter((sub: HomeworkSubmission) => actor.role === 'student' || actor.role === 'admin_support' || canFeedback(actor, sub.type)) };
    }).filter(item => item.submissions.length);
    return NextResponse.json({ homework, truncated: snapshot.size > pageSize,
      nextCursor: paged && snapshot.size > pageSize ? (hasRange
        ? JSON.stringify({ date: docs[docs.length - 1].data().date, id: docs[docs.length - 1].id })
        : docs[docs.length - 1].id) : null });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await currentAccount();
    const body = await request.json();
    if (!validDate(body.date) || !Array.isArray(body.submissions) || !body.submissions.length || body.submissions.length > 200) {
      throw new AccessError('Bài nộp không hợp lệ.', 400);
    }
    // Never accept ownership, feedback or question numbering supplied by the browser.
    const incoming = body.submissions.map((sub: HomeworkSubmission) => {
      if (typeof sub.link !== 'string' || sub.link.length > 10000) throw new AccessError('Link không hợp lệ.', 400);
      const parsed = parseHomeworkLinks(sub.link);
      if (parsed.length !== 1 || parsed[0].error || !parsed[0].type) throw new AccessError('Link bài tập không hợp lệ.', 400);
      const item = parsed[0];
      return { type: item.type!, link: item.title ? `${item.title} ${item.url}` : item.url };
    });
    const db = adminDb();
    const ref = db.collection('homework').doc(`${actor.id}_${body.date}`);
    await db.runTransaction(async tx => {
      const currentActor = await tx.get(db.collection('users').doc(actor.id));
      if (!currentActor.exists || !isApproved({ ...currentActor.data(), id: actor.id } as LearningAccount)) throw new AccessError('Tài khoản chưa được duyệt.');
      const existing = await tx.get(db.collection('homework').where('userId', '==', actor.id).where('date', '==', body.date));
      const target = existing.docs[0]?.ref || ref;
      const submissions: HomeworkSubmission[] = existing.docs[0]?.data().submissions || [];
      const seen = new Set(submissions.map(sub => homeworkLinkKey(sub.link)));
      for (const item of incoming) {
        const key = homeworkLinkKey(item.link);
        if (seen.has(key)) continue;
        seen.add(key);
        const questionNumber = Math.max(0, ...submissions.filter(sub => sub.type === item.type).map(sub => sub.questionNumber)) + 1;
        submissions.push({ ...item, id: randomUUID(), date: body.date, questionNumber });
      }
      tx.set(target, { userId: actor.id, userName: actor.name || actor.email, date: body.date, submissions, timestamp: Timestamp.now() }, { merge: true });
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const actor = await currentAccount();
    const body = await request.json();
    if (!validDate(body.date) || typeof body.link !== 'string') throw new AccessError('Yêu cầu không hợp lệ.', 400);
    const parsed = parseHomeworkLinks(body.link);
    if (parsed.length !== 1 || parsed[0].error || parsed[0].type !== body.type) throw new AccessError('Link phải cùng dạng bài gốc.', 400);
    const item = parsed[0];
    const link = item.title ? `${item.title} ${item.url}` : item.url;
    const db = adminDb();
    await db.runTransaction(async tx => {
      const current = await tx.get(db.collection('users').doc(actor.id));
      if (!current.exists || !isApproved({ ...current.data(), id: actor.id } as LearningAccount)) throw new AccessError('Tài khoản chưa được duyệt.');
      const docs = await tx.get(db.collection('homework').where('userId', '==', actor.id).where('date', '==', body.date));
      const doc = docs.docs[0];
      if (!doc) throw new AccessError('Không tìm thấy bài nộp.', 404);
      const submissions: HomeworkSubmission[] = doc.data().submissions || [];
      const index = submissions.findIndex(sub => body.id ? sub.id === body.id : sub.type === body.type && sub.questionNumber === body.questionNumber);
      if (index < 0 || submissions[index].link !== body.originalLink) throw new AccessError('Bài đã thay đổi. Vui lòng tải lại.', 409);
      if (submissions.some((sub, i) => i !== index && homeworkLinkKey(sub.link) === homeworkLinkKey(link))) throw new AccessError('Link đã được nộp.', 409);
      submissions[index] = { ...submissions[index], link };
      tx.update(doc.ref, { submissions, timestamp: Timestamp.now() });
    });
    return NextResponse.json({ link });
  } catch (error) { return apiError(error); }
}