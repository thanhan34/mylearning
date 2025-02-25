import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc,
  orderBy,
  Timestamp,
  DocumentData
} from 'firebase/firestore';
import { db } from '../config';

import { HomeworkSubmission } from './types';
import { addNotification } from './notification';

export const getHomeworkSubmissions = async (userId: string, date?: string): Promise<HomeworkSubmission[]> => {
  try {
    const submissionsRef = collection(db, 'homework');
    let q = query(
      submissionsRef, 
      where('userId', '==', userId),
      orderBy('date', 'desc')
    );
    
    if (date) {
      q = query(
        submissionsRef, 
        where('userId', '==', userId),
        where('date', '==', date)
      );
    }
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return [];
    }

    const submissions = querySnapshot.docs[0].data().submissions || [];
    return submissions as HomeworkSubmission[];
  } catch (error) {
    console.error('Error getting homework submissions:', error);
    return [];
  }
};

export const getStudentWeeklyStatus = async (
  classId: string,
  weekStart: Date = new Date()
): Promise<Record<string, Record<string, boolean>>> => {
  try {
    // Get week's date range
    const monday = new Date(weekStart);
    monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1); // Get Monday
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    console.log('Fetching submissions for week:', monday, 'to', sunday);

    // Query all homework submissions for this week
    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef,
      where('date', '>=', monday.toISOString().split('T')[0]),
      where('date', '<=', sunday.toISOString().split('T')[0])
    );

    const querySnapshot = await getDocs(q);
    const submissions: Record<string, Record<string, boolean>> = {};

    // Process submissions
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const userId = data.userId;
      const date = new Date(data.date + 'T00:00:00');
      const dayIndex = (date.getDay() + 6) % 7; // Convert to Monday = 0, Sunday = 6

      // Initialize user's submissions record if not exists
      if (!submissions[userId]) {
        submissions[userId] = {};
      }

      // Mark this day as submitted
      submissions[userId][dayIndex] = true;
    });

    return submissions;
  } catch (error) {
    console.error('Error getting student weekly status:', error);
    return {};
  }
};

export const saveHomeworkSubmission = async (
  userId: string, 
  submissions: HomeworkSubmission[],
  userName: string
): Promise<boolean> => {
  try {
    const date = submissions[0]?.date;
    if (!date) {
      throw new Error('No date provided in submissions');
    }

    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef, 
      where('userId', '==', userId),
      where('date', '==', date)
    );
    const querySnapshot = await getDocs(q);
    
    const submissionData = {
      userId,
      userName,
      date,
      submissions,
      timestamp: Timestamp.now()
    };

    if (!querySnapshot.empty) {
      // Update existing submission
      const docRef = doc(db, 'homework', querySnapshot.docs[0].id);
      await updateDoc(docRef, submissionData);
      
      // Create notification for homework update
      const message = `${userName} has updated their homework submission for ${date}`;
      await addNotification(userId, message, 'teacher');
    } else {
      // Create new submission
      await addDoc(submissionsRef, submissionData);
      
      // Create notification for new submission
      const message = `${userName} has submitted homework for ${date}`;
      await addNotification(userId, message, 'teacher');
    }
    
    return true;
  } catch (error) {
    console.error('Error saving homework submission:', error);
    return false;
  }
};
