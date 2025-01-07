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
  Firestore
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
    console.log('Creating user with data:', userData);
    
    // Check if user already exists
    const existingUser = await getUserRole(userData.email);
    if (existingUser) {
      console.log('User already exists with role:', existingUser);
      return null;
    }

    const firestore = getFirestoreInstance();
    // Create new user
    const usersRef = collection(firestore, 'users');
    const newUser = {
      ...userData,
      role: userData.role || 'student',
      createdAt: new Date().toISOString()
    };
    
    console.log('Creating new user document:', newUser);
    const docRef = await addDoc(usersRef, newUser);
    console.log('User created successfully with ID:', docRef.id);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
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

export const getUserRole = async (email: string): Promise<"admin" | "teacher" | "student" | null> => {
  try {
    console.log('Querying Firebase for user:', email);
    const firestore = getFirestoreInstance();
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data();
      console.log('Found user data:', userData);
      const role = userData.role as "admin" | "teacher" | "student";
      return role;
    }
    
    console.log('User not found in Firebase');
    return null;
  } catch (error) {
    console.error('Error getting user role:', error);
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
}

export interface HomeworkSubmission {
  id: number;
  type: string;
  questionNumber: number;
  link: string;
}

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firestore = getFirestoreInstance();
    await setDoc(doc(firestore, 'homeworkSubmissions', `${userId}_${today.toISOString().split('T')[0]}`), {
      userId,
      date: Timestamp.fromDate(today),
      submissions,
      lastUpdated: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error saving homework submissions:', error);
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

export const getHomeworkSubmissions = async (userId: string): Promise<HomeworkSubmission[] | null> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const submissionsQuery = query(
      collection(getFirestoreInstance(), 'homeworkSubmissions'),
      where('userId', '==', userId),
      where('date', '==', Timestamp.fromDate(today))
    );

    const querySnapshot = await getDocs(submissionsQuery);
    if (!querySnapshot.empty) {
      const data = querySnapshot.docs[0].data();
      return data.submissions as HomeworkSubmission[];
    }

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
