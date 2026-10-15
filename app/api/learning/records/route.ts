import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';

export const dynamic = 'force-dynamic';
function recordVersion(data: Record<string, unknown>) {
  // Conflict token for the fields this mutation owns, not an authorization credential.
  return createHash('sha256').update(JSON.stringify(['feedback', 'teacherId', 'feedbackByName']
    .map(key => [Object.hasOwn(data, key), data[key]]))).digest('hex');
}
function recordView(doc: DocumentSnapshot, changes: Record<string, unknown> = {}): DocumentData & { id: string } {
  const data = { ...doc.data(), ...changes };
  return { ...data, id: doc.id, submittedAt: data.submittedAt?.toDate?.().toISOString() || data.submittedAt || null };
}
export async function GET(request: Request) {
  try {
    const actor = await currentAccount();
    const kind = new URL(request.url).searchParams.get('kind');
    if (kind !== 'mocktests') throw new AccessError('Loại dữ liệu không hợp lệ.', 400);
    // Mocktests have no exercise type: do not infer permission from former class membership.
    const all = actor.role === 'admin';
    const collection = adminDb().collection('mocktests');
    const snapshot = await (all ? collection : collection.where('studentId', '==', actor.id)).limit(500).get();
    const records = snapshot.docs.map(doc => ({ ...recordView(doc), recordVersion: recordVersion(doc.data()) }));
    let students: { id: string; name: string }[] = [];
    // Embedded legacy names win in every consumer. Only load the fallback directory
    // when it can affect a returned record; retain the existing role-filtered query.
    if (all && snapshot.docs.some(doc => !doc.data().studentName)) {
      const users = await adminDb().collection('users').where('role', '==', 'student').get();
      students = users.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.data().email }));
    }
    return NextResponse.json({ records, students });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const actor = await currentAccount();
    const body = await request.json();
    if (body.kind !== 'mocktests') throw new AccessError('Loại dữ liệu không hợp lệ.', 400);
    const db = adminDb();
    if (body.kind === 'mocktests') {
      if (body.id) {
        if (actor.role !== 'admin') throw new AccessError('Mocktest tổng hợp chỉ do admin feedback.');
        if (typeof body.id !== 'string' || body.id.includes('/') || typeof body.feedback !== 'string' || body.feedback.length > 20000) throw new AccessError('Dữ liệu không hợp lệ.', 400);
        if (body.expectedVersion !== undefined && (typeof body.expectedVersion !== 'string' || !/^[a-f0-9]{64}$/.test(body.expectedVersion))) throw new AccessError('Phiên bản dữ liệu không hợp lệ.', 400);
        const ref = db.collection('mocktests').doc(body.id);
        const record = await db.runTransaction(async tx => {
          const current = await tx.get(ref);
          if (!current.exists) throw new AccessError('Không tìm thấy Mocktest.', 404);
          if (body.expectedVersion !== undefined && body.expectedVersion !== recordVersion(current.data()!)) {
            throw new AccessError('Mocktest đã thay đổi. Bấm Tải lại trước khi lưu feedback.', 409);
          }
          const changes = { feedback: body.feedback, teacherId: actor.id, feedbackByName: actor.name || actor.email };
          const result = recordView(current, changes);
          tx.update(ref, changes);
          return { ...result, recordVersion: recordVersion({ ...current.data(), ...changes }) };
        });
        // A transaction result is not published until the outer commit is acknowledged.
        return NextResponse.json({ success: true, record });
      } else {
        if (actor.role !== 'student') throw new AccessError('Chỉ học viên nộp mocktest.');
        let url: URL;
        try { url = new URL(body.link); } catch { throw new AccessError('Link không hợp lệ.', 400); }
        if (!['http:', 'https:'].includes(url.protocol) || url.href.length > 10000) throw new AccessError('Link không hợp lệ.', 400);
        await db.collection('mocktests').add({ studentId: actor.id, studentName: actor.name || actor.email, link: url.href, submittedAt: Timestamp.now() });
      }
    } else throw new AccessError('Loại dữ liệu không hợp lệ.', 400);
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}