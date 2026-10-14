import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/config';
import { MOCK_ENABLED } from '@/lib/mock/config';
import { execute } from '@/lib/mock/engine';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  if (!MOCK_ENABLED) return new NextResponse(null, { status: 404 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new NextResponse(null, { status: 403 });
  const session = await getServerSession(authOptions);
  if (!session?.user?.email?.endsWith('@mock.local')) return new NextResponse(null, { status: 401 });
  try {
    const body = await request.text();
    if (body.length > 2_000_000) return NextResponse.json({ error: 'Mock request too large' }, { status: 413 });
    return NextResponse.json(execute(JSON.parse(body)), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid mock request';
    return NextResponse.json({ error: message }, { status: message === 'MOCK_CONFLICT' ? 409 : 400 });
  }
}