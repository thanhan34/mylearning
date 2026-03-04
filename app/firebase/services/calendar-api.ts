import { CalendarEventData } from './calendar';

export const createCalendarEventAPI = async (data: CalendarEventData): Promise<string | null> => {
  try {
    const response = await fetch('/api/calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If error response is not JSON
        errorMessage = response.statusText;
      }
      console.error('Calendar API error:', errorMessage);
      throw new Error(`Failed to create calendar event: ${errorMessage}`);
    }

    const result = await response.json();
    return result.eventId;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    return null;
  }
};

export const updateCalendarEventAPI = async (eventId: string, data: CalendarEventData): Promise<boolean> => {
  try {
    const response = await fetch('/api/calendar', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId, ...data }),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If error response is not JSON
        errorMessage = response.statusText;
      }
      console.error('Calendar API error:', errorMessage);
      throw new Error(`Failed to update calendar event: ${errorMessage}`);
    }

    const result = await response.json();
    return true;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    return false;
  }
};

export const deleteCalendarEventAPI = async (eventId: string): Promise<boolean> => {
  try {
    const response = await fetch('/api/calendar', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ eventId }),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      let errorMessage = 'Unknown error';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If error response is not JSON
        errorMessage = response.statusText;
      }
      console.error('Calendar API error:', errorMessage);
      throw new Error(`Failed to delete calendar event: ${errorMessage}`);
    }

    const result = await response.json();
    return true;
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    return false;
  }
};
