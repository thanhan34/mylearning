import { NextResponse } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: Request) {
    const headersList = headers();
    const authHeader = headersList.get('authorization');

    // Verify that this is a legitimate Vercel cron request
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Get current Vietnam time
        const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        const vietnamDate = new Date(vietnamTime);

        // Log successful execution
        console.log(`Daily home updated at ${vietnamDate.toISOString()}`);

        return NextResponse.json({
            success: true,
            message: 'Daily home updated successfully',
            timestamp: vietnamDate.toISOString()
        });
    } catch (error) {
        console.error('Error updating daily home:', error);
        return NextResponse.json({
            success: false,
            message: 'Failed to update daily home'
        }, { status: 500 });
    }
}

// Configure the route to only accept GET requests
export const runtime = 'edge';
