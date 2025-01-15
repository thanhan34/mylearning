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
  runTransaction,
  onSnapshot
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
export const getDefaultHomeworkSubmissions = (date: string): HomeworkSubmission[] => [
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

    // Create new user with email as document ID
    const sanitizedEmail = userData.email.replace(/[.#$[\]]/g, '_');
    const newUser = {
      ...userData,
      role: userData.role || 'student',
      createdAt: new Date().toISOString(),
      avatar: null,
      target: null,
      teacherId: ''
    };
    
    await setDoc(doc(usersRef, sanitizedEmail), newUser);
    return sanitizedEmail;
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
  classId?: string;
  teacherId?: string;
} | null> => {
  try {
    const firestore = getFirestoreInstance();
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        email: data.email,
        role: data.role as "admin" | "teacher" | "student",
        avatar: data.avatar,
        target: data.target,
        name: data.name,
        classId: data.classId,
        teacherId: data.teacherId
      };
    }
    
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
    const sanitizedEmail = email.replace(/[.#$[\]]/g, '_');
    const homeworkRef = collection(firestore, 'users', sanitizedEmail, 'homework');
    const homeworkSnapshot = await getDocs(homeworkRef);
    
    console.log('Fetching homework progress for:', sanitizedEmail);
    console.log('Number of documents found:', homeworkSnapshot.size);
    
    const progressData = homeworkSnapshot.docs.map(doc => {
      const data = doc.data();
      const completedCount = data.submissions.filter((sub: HomeworkSubmission) => sub.link.trim() !== '').length;
      return {
        date: doc.id,
        completed: completedCount
      };
    });

    console.log('Progress data:', progressData);
    return progressData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error('Error getting homework progress:', error);
    return [];
  }
};

export const getHomeworkSubmissions = async (email: string, date: string): Promise<HomeworkSubmission[] | null> => {
  try {
    const firestore = getFirestoreInstance();
    const sanitizedEmail = email.replace(/[.#$[\]]/g, '_');
    const docRef = doc(firestore, 'users', sanitizedEmail, 'homework', date);
    const docSnap = await getDoc(docRef);

    console.log('Fetching homework submissions:', {
      email: sanitizedEmail,
      date,
      exists: docSnap.exists()
    });

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

export const saveHomeworkSubmission = async (email: string, submissions: HomeworkSubmission[], userName: string) => {
  try {
    const firestore = getFirestoreInstance();
    const date = submissions[0]?.date;
    if (!date) {
      throw new Error('No date found in submissions');
    }

    const sanitizedEmail = email.replace(/[.#$[\]]/g, '_');
    const userRef = doc(firestore, 'users', sanitizedEmail);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    const teacherId = userData?.teacherId;

    if (!teacherId) {
      throw new Error('No teacher assigned to student');
    }

    const docRef = doc(firestore, 'users', sanitizedEmail, 'homework', date);
    const docSnap = await getDoc(docRef);
    
    console.log('Saving homework submission:', {
      email: sanitizedEmail,
      date,
      submissionsCount: submissions.length
    });

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      const existingSubmissions = existingData.submissions || [];
      
      const mergedSubmissions = [...existingSubmissions];
      submissions.forEach(newSubmission => {
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
      const defaultSubmissions = getDefaultHomeworkSubmissions(date);
      const mergedSubmissions = defaultSubmissions.map(defaultSub => {
        const matchingSub = submissions.find(
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

    // Create notification for teacher
    const notificationsRef = collection(firestore, 'notifications');
    await addDoc(notificationsRef, {
      teacher_id: teacherId,
      message: `Học sinh ${userName} đã nộp bài tập ngày ${date}.`,
      created_at: Timestamp.now(),
      is_read: false
    });

    console.log('Successfully saved homework submission');
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

// Admin Dashboard Stats
export const getAdminStats = async () => {
  try {
    const firestore = getFirestoreInstance();
    const usersRef = collection(firestore, 'users');
    const classesRef = collection(firestore, 'classes');

    // Get all users
    const usersSnapshot = await getDocs(usersRef);
    const studentCount = usersSnapshot.docs.filter(doc => doc.data().role === 'student').length;
    const teacherCount = usersSnapshot.docs.filter(doc => doc.data().role === 'teacher').length;

    // Get all classes
    const classesSnapshot = await getDocs(classesRef);
    const classCount = classesSnapshot.size;

    // Get class progress data
    const classProgressData = await Promise.all(
      classesSnapshot.docs.map(async (classDoc) => {
        const classData = classDoc.data();
        const studentIds = classData.students?.map((s: ClassStudent) => s.id) || [];
        
        // Calculate completion rate for each student
        const studentCompletions = await Promise.all(
          studentIds.map(async (studentId: string) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const progressQuery = query(
              collection(firestore, 'dailyProgress'),
              where('userId', '==', studentId),
              where('date', '==', Timestamp.fromDate(today))
            );
            
            const progressSnapshot = await getDocs(progressQuery);
            if (!progressSnapshot.empty) {
              const data = progressSnapshot.docs[0].data();
              const targets = data.targets as DailyTarget[];
              const completionRate = targets.reduce((sum, target) => 
                sum + (target.completed / target.target), 0) / targets.length * 100;
              return completionRate;
            }
            return 0;
          })
        );

        // Calculate average completion rate for the class
        const avgCompletion = studentIds.length > 0
          ? studentCompletions.reduce((sum, rate) => sum + rate, 0) / studentIds.length
          : 0;

        return {
          name: classData.name,
          completionRate: Math.round(avgCompletion)
        };
      })
    );

    return {
      studentCount,
      teacherCount,
      classCount,
      classProgress: classProgressData
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return null;
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

export const getTeacherClasses = async (teacherEmail: string): Promise<Class[]> => {
  try {
    const firestore = getFirestoreInstance();
    const classesRef = collection(firestore, 'classes');
    const q = query(classesRef, where('teacherId', '==', teacherEmail));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Class));
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return [];
  }
};

export const createClass = async (classData: Omit<Class, 'id'>): Promise<string | null> => {
  try {
    const firestore = getFirestoreInstance();
    const classesRef = collection(firestore, 'classes');
    const docRef = await addDoc(classesRef, classData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    return null;
  }
};

export const addStudentToClass = async (classId: string, student: ClassStudent, teacherId: string): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const userRef = doc(firestore, 'users', student.id);
    
    await runTransaction(firestore, async (transaction) => {
      // Get class document
      const classDoc = await transaction.get(classRef);
      if (!classDoc.exists()) throw new Error('Class not found');
      
      // Get user document
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error('User not found');
      
      // Get current students array and check for duplicates
      const classData = classDoc.data();
      const students = classData.students || [];
      const isDuplicate = students.some((s: ClassStudent) => s.email === student.email);
      
      if (!isDuplicate) {
        // Only add if not already in class
        transaction.update(classRef, {
          students: arrayUnion(student)
        });
        
        // Update user's teacherId and classId
        transaction.update(userRef, { 
          teacherId: teacherId,
          classId: classId 
        });
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error adding student to class:', error);
    return false;
  }
};

export const removeStudentFromClass = async (classId: string, studentId: string): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const userRef = doc(firestore, 'users', studentId);
    
    await runTransaction(firestore, async (transaction) => {
      // Get class document
      const classDoc = await transaction.get(classRef);
      if (!classDoc.exists()) throw new Error('Class not found');
      
      // Get user document
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error('User not found');
      
      // Update class students array
      const classData = classDoc.data() as Class;
      const updatedStudents = classData.students.filter(student => student.id !== studentId);
      transaction.update(classRef, { students: updatedStudents });
      
      // Update user's teacherId and classId to empty
      transaction.update(userRef, { 
        teacherId: '',
        classId: '' 
      });
    });
    
    return true;
  } catch (error) {
    console.error('Error removing student from class:', error);
    return false;
  }
};

// Notification Types
export interface Notification {
  id: string;
  teacher_id: string;
  message: string;
  created_at: Timestamp;
  is_read: boolean;
}

// Notification Functions
export const getUnreadNotifications = async (teacherId: string): Promise<Notification[]> => {
  try {
    const firestore = getFirestoreInstance();
    const notificationsRef = collection(firestore, 'notifications');
    const q = query(
      notificationsRef,
      where('teacher_id', '==', teacherId),
      where('is_read', '==', false),
      orderBy('created_at', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Notification));
  } catch (error) {
    console.error('Error getting unread notifications:', error);
    return [];
  }
};

export const subscribeToNotifications = (
  teacherId: string,
  callback: (notifications: Notification[]) => void,
  onError?: (error: Error) => void
) => {
  const firestore = getFirestoreInstance();
  const notificationsRef = collection(firestore, 'notifications');
  const q = query(
    notificationsRef,
    where('teacher_id', '==', teacherId),
    where('is_read', '==', false),
    orderBy('created_at', 'desc')
  );

  return onSnapshot(q, 
    (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));
      callback(notifications);
    },
    (error) => {
      console.error('Error in notifications subscription:', error);
      if (onError) onError(error);
    }
  );
};

export const markNotificationAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const notificationRef = doc(firestore, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      is_read: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
};

export const cleanupClassStudents = async (classId: string): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    
    const classDoc = await getDoc(classRef);
    if (!classDoc.exists()) return false;
    
    const classData = classDoc.data();
    const students = classData.students || [];
    
    // Create a map to store unique students by email
    const uniqueStudents = new Map<string, ClassStudent>();
    students.forEach((student: ClassStudent) => {
      // Keep only the first occurrence of each email
      if (!uniqueStudents.has(student.email)) {
        uniqueStudents.set(student.email, student);
      }
    });
    
    // Convert map back to array
    const uniqueStudentsArray = Array.from(uniqueStudents.values());
    
    // Only update if we found duplicates
    if (uniqueStudentsArray.length !== students.length) {
      await updateDoc(classRef, {
        students: uniqueStudentsArray,
        studentCount: uniqueStudentsArray.length
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cleaning up class students:', error);
    return false;
  }
};
