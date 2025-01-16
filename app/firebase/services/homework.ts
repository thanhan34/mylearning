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
    } else {
      // Create new submission
      await addDoc(submissionsRef, submissionData);
    }
    
    return true;
  } catch (error) {
    console.error('Error saving homework submission:', error);
    return false;
  }
};
