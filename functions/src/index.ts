import * as functions from 'firebase-functions/v2';

export const dailyHomeUpdate = functions.scheduler.onSchedule(
  {
    schedule: '0 0 * * *', // Run at midnight every day
    timeZone: 'Asia/Ho_Chi_Minh', // Use Vietnam timezone
    region: 'asia-southeast1', // Singapore region for better latency to Vietnam
    retryCount: 3, // Retry up to 3 times if the function fails
    maxRetrySeconds: 60 // Maximum retry period of 60 seconds
  } as functions.scheduler.ScheduleOptions,
  async (event: functions.scheduler.ScheduledEvent): Promise<void> => {
    try {
      // Get current Vietnam time
      const vietnamTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
      const vietnamDate = new Date(vietnamTime);

      // Log successful execution
      console.log(`Daily home updated at ${vietnamDate.toISOString()}`);
    } catch (error) {
      console.error('Error updating daily home:', error);
      throw error; // Ensures the function is marked as failed
    }
  }
);
