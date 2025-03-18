import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/config';
import { sendTestNotificationToAdmin } from '@/app/firebase/services/test-admin-notification';

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify the user is an admin
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user as any)?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized. Only admin users can access this endpoint.' },
        { status: 403 }
      );
    }

    // Get the admin email from the session
    const adminEmail = session.user?.email;
    
    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email not found in session' },
        { status: 400 }
      );
    }

    // Send a test notification to the admin
    const result = await sendTestNotificationToAdmin(adminEmail);
    
    if (result) {
      return NextResponse.json({
        success: true,
        message: 'Test notification sent successfully',
        adminEmail
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send test notification' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in test notification API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
