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
      
      // Calculate days since Monday of the week
      const daysSinceMonday = Math.floor((date.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only process submissions that fall within the current week (0-6 days from Monday)
      if (daysSinceMonday >= 0 && daysSinceMonday <= 6) {
        // Initialize user's submissions record if not exists
        if (!submissions[userId]) {
          submissions[userId] = {};
        }

        // Mark this day as submitted using the correct index (0 for Monday, 6 for Sunday)
        submissions[userId][daysSinceMonday] = true;
      }
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

/**
 * Update feedback for a specific homework submission
 * This function is used by admins and teachers to add feedback to student submissions
 */
export const updateHomeworkFeedback = async (
  studentName: string,
  date: string,
  submissionType: string,
  questionNumber: number,
  feedback: string
): Promise<boolean> => {
  try {
    console.log('Updating feedback for:', {
      studentName,
      date,
      submissionType,
      questionNumber,
      feedback
    });

    // First try to find all homework submissions for this date
    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef,
      where('date', '==', date)
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.error('No homework submissions found for date:', date);
      return false;
    }

    // Look for a submission that matches the student name
    let foundDoc = null;
    for (const docSnapshot of querySnapshot.docs) {
      const data = docSnapshot.data();
      
      // Check if this document belongs to the student we're looking for
      if (data.userName && data.userName.includes(studentName)) {
        foundDoc = docSnapshot;
        break;
      }
    }

    if (!foundDoc) {
      console.error('No matching submission found for student:', studentName);
      return false;
    }

    // Get the current submissions array
    const data = foundDoc.data();
    const submissions = data.submissions || [];

    // Find and update the specific submission
    const updatedSubmissions = submissions.map((sub: HomeworkSubmission) => {
      if (sub.type === submissionType && sub.questionNumber === questionNumber) {
        return { ...sub, feedback };
      }
      return sub;
    });

    // Update the document
    const docRef = doc(db, 'homework', foundDoc.id);
    await updateDoc(docRef, {
      submissions: updatedSubmissions,
      lastUpdated: new Date().toISOString()
    });

    console.log('Successfully updated feedback');
    return true;
  } catch (error) {
    console.error('Error updating homework feedback:', error);
    return false;
  }
};
