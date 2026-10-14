import { NextResponse } from 'next/server';
import { currentAccount, apiError, checkOrigin } from '@/lib/server/access';
import { adminAuth } from '@/lib/server/firebase-admin';
import { isApproved } from '@/lib/learning-access';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { getUserByEmail } from '@/app/firebase/services/user';
import { MOCK_ENABLED } from '@/lib/mock/config';

export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    // Legacy NextAuth mode: read the account using the same service as sign-in.
    // Do not require Admin IAM or mint a second authentication session to render the dashboard.
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return NextResponse.json({ error: 'Vui lòng đăng nhập lại.' }, { status: 401 });
    const account = await getUserByEmail(session.user.email);
    if (!account || account.email !== session.user.email) {
      return NextResponse.json({ error: 'Không đọc được tài khoản. Vui lòng kiểm tra quyền đọc Firestore của cơ chế đăng nhập cũ.' }, { status: 503 });
    }
    return NextResponse.json({ account }, { headers: { 'Cache-Control': 'no-store' } });
  }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const account = await currentAccount(true);
    const token = !MOCK_ENABLED && isApproved(account) ? await adminAuth().createCustomToken(account.id) : null;
    return NextResponse.json({ account, token });
  } catch (error) { return apiError(error); }
}