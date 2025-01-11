import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { SHADOWING_LINKS } from '../../../constants/shadowingLinks';
import { DAILY_MESSAGES } from '../../../constants/dailyMessages';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  try {
    // Verify the request is from cron-job.org using a secret token
    const headersList = headers();
    const authToken = headersList.get('Authorization');

    if (!CRON_SECRET || `Bearer ${CRON_SECRET}` !== authToken) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get current date in Vietnam timezone
    const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
    const currentDate = new Date(vietnamTime);
    
    // Get day name
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[currentDate.getDay()];
    
    // Calculate shadowing link
    const startDate = new Date('2024-01-01');
    const daysDiff = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const linkIndex = daysDiff % SHADOWING_LINKS.length;
    const shadowingLink = SHADOWING_LINKS[linkIndex];
    
    // Get daily message
    const message = DAILY_MESSAGES[dayName as keyof typeof DAILY_MESSAGES](shadowingLink);

    // Here you can add additional daily tasks:
    // - Update user streaks in Firebase
    // - Send notifications
    // - Generate new assignments
    // etc.

    return new NextResponse(JSON.stringify({
      date: currentDate.toISOString(),
      dayName,
      shadowingLink,
      message
    }), { 
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Cron job failed:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
