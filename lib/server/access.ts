import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/config';
import { findAccount } from './accounts';
import { isApproved } from '../learning-access';

export class AccessError extends Error {
  constructor(message: string, public status = 403) { super(message); }
}

export async function currentAccount(allowPending = false) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) throw new AccessError('Vui lòng đăng nhập.', 401);
  const account = await findAccount(session.user.email);
  if (!account) throw new AccessError('Không tìm thấy tài khoản.', 401);
  if (!allowPending && !isApproved(account)) throw new AccessError('Tài khoản đang chờ admin duyệt.');
  return account;
}

export function apiError(error: unknown) {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Learning API error:', error);
  const code = (error as { code?: string | number } | null)?.code;
  const diagnostic = error as { message?: unknown; details?: unknown } | null;
  const missingIndex = /requires an index|index.*(?:not ready|building)/i.test(`${diagnostic?.message || ''} ${diagnostic?.details || ''}`);
  if ([9, '9', 'failed-precondition', 'firestore/failed-precondition', 'FAILED_PRECONDITION'].includes(code ?? '') && missingIndex) {
    return NextResponse.json({
      code: 'FIRESTORE_INDEX_NOT_READY',
      error: 'Chưa thể tải dữ liệu vì index Firestore cần thiết chưa được tạo hoặc chưa sẵn sàng. Vui lòng liên hệ quản trị viên triển khai index và chờ hoàn tất, sau đó tải lại trang. Đây không phải lỗi quyền truy cập của bạn.',
    }, { status: 503 });
  }
  if (code === 8 || code === '8' || code === 'resource-exhausted' || code === 'firestore/resource-exhausted' || code === 'RESOURCE_EXHAUSTED') {
    return NextResponse.json({
      code: 'FIRESTORE_RESOURCE_EXHAUSTED',
      error: 'Cơ sở dữ liệu đang vượt giới hạn tài nguyên hoặc quota nên chưa thể tải hay lưu bài tập. Vui lòng liên hệ quản trị viên kiểm tra quota Firestore. Đây không phải lỗi phân quyền feedback của giáo viên/trợ giảng.',
    }, { status: 503 });
  }
  if (code === 7 || code === 'permission-denied') {
    return NextResponse.json({ error: 'Bạn đã đăng nhập, nhưng chức năng này vẫn cần quyền Firebase Admin trên server. Khôi phục login chưa khôi phục các API quản lý mới.' }, { status: 503 });
  }
  return NextResponse.json({ error: 'Không thể xử lý yêu cầu. Vui lòng thử lại.' }, { status: 500 });
}

export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin && origin !== process.env.NEXTAUTH_URL) {
    throw new AccessError('Nguồn yêu cầu không hợp lệ.');
  }
}