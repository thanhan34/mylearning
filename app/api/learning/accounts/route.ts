import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';
import { EXERCISE_TYPES, isApproved, LearningAccount } from '@/lib/learning-access';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    const actor = await currentAccount();
    if (actor.role !== 'admin') throw new AccessError('Chỉ admin được quản lý tài khoản.');
    const snapshot = await adminDb().collection('users').get();
    return NextResponse.json({ accounts: snapshot.docs.map(doc => {
      const data = { ...doc.data(), id: doc.id } as LearningAccount;
      return { id: data.id, email: data.email, name: data.name || '', role: data.role,
        approvalStatus: isApproved(data) ? 'approved' : 'pending', assignedFeedbackTypes: data.assignedFeedbackTypes || [] };
    }) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const actor = await currentAccount();
    if (actor.role !== 'admin') throw new AccessError('Chỉ admin được phân quyền.');
    const body = await request.json();
    if (typeof body.id !== 'string' || !body.id || body.id.includes('/')) throw new AccessError('Tài khoản không hợp lệ.', 400);
    const db = adminDb();
    await db.runTransaction(async tx => {
      const actorDoc = await tx.get(db.collection('users').doc(actor.id));
      const ref = db.collection('users').doc(body.id);
      const target = await tx.get(ref);
      if (actorDoc.data()?.role !== 'admin') throw new AccessError('Quyền admin đã thay đổi.');
      if (!target.exists) throw new AccessError('Không tìm thấy tài khoản.', 404);
      if (body.action === 'approve' && target.data()?.role === 'student') {
        tx.update(ref, { approvalStatus: 'approved', approvedBy: actor.id, approvedAt: new Date().toISOString() });
      } else if (body.action === 'assign-types' && ['teacher', 'assistant'].includes(target.data()?.role)) {
        if (!Array.isArray(body.types) || body.types.some((type: unknown) => !EXERCISE_TYPES.includes(type as typeof EXERCISE_TYPES[number]))) {
          throw new AccessError('Danh sách dạng bài không hợp lệ.', 400);
        }
        tx.update(ref, { assignedFeedbackTypes: [...new Set(body.types)], permissionsUpdatedBy: actor.id, permissionsUpdatedAt: new Date().toISOString() });
      } else if (body.action === 'role' && ['student', 'teacher', 'assistant'].includes(body.role) && target.data()?.role !== 'admin') {
        tx.update(ref, { role: body.role, assignedFeedbackTypes: [], approvalStatus: 'pending' });
      } else throw new AccessError('Thao tác không hợp lệ.', 400);
    });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}