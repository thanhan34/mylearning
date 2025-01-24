import { calendar_v3 } from '@googleapis/calendar';
import { createCalendarEventAPI, updateCalendarEventAPI, deleteCalendarEventAPI } from './calendar-api';

// Calendar configuration
const CALENDAR_ID = 'dtan42@gmail.com'; // Calendar to add events to

export interface CalendarEventData {
  name: string;
  examLocation: string;
  examDate: string;
  target?: string;
  className?: string;
  teacherName?: string;
}

const formatEventDateTime = (dateStr: string) => {
  try {
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error('Invalid date format. Expected YYYY-MM-DD');
    }
    
    // Create Bangkok time (UTC+7) event times
    const startTime = new Date(dateStr + 'T09:00:00+07:00');
    const endTime = new Date(dateStr + 'T12:00:00+07:00');
    
    // Validate dates are valid
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new Error('Invalid date values');
    }

    return {
      start: startTime.toISOString(),
      end: endTime.toISOString()
    };
  } catch (error) {
    console.error('Error formatting event date/time:', error);
    throw error;
  }
};

export const createCalendarEvent = async (data: CalendarEventData): Promise<string | null> => {
  try {
    console.log('Creating calendar event:', data);
    return await createCalendarEventAPI(data);
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

export const updateCalendarEvent = async (eventId: string, data: CalendarEventData): Promise<boolean> => {
  try {
    console.log('Updating calendar event:', { eventId, data });
    return await updateCalendarEventAPI(eventId, data);
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
};

export const deleteCalendarEvent = async (eventId: string): Promise<boolean> => {
  try {
    console.log('Deleting calendar event:', eventId);
    return await deleteCalendarEventAPI(eventId);
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};
