import { NextResponse } from 'next/server';
import { FieldPath } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, AccessError } from '@/lib/server/access';

export const dynamic = 'force-dynamic';
const PAGE_SIZE = 20;
const validId = (value: unknown): value is string => typeof value === 'string' && !!value && value !== '.' && value !== '..' && !value.includes('/') && Buffer.byteLength(value, 'utf8') <= 1500;

// Read-only student history is available to staff. Feedback writes retain their
// separate exercise-type and authorship checks in the feedback endpoint.
export async function GET(request: Request) {
  try {
    const actor = await currentAccount();
    if (!['admin', 'teacher', 'assistant'].includes(actor.role)) throw new AccessError('Chỉ giáo viên, trợ giảng và admin được xem học viên.');
    const params = new URL(request.url).searchParams;
    const studentId = params.get('studentId');
    const after = params.get('after');
    const db = adminDb();
    if (studentId !== null) {
      if (!validId(studentId)) throw new AccessError('Học viên không hợp lệ.', 400);
      let cursor: { studentId: string; date: string; id: string } | null = null;
      if (after !== null) {
        try {
          if (after.length > 12000) throw new Error();
          cursor = JSON.parse(Buffer.from(after, 'base64url').toString('utf8'));
          if (!cursor || cursor.studentId !== studentId || !validId(cursor.id) || typeof cursor.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(cursor.date)) throw new Error();
        } catch { throw new AccessError('Tham số phân trang không hợp lệ.', 400); }
      }
      const studentDoc = await db.collection('users').doc(studentId).get();
      if (!studentDoc.exists || studentDoc.data()?.role !== 'student') throw new AccessError('Không tìm thấy học viên.', 404);
      const student = studentDoc.data()!;
      let query = db.collection('homework').where('userId', '==', studentId)
        .orderBy('date', 'desc').orderBy(FieldPath.documentId(), 'desc').limit(PAGE_SIZE + 1);
      if (cursor) query = query.startAfter(cursor.date, cursor.id);
      const snapshot = await query.get();
      const docs = snapshot.docs.slice(0, PAGE_SIZE);
      const last = docs[docs.length - 1];
      return NextResponse.json({
        student: { id: studentId, name: student.name || student.email || studentId, email: student.email || '' },
        homework: docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, userId: studentId, userName: student.name || student.email || studentId,
            date: data.date, submissions: data.submissions || [] };
        }),
        nextCursor: snapshot.size > PAGE_SIZE ? Buffer.from(JSON.stringify({ studentId, date: last.data().date, id: last.id })).toString('base64url') : null,
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    if (after !== null && !validId(after)) throw new AccessError('Tham số phân trang không hợp lệ.', 400);
    let query = db.collection('users').where('role', '==', 'student').orderBy(FieldPath.documentId()).limit(PAGE_SIZE + 1)
      .select('name', 'email');
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    const docs = snapshot.docs.slice(0, PAGE_SIZE);
    return NextResponse.json({
      students: docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.data().email || doc.id, email: doc.data().email || '' })),
      nextCursor: snapshot.size > PAGE_SIZE ? docs[docs.length - 1].id : null,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) { return apiError(error); }
}