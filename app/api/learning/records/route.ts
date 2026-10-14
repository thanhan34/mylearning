import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const actor = await currentAccount();
    const kind = new URL(request.url).searchParams.get('kind');
    if (kind !== 'mocktests') throw new AccessError('Loại dữ liệu không hợp lệ.', 400);
    // Mocktests have no exercise type: do not infer permission from former class membership.
    const all = actor.role === 'admin';
    const collection = adminDb().collection('mocktests');
    const snapshot = await (all ? collection : collection.where('studentId', '==', actor.id)).limit(500).get();
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return { ...data, id: doc.id, submittedAt: data.submittedAt?.toDate?.().toISOString() || data.submittedAt || null };
    });
    let students: { id: string; name: string }[] = [];
    if (all) {
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
        await db.collection('mocktests').doc(body.id).update({ feedback: body.feedback, teacherId: actor.id, feedbackByName: actor.name || actor.email });
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