import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';
import { EXERCISE_TYPES, isApproved, LearningAccount } from '@/lib/learning-access';

export const dynamic = 'force-dynamic';
function accountView(data: LearningAccount) {
  return { id: data.id, email: data.email, name: data.name || '', role: data.role,
    approvalStatus: isApproved(data) ? 'approved' : 'pending', assignedFeedbackTypes: data.assignedFeedbackTypes || [] };
}
export async function GET() {
  try {
    const actor = await currentAccount();
    if (!['admin', 'admin_support'].includes(actor.role)) throw new AccessError('Chỉ admin và hỗ trợ admin được xem tài khoản.');
    const users = adminDb().collection('users');
    const snapshot = await (actor.role === 'admin_support' ? users.where('role', '==', 'student') : users).get();
    return NextResponse.json({ accounts: snapshot.docs.map(doc => {
      const data = { ...doc.data(), id: doc.id } as LearningAccount;
      return accountView(data);
    }) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    const actor = await currentAccount();
    if (!['admin', 'admin_support'].includes(actor.role)) throw new AccessError('Bạn không có quyền quản lý tài khoản.');
    const body = await request.json();
    if (actor.role === 'admin_support' && body.action !== 'approve') throw new AccessError('Hỗ trợ admin chỉ được duyệt học viên.');
    if (typeof body.id !== 'string' || !body.id || body.id.includes('/')) throw new AccessError('Tài khoản không hợp lệ.', 400);
    const db = adminDb();
    const account = await db.runTransaction(async tx => {
      const actorDoc = await tx.get(db.collection('users').doc(actor.id));
      const ref = db.collection('users').doc(body.id);
      const target = await tx.get(ref);
      const liveRole = actorDoc.data()?.role;
      if (liveRole !== 'admin' && !(liveRole === 'admin_support' && body.action === 'approve')) {
        throw new AccessError('Quyền quản lý tài khoản đã thay đổi.');
      }
      if (!target.exists) throw new AccessError('Không tìm thấy tài khoản.', 404);
      if (liveRole === 'admin_support' && target.data()?.role !== 'student') throw new AccessError('Hỗ trợ admin chỉ được duyệt học viên.');
      let changes: Record<string, string | string[]>;
      if (body.action === 'approve' && target.data()?.role === 'student') {
        changes = { approvalStatus: 'approved', approvedBy: actor.id, approvedAt: new Date().toISOString() };
      } else if (body.action === 'assign-types' && ['teacher', 'assistant'].includes(target.data()?.role)) {
        if (!Array.isArray(body.types) || body.types.some((type: unknown) => !EXERCISE_TYPES.includes(type as typeof EXERCISE_TYPES[number]))) {
          throw new AccessError('Danh sách dạng bài không hợp lệ.', 400);
        }
        changes = { assignedFeedbackTypes: [...new Set<string>(body.types)], permissionsUpdatedBy: actor.id, permissionsUpdatedAt: new Date().toISOString() };
      } else if (body.action === 'role' && ['student', 'teacher', 'assistant', 'admin_support'].includes(body.role) && target.data()?.role !== 'admin') {
        changes = { role: body.role, assignedFeedbackTypes: [], approvalStatus: 'pending' };
      } else throw new AccessError('Thao tác không hợp lệ.', 400);
      tx.update(ref, changes);
      return accountView({ ...target.data(), ...changes, id: target.id } as LearningAccount);
    });
    return NextResponse.json({ success: true, account });
  } catch (error) { return apiError(error); }
}