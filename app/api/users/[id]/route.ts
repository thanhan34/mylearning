import { NextResponse } from 'next/server';
import { db } from '@/app/firebase/config';
import { doc, getDoc } from '@/app/firebase/firestore';
import { currentAccount, apiError, AccessError } from '@/lib/server/access';
import { adminDb } from '@/lib/server/firebase-admin';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await currentAccount();
    if (actor.role !== 'admin' && actor.id !== params.id) throw new AccessError('Không được xem tài khoản này.');
    const userDoc = await adminDb().collection('users').doc(params.id).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    return NextResponse.json(userData);
  } catch (error) {
    return apiError(error);
  }
}
