import { NextRequest, NextResponse } from 'next/server';
import { calendar_v3, calendar } from '@googleapis/calendar';
import { JWT } from 'google-auth-library';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const CALENDAR_ID = 'dtan42@gmail.com';

const getServiceAccountAuth = () => {
  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!credentials.client_email || !credentials.private_key) {
    throw new Error('Google Calendar service account credentials are missing');
  }

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ],
  });
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    console.log('Calendar API: POST request received');

    // Create calendar client with service account
    const auth = getServiceAccountAuth();
    const calendarClient = calendar({
      version: 'v3',
      auth: auth,
    });

    const data = await req.json();
    console.log('Calendar API: Creating event with data:', data);

    // Validate required fields
    if (!data.name || !data.examLocation || !data.examDate) {
      console.error('Calendar API: Missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: name, examLocation, examDate' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data.examDate)) {
      console.error('Calendar API: Invalid date format');
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Format event times
    const startTime = new Date(data.examDate + 'T09:00:00+07:00');
    const endTime = new Date(data.examDate + 'T12:00:00+07:00');

    // Create event with proper title format
    const event: calendar_v3.Schema$Event = {
      summary: `PTE Exam - ${data.name}`,
      description: `
Student: ${data.name}
Location: ${data.examLocation}
${data.target ? `Target Score: ${data.target}` : ''}
${data.className ? `Class: ${data.className}` : ''}
${data.teacherName ? `Teacher: ${data.teacherName}` : ''}
      `.trim(),
      location: data.examLocation,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
      colorId: '11', // A distinctive color (orange)
    };

    try {
      // Create event
      const result = await calendarClient.events.insert({
        calendarId: CALENDAR_ID,
        requestBody: event,
        sendUpdates: 'none',
      });

      console.log('Calendar API: Event created:', {
        id: result.data.id,
        summary: result.data.summary,
        start: result.data.start,
        end: result.data.end,
        status: result.data.status
      });

      return NextResponse.json({ eventId: result.data.id }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Calendar API: Error creating event:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });

      return NextResponse.json(
        { error: 'Failed to create calendar event' },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error in calendar API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Calendar API: Detailed error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    console.log('Calendar API: PUT request received');

    // Create calendar client with service account
    const auth = getServiceAccountAuth();
    const calendarClient = calendar({
      version: 'v3',
      auth: auth,
    });

    const { eventId, ...data } = await req.json();
    console.log('Calendar API: Updating event:', { eventId, data });

    // Format event times
    const startTime = new Date(data.examDate + 'T09:00:00+07:00');
    const endTime = new Date(data.examDate + 'T12:00:00+07:00');

    // Update event
    const event: calendar_v3.Schema$Event = {
      summary: `PTE Exam - ${data.name}`,
      description: `
Student: ${data.name}
Location: ${data.examLocation}
${data.target ? `Target Score: ${data.target}` : ''}
${data.className ? `Class: ${data.className}` : ''}
${data.teacherName ? `Teacher: ${data.teacherName}` : ''}
      `.trim(),
      location: data.examLocation,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Asia/Bangkok',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 day before
          { method: 'popup', minutes: 60 }, // 1 hour before
        ],
      },
    };

    try {
      const result = await calendarClient.events.update({
        calendarId: CALENDAR_ID,
        eventId: eventId,
        requestBody: event,
        sendUpdates: 'none',
      });

      console.log('Calendar API: Event updated:', result.data);
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Calendar API: Error updating event:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });

      return NextResponse.json(
        { error: 'Failed to update calendar event' },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    console.log('Calendar API: DELETE request received');

    // Create calendar client with service account
    const auth = getServiceAccountAuth();
    const calendarClient = calendar({
      version: 'v3',
      auth: auth,
    });

    const { eventId } = await req.json();
    console.log('Calendar API: Deleting event:', eventId);

    try {
      await calendarClient.events.delete({
        calendarId: CALENDAR_ID,
        eventId: eventId,
        sendUpdates: 'none',
      });

      console.log('Calendar API: Event deleted');
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Calendar API: Error deleting event:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
      });

      return NextResponse.json(
        { error: 'Failed to delete calendar event' },
        { status: 500, headers: corsHeaders }
      );
    }
  } catch (error) {
    console.error('Error in calendar API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
