import { 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config';
import { HomeworkSubmission } from './types';

export interface StudentHomeworkData {
  id: string;
  userId: string;
  userName: string;
  date: string;
  submissions: HomeworkSubmission[];
  timestamp?: Timestamp;
}

// Helper function to convert email to userId format
const emailToUserId = (email: string): string => {
  return email.replace(/\./g, '_');
};

export const getStudentHomework = async (userId: string): Promise<StudentHomeworkData[]> => {
  try {
        
    // Try both original email and converted format
    const convertedUserId = emailToUserId(userId);    
    // First, let's query ALL homework to see what's in the database
    const allHomeworkRef = collection(db, 'homework');
    const allHomeworkSnapshot = await getDocs(allHomeworkRef);   
    allHomeworkSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      
    });
    
    // Try query with original email first
    
    const submissionsRef1 = collection(db, 'homework');
    const q1 = query(
      submissionsRef1,
      where('userId', '==', userId)
    );
    
    const querySnapshot1 = await getDocs(q1);
    
    const submissionsRef2 = collection(db, 'homework');
    const q2 = query(
      submissionsRef2,
      where('userId', '==', convertedUserId)
    );
    
    const querySnapshot2 = await getDocs(q2);
        
    // Use whichever query returned results
    let finalQuerySnapshot = querySnapshot1;
    let usedUserId = userId;
    
    if (querySnapshot1.empty && !querySnapshot2.empty) {
      finalQuerySnapshot = querySnapshot2;
      usedUserId = convertedUserId;      
    } else if (!querySnapshot1.empty) {
      console.log('Using original userId:', userId);
    }
    
    if (finalQuerySnapshot.empty) {
      console.log('No homework found for either format');
      console.log('Available userIds in database:', 
        allHomeworkSnapshot.docs.map(doc => doc.data().userId)
      );
      return [];
    }

    const homeworkData: StudentHomeworkData[] = [];
    
    finalQuerySnapshot.docs.forEach(doc => {
      const data = doc.data();     

      // Validate and process submissions - same as progress.ts
      let submissions: HomeworkSubmission[] = [];
      if (data.submissions && Array.isArray(data.submissions)) {
        submissions = data.submissions;
      } else if (data.submissions) {
        console.warn('Submissions field is not an array:', data.submissions);
      }

      homeworkData.push({
        id: doc.id,
        userId: data.userId || '',
        userName: data.userName || '',
        date: data.date || '',
        submissions: submissions,
        timestamp: data.timestamp || null
      });
    });

    // Sort by date (newest first)
    homeworkData.sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    
    return homeworkData;
  } catch (error) {
    console.error('Error getting homework:', error);
    return [];
  }
};

export const getHomeworkStats = (homework: StudentHomeworkData[]) => {
  const stats = {
    total: homework.length,
    withSubmissions: 0,
    withFeedback: 0,
    totalSubmissions: 0,
    totalFeedbacks: 0
  };

  homework.forEach(hw => {
    if (hw.submissions && hw.submissions.length > 0) {
      stats.withSubmissions++;
      stats.totalSubmissions += hw.submissions.length;
      
      const feedbackCount = hw.submissions.filter(
        sub => sub.feedback && sub.feedback.trim() !== ''
      ).length;
      
      if (feedbackCount > 0) {
        stats.withFeedback++;
      }
      
      stats.totalFeedbacks += feedbackCount;
    }
  });

  return stats;
};
