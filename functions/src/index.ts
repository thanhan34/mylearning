import * as functions from 'firebase-functions';
import * as v2functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

interface Student {
  id: string;
  name: string;
  email: string;
}

interface UserData {
  name?: string;
  role?: 'admin' | 'teacher' | 'student';
}

// Listen for user document updates
export const syncStudentNameToClasses = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change: functions.Change<functions.firestore.DocumentSnapshot>, context: functions.EventContext) => {
    const newData = change.after.data() as UserData;
    const previousData = change.before.data() as UserData;
    const userId = context.params.userId;

    // Only proceed if name has changed and user is a student
    if (newData.role === 'student' && newData.name !== previousData.name) {
      try {
        // Get all classes where this student is enrolled
        const classesRef = admin.firestore().collection('classes');
        const classesSnapshot = await classesRef
          .where('students', 'array-contains', { id: userId })
          .get();

        // Update student name in each class
        const batch = admin.firestore().batch();
        
        classesSnapshot.docs.forEach(doc => {
          const classData = doc.data();
          const updatedStudents = classData.students.map((student: Student) => {
            if (student.id === userId) {
              return { ...student, name: newData.name };
            }
            return student;
          });
          
          batch.update(doc.ref, { students: updatedStudents });
        });

        await batch.commit();
        console.log(`Updated student name in ${classesSnapshot.size} classes`);
      } catch (error) {
        console.error('Error syncing student name to classes:', error);
        throw error;
      }
    }
  });

export const dailyHomeUpdate = v2functions.scheduler.onSchedule(
  {
    schedule: '0 0 * * *', // Run at midnight every day
    timeZone: 'Asia/Ho_Chi_Minh', // Use Vietnam timezone
    region: 'asia-southeast1', // Singapore region for better latency to Vietnam
    retryCount: 3, // Retry up to 3 times if the function fails
    maxRetrySeconds: 60 // Maximum retry period of 60 seconds
  },
  async (event: v2functions.scheduler.ScheduledEvent): Promise<void> => {
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
