import { db } from '../firebase/config';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc, 
  query, 
  where, 
  Timestamp,
  arrayUnion,
  arrayRemove,
  orderBy,
  getDoc,
  Firestore,
  runTransaction
} from 'firebase/firestore';
import { Assignment } from '../../types/assignment';
import { AssignmentSubmission, SubmissionFormData } from '../../types/submission';

const getFirestoreInstance = (): Firestore => {
  if (!db) {
    throw new Error('Firestore instance not initialized');
  }
  return db;
};

// Class Management Types
export interface ClassStudent {
  id: string;
  name: string;
  email: string;
  role: 'leader' | 'regular';
  progress: number;
}

export interface ClassAnnouncement {
  id: string;
  message: string;
  timestamp: Date;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: ClassStudent[];
  announcements: ClassAnnouncement[];
}

export interface DailyTarget {
  id: number;
  type: string;
  target: number;
  completed: number;
  source: string;
  link: string;
}

export interface HomeworkSubmission {
  id: number;
  type: string;
  questionNumber: number;
  link: string;
  date: string;
  feedback?: string;
}

export interface DailyProgress {
  userId: string;
  date: Date;
  targets: DailyTarget[];
}

// Default homework submissions template
const getDefaultHomeworkSubmissions = (date: string): HomeworkSubmission[] => [
  // Read aloud: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ id: 1, type: 'Read aloud', questionNumber: i + 1, link: '', date, feedback: '' })),
  // Repeat sentence: 20 questions
  ...Array(20).fill(null).map((_, i) => ({ id: 2, type: 'Repeat sentence', questionNumber: i + 1, link: '', date, feedback: '' })),
  // Describe image: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ id: 3, type: 'Describe image', questionNumber: i + 1, link: '', date, feedback: '' })),
  // Retell lecture: 5 questions
  ...Array(5).fill(null).map((_, i) => ({ id: 4, type: 'Retell lecture', questionNumber: i + 1, link: '', date, feedback: '' }))
];

// User Management Functions
export const createUser = async (userData: {
  email: string;
  name: string;
  role?: "admin" | "teacher" | "student";
}) => {
  try {
    const firestore = getFirestoreInstance();
    
    // Check if user exists first
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', userData.email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }

    // Create new user with Firebase-generated ID
    const newUser = {
      ...userData,
      role: userData.role || 'student',
      createdAt: new Date().toISOString(),
      avatar: null,  // Initialize avatar field
      target: null   // Initialize target field
    };
    
    const docRef = await addDoc(usersRef, newUser);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const getUserRole = async (userId: string): Promise<"admin" | "teacher" | "student" | null> => {
  try {
    const firestore = getFirestoreInstance();
    const userRef = doc(firestore, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.role as "admin" | "teacher" | "student";
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<{ 
  id: string; 
  email: string; 
  role: "admin" | "teacher" | "student";
  avatar?: string;
  target?: string;
  name?: string;
} | null> => {
  try {
    console.log('Getting user by email:', email);
    const firestore = getFirestoreInstance();
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log('Found user data:', {
        id: doc.id,
        email: data.email,
        role: data.role,
        hasAvatar: Boolean(data.avatar),
        hasTarget: Boolean(data.target),
        name: data.name
      });
      return {
        id: doc.id,
        email: data.email,
        role: data.role as "admin" | "teacher" | "student",
        avatar: data.avatar,
        target: data.target,
        name: data.name
      };
    }
    
    console.log('No user found for email:', email);
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        email,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Daily Progress Functions
export const getDailyProgress = async (userId: string): Promise<DailyTarget[] | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const progressQuery = query(
      collection(getFirestoreInstance(), 'dailyProgress'),
      where('userId', '==', userId),
      where('date', '==', Timestamp.fromDate(today))
    );

    const querySnapshot = await getDocs(progressQuery);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return data.targets as DailyTarget[];
    }

    return null;
  } catch (error) {
    console.error('Error getting daily progress:', error);
    return null;
  }
};

// Updated functions for homework data
export const getHomeworkProgress = async (email: string): Promise<{ date: string; completed: number }[]> => {
  try {
    const firestore = getFirestoreInstance();
    console.log('Getting homework progress for email:', email);

    // Replace dots with underscores in email
    const sanitizedEmail = email.replace(/\./g, '_');
    console.log('Sanitized email:', sanitizedEmail);

    // Get homework submissions using sanitized email
    const homeworkRef = collection(firestore, 'users', sanitizedEmail, 'homework');
    const homeworkSnapshot = await getDocs(homeworkRef);
    
    const progressData = homeworkSnapshot.docs.map(doc => {
      const data = doc.data();
      const completedCount = data.submissions.filter((sub: HomeworkSubmission) => sub.link.trim() !== '').length;
      return {
        date: doc.id, // The document ID is the date
        completed: completedCount
      };
    });

    // Sort by date
    return progressData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error getting homework progress:', error);
    return [];
  }
};

export const getHomeworkSubmissions = async (email: string, date: string): Promise<HomeworkSubmission[] | null> => {
  try {
    const firestore = getFirestoreInstance();
    // Replace dots with underscores in email
    const sanitizedEmail = email.replace(/\./g, '_');
    console.log('Getting homework submissions for:', {
      email,
      sanitizedEmail,
      date
    });

    const docRef = doc(collection(firestore, 'users'), sanitizedEmail, 'homework', date);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.submissions as HomeworkSubmission[];
    }

    return null;
  } catch (error) {
    console.error('Error getting homework submissions:', error);
    return null;
  }
};

export const saveHomeworkSubmission = async (email: string, submissions: HomeworkSubmission[]) => {
  try {
    const firestore = getFirestoreInstance();
    const date = submissions[0]?.date;
    if (!date) {
      console.error('No date found in submissions');
      return false;
    }

    // Replace dots with underscores in email
    const sanitizedEmail = email.replace(/\./g, '_');
    console.log('Saving homework submissions for:', {
      email,
      sanitizedEmail,
      date
    });

    // Filter out submissions with empty links
    const submissionsToSave = submissions.filter(s => s.link.trim() !== '');

    // Create a document reference with sanitized email
    const docRef = doc(collection(firestore, 'users'), sanitizedEmail, 'homework', date);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const existingSubmissions = existingData.submissions || [];
      
      // Merge existing and new submissions
      const mergedSubmissions = [...existingSubmissions];
      submissionsToSave.forEach(newSubmission => {
        const index = mergedSubmissions.findIndex(s => 
          s.id === newSubmission.id && s.questionNumber === newSubmission.questionNumber
        );
        if (index !== -1) {
          mergedSubmissions[index] = newSubmission;
        } else {
          mergedSubmissions.push(newSubmission);
        }
      });

      await updateDoc(docRef, {
        submissions: mergedSubmissions,
        lastUpdated: new Date().toISOString()
      });
    } else {
      // Add empty submissions for all types if not present
      const defaultSubmissions = getDefaultHomeworkSubmissions(date);
      const mergedSubmissions = defaultSubmissions.map(defaultSub => {
        const matchingSub = submissionsToSave.find(
          s => s.type === defaultSub.type && s.questionNumber === defaultSub.questionNumber
        );
        return matchingSub || defaultSub;
      });
      
      await setDoc(docRef, {
        email: sanitizedEmail,
        date,
        submissions: mergedSubmissions,
        lastUpdated: new Date().toISOString()
      });
    }

    return true;
  } catch (error) {
    console.error('Error saving homework submissions:', error);
    return false;
  }
};

export const saveDailyProgress = async (userId: string, targets: DailyTarget[]) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firestore = getFirestoreInstance();
    await setDoc(doc(firestore, 'dailyProgress', `${userId}_${today.toISOString().split('T')[0]}`), {
      userId,
      date: Timestamp.fromDate(today),
      targets,
      lastUpdated: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error saving daily progress:', error);
    return false;
  }
};

export const getWeeklyProgress = async (userId: string): Promise<{ date: Date; completed: number }[]> => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    const progressQuery = query(
      collection(getFirestoreInstance(), 'dailyProgress'),
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const querySnapshot = await getDocs(progressQuery);
    const weeklyData = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const totalCompleted = data.targets.reduce(
        (sum: number, target: DailyTarget) => sum + target.completed, 
        0
      );
      return {
        date: (data.date as Timestamp).toDate(),
        completed: totalCompleted
      };
    });

    return weeklyData;
  } catch (error) {
    console.error('Error getting weekly progress:', error);
    return [];
  }
};
