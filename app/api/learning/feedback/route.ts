import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/server/firebase-admin';
import { currentAccount, apiError, checkOrigin, AccessError } from '@/lib/server/access';
import { canFeedback, canEditFeedback, LearningAccount } from '@/lib/learning-access';
import type { HomeworkSubmission } from '@/app/firebase/services/types';

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await request.json();
    if (body.kind === 'voice' || body.audioUrl !== undefined) {
      throw new AccessError('Chức năng feedback bằng giọng nói đã được gỡ bỏ. Vui lòng dùng feedback văn bản.', 410);
    }
    if (typeof body.documentId !== 'string' || !body.documentId || body.documentId.includes('/')) throw new AccessError('Bài nộp không hợp lệ.', 400);
    if (typeof body.feedback !== 'string' || body.feedback.length > 20000) throw new AccessError('Feedback không hợp lệ.', 400);
    const actor = await currentAccount();
    const db = adminDb();
    const result = await db.runTransaction(async tx => {
      const actorDoc = await tx.get(db.collection('users').doc(actor.id));
      const account = { ...actorDoc.data(), id: actor.id } as LearningAccount;
      const ref = db.collection('homework').doc(body.documentId);
      const homework = await tx.get(ref);
      if (!homework.exists) throw new AccessError('Không tìm thấy bài nộp.', 404);
      const submissions: HomeworkSubmission[] = homework.data()?.submissions || [];
      const index = submissions.findIndex(sub => body.submissionId ? sub.id === body.submissionId : sub.type === body.type && sub.questionNumber === body.questionNumber);
      const sub = submissions[index];
      if (!sub) throw new AccessError('Không tìm thấy bài nộp.', 404);
      if (!actorDoc.exists || !canFeedback(account, sub.type)) throw new AccessError('Bạn chưa được phân công dạng bài này.');
      if (!canEditFeedback(account, sub)) throw new AccessError('Chỉ người viết hoặc admin được sửa feedback này.');
      if (body.expectedFeedback !== undefined && body.expectedFeedback !== (sub.feedback || '')) throw new AccessError('Feedback đã thay đổi. Vui lòng tải lại.', 409);
      submissions[index] = { ...sub, feedback: body.feedback.trim(), feedbackBy: actor.id,
        feedbackByName: account.name || account.email, feedbackByRole: account.role, feedbackAt: new Date().toISOString() };
      tx.update(ref, { submissions, lastUpdated: new Date().toISOString() });
      return { success: true, submission: submissions[index] };
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
