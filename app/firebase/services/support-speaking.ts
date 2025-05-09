import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  runTransaction, 
  arrayUnion, 
  addDoc, 
  writeBatch, 
  updateDoc,
  Timestamp,
  deleteDoc,
  orderBy
} from 'firebase/firestore';
import { db } from '../config';
import { SupportClass, SupportClassStudent, SupportAttendance, SupportAttendanceRecord, SupportEvaluation } from '../../../types/support-speaking';
import { getUserByEmail, getUserById } from './user';
import { getHomeworkSubmissions } from './homework';
import { getHomeworkProgress } from './progress';
import { getClassById } from './class';

// Helper function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to implement exponential backoff
const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries = 5,
  initialDelay = 1000
): Promise<any> => {
  let retries = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      retries++;
      
      // If we've reached max retries or it's not a resource exhausted error, throw
      if (retries >= maxRetries || 
          !(error?.code === 'resource-exhausted' || 
            (error?.name === 'FirebaseError' && error?.message?.includes('resource-exhausted')))) {
        throw error;
      }
      
      // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, etc.)
      const waitTime = initialDelay * Math.pow(2, retries - 1);
      console.log(`Retrying operation after ${waitTime}ms (attempt ${retries})`);
      await delay(waitTime);
    }
  }
};

/**
 * Get a Support Speaking class by ID
 */
export const getSupportClassById = async (supportClassId: string): Promise<SupportClass | null> => {
  try {
    console.log("Getting support class by ID:", supportClassId);
    const classRef = doc(db, 'supportClasses', supportClassId);
    
    // Get class document with retry logic
    const classDoc = await retryOperation(() => getDoc(classRef));
    
    if (classDoc.exists()) {
      const classData = classDoc.data();
      console.log("Found support class data:", {
        id: classDoc.id,
        name: classData.name,
        teacherId: classData.teacherId,
        studentCount: classData.students?.length || 0
      });
      return {
        id: classDoc.id,
        ...classData
      } as SupportClass;
    }
    
    console.log("No support class found with ID:", supportClassId);
    return null;
  } catch (error) {
    console.error('Error getting support class by ID:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

/**
 * Get all Support Speaking classes
 */
export const getAllSupportClasses = async (): Promise<SupportClass[]> => {
  try {
    const classesRef = collection(db, 'supportClasses');
    
    // Get all classes with retry logic
    const querySnapshot = await retryOperation(() => getDocs(classesRef));
    
    const classes = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as SupportClass));
    
    console.log(`Retrieved ${classes.length} support classes`);
    return classes;
  } catch (error) {
    console.error('Error getting all support classes:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

/**
 * Get all Support Speaking classes for a teacher
 */
export const getTeacherSupportClasses = async (teacherEmail: string): Promise<SupportClass[]> => {
  try {
    // Get teacher's document ID
    const teacherDoc = await getUserByEmail(teacherEmail);
    if (!teacherDoc) {
      console.error('Teacher not found:', teacherEmail);
      return [];
    }

    const classesRef = collection(db, 'supportClasses');
    const q = query(classesRef, where('teacherId', '==', teacherDoc.id));
    
    // Get classes with retry logic
    const querySnapshot = await retryOperation(() => getDocs(q));
    
    const classes = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as SupportClass));
    
    console.log(`Retrieved ${classes.length} support classes for teacher: ${teacherEmail}`);
    return classes;
  } catch (error) {
    console.error('Error getting teacher support classes:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        teacherEmail,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

/**
 * Delete a Support Speaking class
 */
export const deleteSupportClass = async (supportClassId: string): Promise<boolean> => {
  try {
    // Get class document to check if it exists
    const classRef = doc(db, 'supportClasses', supportClassId);
    const classDoc = await retryOperation(() => getDoc(classRef));
    
    if (!classDoc.exists()) {
      console.error('Support class not found:', supportClassId);
      return false;
    }
    
    // Delete the class document
    await retryOperation(() => deleteDoc(classRef));
    
    console.log(`Successfully deleted support class: ${supportClassId}`);
    return true;
  } catch (error) {
    console.error('Error deleting support class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

/**
 * Create a new Support Speaking class
 */
export const createSupportClass = async (classData: Omit<SupportClass, 'id'>): Promise<string | null> => {
  try {
    // Get teacher's document ID
    const teacherRef = doc(db, 'users', classData.teacherId);
    
    // Get teacher document with retry logic
    const teacherDoc = await retryOperation(() => getDoc(teacherRef));
    
    if (!teacherDoc.exists()) {
      // Try to find teacher by email
      const teachersRef = collection(db, 'users');
      const teacherQuery = query(teachersRef, where('email', '==', classData.teacherId));
      
      // Get teacher by email with retry logic
      const teacherSnapshot = await retryOperation(() => getDocs(teacherQuery));
      
      if (teacherSnapshot.empty) {
        console.error('Teacher not found:', classData.teacherId);
        return null;
      }
      
      // Use the actual document ID
      classData = {
        ...classData,
        teacherId: teacherSnapshot.docs[0].id
      };
    }
    
    const classesRef = collection(db, 'supportClasses');
    
    // Add document with retry logic
    const docRef = await retryOperation(() => addDoc(classesRef, classData));
    
    console.log(`Successfully created support class: ${docRef.id} (${classData.name})`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating support class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        className: classData.name,
        teacherId: classData.teacherId,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

/**
 * Add a student to a Support Speaking class
 * Unlike regular classes, students can be in both a regular class and a support class
 */
export const addStudentToSupportClass = async (
  supportClassId: string, 
  student: Omit<SupportClassStudent, 'regularClassId'>, 
  teacherId: string
): Promise<boolean> => {
  try {
    // Get teacher's document ID first
    let finalTeacherId = teacherId;
    const teacherRef = doc(db, 'users', teacherId);
    
    // Get teacher document with retry logic
    const teacherDoc = await retryOperation(() => getDoc(teacherRef));
    
    if (!teacherDoc.exists()) {
      // Try to find teacher by email
      const teachersRef = collection(db, 'users');
      const teacherQuery = query(teachersRef, where('email', '==', teacherId));
      
      // Get teacher by email with retry logic
      const teacherSnapshot = await retryOperation(() => getDocs(teacherQuery));
      
      if (teacherSnapshot.empty) {
        console.error('Teacher not found:', teacherId);
        return false;
      }
      
      finalTeacherId = teacherSnapshot.docs[0].id;
    }

    const supportClassRef = doc(db, 'supportClasses', supportClassId);
    const userRef = doc(db, 'users', student.id);
    
    // Get support class document with retry logic
    const supportClassDoc = await retryOperation(() => getDoc(supportClassRef));
    if (!supportClassDoc.exists()) {
      console.error('Support class not found:', supportClassId);
      return false;
    }
    
    // Get user document with retry logic
    const userDoc = await retryOperation(() => getDoc(userRef));
    if (!userDoc.exists()) {
      console.error('User not found:', student.id);
      return false;
    }
    
    // Get current students array and check for duplicates
    const supportClassData = supportClassDoc.data();
    const students = supportClassData.students || [];
    const isDuplicate = students.some((s: SupportClassStudent) => s.email === student.email);
    
    if (isDuplicate) {
      console.log(`Student ${student.email} is already in support class ${supportClassId}`);
      return true; // Already in class, consider it a success
    }
    
    // Get user data to get current regular class
    const userData = userDoc.data();
    const regularClassId = userData.classId || '';

    // Create a batch for the updates
    const batch = writeBatch(db);
    
    // Create the complete student object with regularClassId
    const supportClassStudent: SupportClassStudent = {
      ...student,
      regularClassId
    };
    
    // Add updates to batch
    batch.update(supportClassRef, {
      students: [...students, supportClassStudent]
    });
    
    // Update user with support class ID
    batch.update(userRef, { 
      supportClassId: supportClassId
    });
    
    // Commit the batch with retry logic
    await retryOperation(() => batch.commit());
    
    console.log(`Successfully added student ${student.id} to support class ${supportClassId}`);
    return true;
  } catch (error) {
    console.error('Error adding student to support class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        studentId: student.id,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

/**
 * Remove a student from a Support Speaking class
 */
export const removeStudentFromSupportClass = async (supportClassId: string, studentId: string): Promise<boolean> => {
  try {
    // Get references
    const supportClassRef = doc(db, 'supportClasses', supportClassId);
    const userRef = doc(db, 'users', studentId);
    
    // First, get the support class document to check if it exists and get current students
    const supportClassDoc = await retryOperation(() => getDoc(supportClassRef));
    if (!supportClassDoc.exists()) {
      console.error('Support class not found:', supportClassId);
      return false;
    }
    
    // Get the user document to check if it exists
    const userDoc = await retryOperation(() => getDoc(userRef));
    if (!userDoc.exists()) {
      console.error('User not found:', studentId);
      return false;
    }
    
    // Update support class students array
    const supportClassData = supportClassDoc.data() as SupportClass;
    const updatedStudents = supportClassData.students.filter(student => student.id !== studentId);
    
    // Create a batch for the updates
    const batch = writeBatch(db);
    
    // Add updates to batch
    batch.update(supportClassRef, { students: updatedStudents });
    
    // Remove supportClassId from user
    batch.update(userRef, { 
      supportClassId: '' 
    });
    
    // Commit the batch with retry logic
    await retryOperation(() => batch.commit());
    
    console.log(`Successfully removed student ${studentId} from support class ${supportClassId}`);
    return true;
  } catch (error) {
    console.error('Error removing student from support class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        studentId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

/**
 * Create a new attendance record for a Support Speaking class
 */
export const createSupportAttendance = async (
  supportClassId: string,
  date: string,
  createdBy: string,
  students: SupportAttendanceRecord[]
): Promise<string | null> => {
  try {
    // Validate support class exists
    const supportClassData = await getSupportClassById(supportClassId);
    if (!supportClassData) {
      console.error('Support class not found:', supportClassId);
      return null;
    }

    // Check if attendance already exists for this date and support class
    const attendanceRef = collection(db, 'supportAttendance');
    const q = query(
      attendanceRef,
      where('supportClassId', '==', supportClassId),
      where('date', '==', date)
    );
    
    const existingAttendance = await retryOperation(() => getDocs(q));
    
    if (!existingAttendance.empty) {
      console.log(`Attendance already exists for support class ${supportClassId} on ${date}`);
      return existingAttendance.docs[0].id;
    }
    
    // Create new attendance record
    const now = Timestamp.now();
    const attendanceData: Omit<SupportAttendance, 'id'> = {
      supportClassId,
      date,
      createdAt: now,
      updatedAt: now,
      createdBy,
      students
    };
    
    const docRef = await retryOperation(() => addDoc(attendanceRef, attendanceData));
    
    console.log(`Successfully created support attendance record: ${docRef.id} for class ${supportClassId} on ${date}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating support attendance record:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

/**
 * Update an existing attendance record for a Support Speaking class
 */
export const updateSupportAttendance = async (
  attendanceId: string,
  students: SupportAttendanceRecord[]
): Promise<boolean> => {
  try {
    const attendanceRef = doc(db, 'supportAttendance', attendanceId);
    
    // Check if attendance exists
    const attendanceDoc = await retryOperation(() => getDoc(attendanceRef));
    if (!attendanceDoc.exists()) {
      console.error('Support attendance record not found:', attendanceId);
      return false;
    }
    
    // Update attendance
    await retryOperation(() => updateDoc(attendanceRef, {
      students,
      updatedAt: Timestamp.now()
    }));
    
    console.log(`Successfully updated support attendance record: ${attendanceId}`);
    return true;
  } catch (error) {
    console.error('Error updating support attendance record:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        attendanceId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

/**
 * Get attendance for a specific Support Speaking class on a specific date
 */
export const getSupportAttendanceByClassAndDate = async (
  supportClassId: string,
  date: string
): Promise<SupportAttendance | null> => {
  try {
    const attendanceRef = collection(db, 'supportAttendance');
    const q = query(
      attendanceRef,
      where('supportClassId', '==', supportClassId),
      where('date', '==', date)
    );
    
    const attendanceSnapshot = await retryOperation(() => getDocs(q));
    
    if (attendanceSnapshot.empty) {
      console.log(`No attendance found for support class ${supportClassId} on ${date}`);
      return null;
    }
    
    const attendanceDoc = attendanceSnapshot.docs[0];
    const attendanceData = attendanceDoc.data();
    
    return {
      id: attendanceDoc.id,
      supportClassId: attendanceData.supportClassId,
      date: attendanceData.date,
      createdAt: attendanceData.createdAt,
      updatedAt: attendanceData.updatedAt,
      createdBy: attendanceData.createdBy,
      students: attendanceData.students || []
    } as SupportAttendance;
  } catch (error) {
    console.error('Error getting support attendance by class and date:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

/**
 * Get all attendance records for a specific Support Speaking class
 */
export const getSupportAttendanceByClass = async (supportClassId: string): Promise<SupportAttendance[]> => {
  try {
    const attendanceRef = collection(db, 'supportAttendance');
    const q = query(
      attendanceRef,
      where('supportClassId', '==', supportClassId),
      orderBy('date', 'desc')
    );
    
    const attendanceSnapshot = await retryOperation(() => getDocs(q));
    
    const attendanceRecords = attendanceSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        supportClassId: data.supportClassId,
        date: data.date,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        students: data.students || []
      } as SupportAttendance;
    });
    
    console.log(`Retrieved ${attendanceRecords.length} attendance records for support class: ${supportClassId}`);
    return attendanceRecords;
  } catch (error) {
    console.error('Error getting support attendance by class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

/**
 * Create attendance records for all students in a Support Speaking class with default status
 */
export const createDefaultSupportAttendanceForClass = async (
  supportClassId: string,
  date: string,
  createdBy: string,
  defaultStatus: 'present' | 'absent' | 'late' | 'excused' = 'present'
): Promise<string | null> => {
  try {
    // Get support class data to get student list
    const supportClassData = await getSupportClassById(supportClassId);
    if (!supportClassData) {
      console.error('Support class not found:', supportClassId);
      return null;
    }
    
    // Create attendance records for all students
    const students: SupportAttendanceRecord[] = supportClassData.students.map(student => ({
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      status: defaultStatus
    }));
    
    // Create attendance record
    return await createSupportAttendance(supportClassId, date, createdBy, students);
  } catch (error) {
    console.error('Error creating default attendance for support class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

/**
 * Calculate attendance rate for a student in a Support Speaking class
 */
export const getStudentSupportAttendanceRate = async (
  studentId: string,
  supportClassId: string
): Promise<number> => {
  try {
    // Get all attendance records for the support class
    const attendanceRecords = await getSupportAttendanceByClass(supportClassId);
    
    if (attendanceRecords.length === 0) {
      return 0;
    }
    
    // Count how many times the student was present or late
    let presentCount = 0;
    let totalSessions = 0;
    
    attendanceRecords.forEach(record => {
      const studentRecord = record.students.find(s => s.studentId === studentId);
      if (studentRecord) {
        totalSessions++;
        if (studentRecord.status === 'present' || studentRecord.status === 'late' || studentRecord.status === 'excused') {
          presentCount++;
        }
      }
    });
    
    // Calculate attendance rate
    return totalSessions > 0 ? (presentCount / totalSessions) : 0;
  } catch (error) {
    console.error('Error calculating student support attendance rate:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return 0;
  }
};

/**
 * Calculate homework completion rate for a student
 */
export const getStudentHomeworkCompletionRate = async (studentId: string): Promise<number> => {
  try {
    // Get all homework submissions for the student
    const submissions = await getHomeworkSubmissions(studentId);
    
    if (submissions.length === 0) {
      return 0;
    }
    
    // Count how many submissions have links
    const completedSubmissions = submissions.filter(submission => 
      submission.link && submission.link.trim() !== ''
    );
    
    // Calculate completion rate
    return submissions.length > 0 ? (completedSubmissions.length / submissions.length) : 0;
  } catch (error) {
    console.error('Error calculating student homework completion rate:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        timestamp: new Date().toISOString()
      });
    }
    return 0;
  }
};

/**
 * Determine if a student's progress has improved
 */
export const hasStudentProgressImproved = async (studentId: string): Promise<boolean> => {
  try {
    // Get student's progress data
    const progressData = await getHomeworkProgress(studentId);
    
    if (progressData.length < 2) {
      return false; // Not enough data to determine improvement
    }
    
    // Sort progress data by date
    const sortedProgress = [...progressData].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // Calculate average of first half vs second half
    const midpoint = Math.floor(sortedProgress.length / 2);
    const firstHalf = sortedProgress.slice(0, midpoint);
    const secondHalf = sortedProgress.slice(midpoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.completed, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.completed, 0) / secondHalf.length;
    
    // Progress has improved if second half average is higher
    return secondHalfAvg > firstHalfAvg;
  } catch (error) {
    console.error('Error determining if student progress has improved:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

/**
 * Evaluate a student's performance in a Support Speaking class
 */
export const evaluateStudentPerformance = async (
  studentId: string,
  supportClassId: string
): Promise<SupportEvaluation> => {
  try {
    // Get student data
    const student = await getUserById(studentId);
    if (!student) {
      throw new Error(`Student not found: ${studentId}`);
    }
    
    // Calculate attendance rate
    const attendanceRate = await getStudentSupportAttendanceRate(studentId, supportClassId);
    
    // Calculate homework completion rate
    const homeworkCompletionRate = await getStudentHomeworkCompletionRate(studentId);
    
    // Determine if progress has improved
    const progressImproved = await hasStudentProgressImproved(studentId);
    
    // Determine responsibility
    let responsibility: 'teacher' | 'student' | 'inconclusive' = 'inconclusive';
    
    // If student attends regularly and completes homework but doesn't improve
    if (attendanceRate > 0.8 && homeworkCompletionRate > 0.8 && !progressImproved) {
      responsibility = 'teacher';
    }
    // If student doesn't attend regularly or doesn't complete homework
    else if (attendanceRate < 0.8 || homeworkCompletionRate < 0.8) {
      responsibility = 'student';
    }
    
    // Create evaluation record
    const now = Timestamp.now();
    const evaluation: SupportEvaluation = {
      id: '', // Will be set after saving
      studentId,
      studentName: student.name || '',
      supportClassId,
      date: new Date().toISOString().split('T')[0],
      attendanceRate,
      homeworkCompletionRate,
      progressImproved,
      responsibility,
      createdAt: now,
      updatedAt: now
    };
    
    // Save evaluation to Firestore
    const evaluationsRef = collection(db, 'supportEvaluations');
    const docRef = await retryOperation(() => addDoc(evaluationsRef, evaluation));
    
    // Return evaluation with ID
    return {
      ...evaluation,
      id: docRef.id
    };
  } catch (error) {
    console.error('Error evaluating student performance:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Return a default evaluation with error
    const now = Timestamp.now();
    return {
      id: 'error',
      studentId,
      studentName: '',
      supportClassId,
      date: new Date().toISOString().split('T')[0],
      attendanceRate: 0,
      homeworkCompletionRate: 0,
      progressImproved: false,
      responsibility: 'inconclusive',
      notes: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      createdAt: now,
      updatedAt: now
    };
  }
};

/**
 * Get all evaluations for a student in a Support Speaking class
 */
export const getStudentEvaluations = async (
  studentId: string,
  supportClassId: string
): Promise<SupportEvaluation[]> => {
  try {
    const evaluationsRef = collection(db, 'supportEvaluations');
    const q = query(
      evaluationsRef,
      where('studentId', '==', studentId),
      where('supportClassId', '==', supportClassId),
      orderBy('date', 'desc')
    );
    
    const evaluationsSnapshot = await retryOperation(() => getDocs(q));
    
    return evaluationsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as SupportEvaluation));
  } catch (error) {
    console.error('Error getting student evaluations:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        studentId,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

/**
 * Get all evaluations for a Support Speaking class
 */
export const getSupportClassEvaluations = async (supportClassId: string): Promise<SupportEvaluation[]> => {
  try {
    const evaluationsRef = collection(db, 'supportEvaluations');
    const q = query(
      evaluationsRef,
      where('supportClassId', '==', supportClassId),
      orderBy('date', 'desc')
    );
    
    const evaluationsSnapshot = await retryOperation(() => getDocs(q));
    
    return evaluationsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as SupportEvaluation));
  } catch (error) {
    console.error('Error getting support class evaluations:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        supportClassId,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

/**
 * Update an evaluation with notes
 */
export const updateEvaluationNotes = async (
  evaluationId: string,
  notes: string
): Promise<boolean> => {
  try {
    const evaluationRef = doc(db, 'supportEvaluations', evaluationId);
    
    // Check if evaluation exists
    const evaluationDoc = await retryOperation(() => getDoc(evaluationRef));
    if (!evaluationDoc.exists()) {
      console.error('Evaluation not found:', evaluationId);
      return false;
    }
    
    // Update evaluation
    await retryOperation(() => updateDoc(evaluationRef, {
      notes,
      updatedAt: Timestamp.now()
    }));
    
    console.log(`Successfully updated evaluation notes: ${evaluationId}`);
    return true;
  } catch (error) {
    console.error('Error updating evaluation notes:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        evaluationId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};
