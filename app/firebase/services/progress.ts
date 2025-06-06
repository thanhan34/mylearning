import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config';
import { HomeworkSubmission } from './types';

export interface ProgressData {
  date: string;
  completed: number;
}

export const getHomeworkProgress = async (userId: string): Promise<ProgressData[]> => {
  try {
    // Query homework collection for user's submissions
    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    
    if (querySnapshot.empty) {
      console.log('No submissions found for user:', userId);
      return [{
        date: new Date().toISOString().split('T')[0],
        completed: 0
      }];
    }

    // Process each day's submissions
    const progressByDate = new Map<string, number>();
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      
      
      const date = data.date;
      const submissions = data.submissions || [];
      
      // Count completed submissions (those with non-empty links)
      const completed = submissions.filter((s: any) => s.link && s.link.trim() !== '').length;
      if (completed > 0) {
        progressByDate.set(date, completed);
      }
    });

    // Convert to array and sort by date
    const result = Array.from(progressByDate.entries())
      .map(([date, completed]) => ({ date, completed }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    
    return result;
  } catch (error) {
    console.error('Error getting homework progress:', error);
    return [{
      date: new Date().toISOString().split('T')[0],
      completed: 0
    }];
  }
};

export const getWeeklyProgress = async (userId: string): Promise<ProgressData[]> => {
  try {
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    
    // Query homework collection for user's submissions
    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    // Process each day's submissions
    const progressByDate = new Map<string, number>();
    
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      const date = data.date;
      // Only include dates from last week
      if (date >= lastWeekStr) {
        const submissions = data.submissions || [];
        const completed = submissions.filter((s: any) => s.link && s.link.trim() !== '').length;
        if (completed > 0) {
          progressByDate.set(date, completed);
        }
      }
    });

    // Convert to array and sort by date
    return Array.from(progressByDate.entries())
      .map(([date, completed]) => ({ date, completed }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error getting weekly progress:', error);
    return [];
  }
};

export const getDailyProgress = async (userId: string): Promise<ProgressData | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Query homework collection for user's submissions
    const submissionsRef = collection(db, 'homework');
    const q = query(
      submissionsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return {
        date: today,
        completed: 0
      };
    }
    
    // Find today's submissions
    let totalCompleted = 0;
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.date === today) {
        const submissions = data.submissions || [];
        const completed = submissions.filter((s: any) => s.link && s.link.trim() !== '').length;
        totalCompleted += completed;
      }
    });
    
    return {
      date: today,
      completed: totalCompleted
    };
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return null;
  }
};
