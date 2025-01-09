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

const getFirestoreInstance = (): Firestore => {
  if (!db) {
    throw new Error('Firestore instance not initialized');
  }
  return db;
};
import { Assignment } from '../../types/assignment';
import { AssignmentSubmission, SubmissionFormData } from '../../types/submission';

// User Management
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
      console.log('User already exists');
      return querySnapshot.docs[0].id;
    }

    // Create new user with Firebase-generated ID
    const newUser = {
      ...userData,
      role: userData.role || 'student',
      createdAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(usersRef, newUser);
    return docRef.id;
  } catch (error) {
    console.error('Error in createUser transaction:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
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

export const getUserByEmail = async (email: string): Promise<{ id: string; email: string; role: "admin" | "teacher" | "student" } | null> => {
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
        role: data.role as "admin" | "teacher" | "student"
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
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

export interface DailyProgress {
  userId: string;
  date: Date;
  targets: DailyTarget[];
}

// Assignment Submission Functions
export const createSubmission = async (
  assignmentId: string,
  studentId: string,
  data: SubmissionFormData
): Promise<string | null> => {
  try {
    const firestore = getFirestoreInstance();
    const submissionsRef = collection(firestore, 'submissions');
    const submission: Omit<AssignmentSubmission, 'id'> = {
      assignmentId,
      studentId,
      submittedAt: new Date().toISOString(),
      type: data.type,
      date: data.date,
      link: data.link,
      notes: data.notes,
      status: 'submitted'
    };
    
    const docRef = await addDoc(submissionsRef, submission);
    return docRef.id;
  } catch (error) {
    console.error('Error creating submission:', error);
    return null;
  }
};

export const getStudentSubmissions = async (studentId: string): Promise<AssignmentSubmission[]> => {
  try {
    const firestore = getFirestoreInstance();
    const submissionsRef = collection(firestore, 'submissions');
    const q = query(
      submissionsRef,
      where('studentId', '==', studentId),
      orderBy('submittedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AssignmentSubmission[];
  } catch (error) {
    console.error('Error getting student submissions:', error);
    return [];
  }
};

export const getAssignmentSubmission = async (
  assignmentId: string,
  studentId: string
): Promise<AssignmentSubmission | null> => {
  try {
    const firestore = getFirestoreInstance();
    const submissionsRef = collection(firestore, 'submissions');
    const q = query(
      submissionsRef,
      where('assignmentId', '==', assignmentId),
      where('studentId', '==', studentId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as AssignmentSubmission;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting assignment submission:', error);
    return null;
  }
};

export const getDailySubmissionCount = async (studentId: string): Promise<number> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const firestore = getFirestoreInstance();
    const submissionsRef = collection(firestore, 'submissions');
    const q = query(
      submissionsRef,
      where('studentId', '==', studentId),
      where('submittedAt', '>=', today.toISOString()),
      where('submittedAt', '<', tomorrow.toISOString())
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting daily submission count:', error);
    return 0;
  }
};

// Assignment Management Functions
export const createAssignment = async (assignment: Omit<Assignment, 'id'>): Promise<string | null> => {
  try {
    const firestore = getFirestoreInstance();
    const assignmentsRef = collection(firestore, 'assignments');
    const docRef = await addDoc(assignmentsRef, assignment);
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    return null;
  }
};

export const getTeacherAssignments = async (teacherId: string): Promise<Assignment[]> => {
  try {
    const firestore = getFirestoreInstance();
    const assignmentsRef = collection(firestore, 'assignments');
    const q = query(
      assignmentsRef, 
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Assignment[];
  } catch (error) {
    console.error('Error getting teacher assignments:', error);
    return [];
  }
};

export const getTargetAssignments = async (
  targetType: Assignment['targetType'],
  targetId: string
): Promise<Assignment[]> => {
  try {
    const firestore = getFirestoreInstance();
    const assignmentsRef = collection(firestore, 'assignments');

    if (targetType === 'class') {
      // Get all classes where the student is a member
      const classesRef = collection(firestore, 'classes');
      const classesQuery = query(classesRef);
      const classesSnapshot = await getDocs(classesQuery);
      const studentClasses = classesSnapshot.docs
        .filter(doc => {
          const classData = doc.data() as Class;
          return classData.students.some(student => student.id === targetId);
        })
        .map(doc => doc.id);

      if (studentClasses.length === 0) return [];

      // Get assignments for these classes
      const q = query(
        assignmentsRef,
        where('targetType', '==', 'class'),
        where('targetId', 'in', studentClasses),
        where('status', '==', 'active'),
        orderBy('dueDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assignment[];
    } else {
      // For individual assignments
      const q = query(
        assignmentsRef,
        where('targetType', '==', targetType),
        where('targetId', '==', targetId),
        where('status', '==', 'active'),
        orderBy('dueDate', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Assignment[];
    }
  } catch (error) {
    console.error('Error getting target assignments:', error);
    return [];
  }
};

export const updateAssignmentStatus = async (
  assignmentId: string,
  status: Assignment['status']
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const assignmentRef = doc(firestore, 'assignments', assignmentId);
    await updateDoc(assignmentRef, { status });
    return true;
  } catch (error) {
    console.error('Error updating assignment status:', error);
    return false;
  }
};

export const markNotificationSent = async (assignmentId: string): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const assignmentRef = doc(firestore, 'assignments', assignmentId);
    await updateDoc(assignmentRef, { notificationSent: true });
    return true;
  } catch (error) {
    console.error('Error marking notification as sent:', error);
    return false;
  }
};

// Daily Progress Functions
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

export const saveHomeworkSubmission = async (userId: string, submissions: HomeworkSubmission[]) => {
  try {
    console.log('Starting saveHomeworkSubmission with:', { userId, submissionsCount: submissions.length });
    
    const firestore = getFirestoreInstance();
    const date = submissions[0]?.date;
    if (!date) {
      console.error('No date found in submissions');
      return false;
    }

    // Filter out submissions with empty links
    const submissionsToSave = submissions.filter(s => s.link.trim() !== '');
    console.log('Filtered submissions to save:', submissionsToSave.length);

    // Create a document reference with userId and date
    const docRef = doc(collection(firestore, 'users'), userId, 'homework', date);
    
    // Check if document exists
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      // Update existing document
      console.log('Updating existing document for date:', date);
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
      // Create new document
      console.log('Creating new document for date:', date);
      // Add empty submissions for all types if not present
      const defaultSubmissions = getDefaultHomeworkSubmissions(date);
      const mergedSubmissions = defaultSubmissions.map(defaultSub => {
        const matchingSub = submissionsToSave.find(
          s => s.type === defaultSub.type && s.questionNumber === defaultSub.questionNumber
        );
        return matchingSub || defaultSub;
      });
      
      await setDoc(docRef, {
        userId,
        date,
        submissions: mergedSubmissions,
        lastUpdated: new Date().toISOString()
      });
    }

    console.log('Successfully saved submissions for date:', date);
    return true;
  } catch (error) {
    console.error('Error in saveHomeworkSubmission:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return false;
  }
};

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

export const getHomeworkSubmissions = async (userId: string, date: string): Promise<HomeworkSubmission[] | null> => {
  try {
    console.log('Getting homework submissions for:', { userId, date });
    
    const firestore = getFirestoreInstance();
    const docRef = doc(collection(firestore, 'users'), userId, 'homework', date);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Found submissions:', data.submissions);
      return data.submissions as HomeworkSubmission[];
    }

    console.log('No submissions found for date:', date);
    return null;
  } catch (error) {
    console.error('Error getting homework submissions:', error);
    return null;
  }
};

// Class Management Functions
export const getTeacherClasses = async (teacherId: string): Promise<Class[]> => {
  try {
    const firestore = getFirestoreInstance();
    const classesRef = collection(firestore, 'classes');
    const q = query(classesRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Class[];
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return [];
  }
};

export const createClass = async (classData: Omit<Class, 'id'>): Promise<string | null> => {
  try {
    const firestore = getFirestoreInstance();
    const classesRef = collection(firestore, 'classes');
    const docRef = await addDoc(classesRef, {
      ...classData,
      announcements: [],
      students: []
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    return null;
  }
};

export const addStudentToClass = async (
  classId: string, 
  student: Omit<ClassStudent, 'progress'>
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    await updateDoc(classRef, {
      students: arrayUnion({
        ...student,
        progress: 0
      })
    });
    return true;
  } catch (error) {
    console.error('Error adding student:', error);
    return false;
  }
};

export const removeStudentFromClass = async (
  classId: string,
  studentId: string
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const classDoc = await getDocs(query(collection(firestore, 'classes'), where('id', '==', classId)));
    const currentClass = classDoc.docs[0].data() as Class;
    
    const studentToRemove = currentClass.students.find(s => s.id === studentId);
    if (!studentToRemove) return false;

    await updateDoc(classRef, {
      students: arrayRemove(studentToRemove)
    });
    return true;
  } catch (error) {
    console.error('Error removing student:', error);
    return false;
  }
};

export const updateStudentRole = async (
  classId: string,
  studentId: string,
  newRole: 'leader' | 'regular'
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const classDoc = await getDocs(query(collection(firestore, 'classes'), where('id', '==', classId)));
    const currentClass = classDoc.docs[0].data() as Class;
    
    const updatedStudents = currentClass.students.map(student => 
      student.id === studentId ? { ...student, role: newRole } : student
    );

    await updateDoc(classRef, { students: updatedStudents });
    return true;
  } catch (error) {
    console.error('Error updating student role:', error);
    return false;
  }
};

export const updateStudentProgress = async (
  classId: string,
  studentId: string,
  progress: number
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const classDoc = await getDocs(query(collection(firestore, 'classes'), where('id', '==', classId)));
    const currentClass = classDoc.docs[0].data() as Class;
    
    const updatedStudents = currentClass.students.map(student => 
      student.id === studentId ? { ...student, progress } : student
    );

    await updateDoc(classRef, { students: updatedStudents });
    return true;
  } catch (error) {
    console.error('Error updating student progress:', error);
    return false;
  }
};

export const addClassAnnouncement = async (
  classId: string,
  message: string
): Promise<boolean> => {
  try {
    const firestore = getFirestoreInstance();
    const classRef = doc(firestore, 'classes', classId);
    const announcement: ClassAnnouncement = {
      id: Date.now().toString(),
      message,
      timestamp: new Date()
    };
    
    await updateDoc(classRef, {
      announcements: arrayUnion(announcement)
    });
    return true;
  } catch (error) {
    console.error('Error adding announcement:', error);
    return false;
  }
};

export const getHomeworkProgress = async (userId: string): Promise<{ date: string; completed: number }[]> => {
  try {
    const firestore = getFirestoreInstance();
    const homeworkRef = collection(firestore, 'users', userId, 'homework');
    const querySnapshot = await getDocs(homeworkRef);
    
    const progressData = querySnapshot.docs.map(doc => {
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
