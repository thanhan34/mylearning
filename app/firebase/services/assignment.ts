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
  arrayUnion,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config';
import { Assignment, AssignmentSubmission, CreateAssignmentData } from '../../../types/assignment';
import { addNotification } from './notification';
import { getClassById } from './class';
import { getUserById } from './user';

/**
 * Create a new assignment
 */
export const createAssignment = async (assignmentData: CreateAssignmentData): Promise<string | null> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    
    const newAssignment: Omit<Assignment, 'id'> = {
      ...assignmentData,
      createdAt: new Date().toISOString(),
      status: 'active',
      notificationSent: false,
      submissions: []
    };

    const docRef = await addDoc(assignmentsRef, newAssignment);
    
    // Send notifications to target students
    await sendAssignmentNotifications(docRef.id, assignmentData);
    
    console.log('Successfully created assignment:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating assignment:', error);
    return null;
  }
};

/**
 * Get assignments created by a teacher or assistant
 */
export const getAssignmentsByTeacher = async (teacherId: string): Promise<Assignment[]> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(
      assignmentsRef,
      where('assignedBy', '==', teacherId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const assignments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Assignment));
    
    return assignments;
  } catch (error) {
    console.error('Error getting assignments by teacher:', error);
    return [];
  }
};

/**
 * Get assignments for a specific student
 */
export const getAssignmentsByStudent = async (studentId: string): Promise<Assignment[]> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(
      assignmentsRef,
      where('targetStudents', 'array-contains', studentId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const assignments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Assignment));
    
    return assignments;
  } catch (error) {
    console.error('Error getting assignments by student:', error);
    return [];
  }
};

/**
 * Submit an assignment
 */
export const submitAssignment = async (
  assignmentId: string,
  studentId: string,
  studentName: string,
  content: string,
  attachments?: string[]
): Promise<boolean> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      console.error('Assignment not found:', assignmentId);
      return false;
    }
    
    const assignmentData = assignmentDoc.data() as Assignment;
    const dueDate = new Date(assignmentData.dueDate);
    const now = new Date();
    
    const submission: AssignmentSubmission = {
      studentId,
      studentName,
      submittedAt: now.toISOString(),
      content,
      attachments: attachments || [],
      status: now > dueDate ? 'late' : 'submitted'
    };
    
    // Check if student already submitted
    const existingSubmissionIndex = assignmentData.submissions.findIndex(
      sub => sub.studentId === studentId
    );
    
    if (existingSubmissionIndex >= 0) {
      // Update existing submission
      assignmentData.submissions[existingSubmissionIndex] = submission;
    } else {
      // Add new submission
      assignmentData.submissions.push(submission);
    }
    
    await updateDoc(assignmentRef, {
      submissions: assignmentData.submissions
    });
    
    // Send notification to teacher - get teacher email first
    const teacherDoc = await getUserById(assignmentData.assignedBy);
    if (teacherDoc && teacherDoc.email) {
      const message = `${studentName} has submitted assignment: ${assignmentData.title}`;
      const notificationType = assignmentData.assignedByRole === 'teacher' ? 'teacher' : 'assistant';
      await addNotification(teacherDoc.email, message, notificationType);
    }
    
    console.log('Successfully submitted assignment');
    return true;
  } catch (error) {
    console.error('Error submitting assignment:', error);
    return false;
  }
};

/**
 * Grade an assignment submission
 */
export const gradeAssignment = async (
  assignmentId: string,
  studentId: string,
  grade: number,
  feedback: string,
  gradedBy: string,
  gradedByName: string
): Promise<boolean> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      console.error('Assignment not found:', assignmentId);
      return false;
    }
    
    const assignmentData = assignmentDoc.data() as Assignment;
    const submissionIndex = assignmentData.submissions.findIndex(
      sub => sub.studentId === studentId
    );
    
    if (submissionIndex === -1) {
      console.error('Submission not found for student:', studentId);
      return false;
    }
    
    // Update submission with grade and feedback
    assignmentData.submissions[submissionIndex] = {
      ...assignmentData.submissions[submissionIndex],
      grade,
      feedback,
      gradedBy,
      gradedByName,
      gradedAt: new Date().toISOString(),
      status: 'graded'
    };
    
    await updateDoc(assignmentRef, {
      submissions: assignmentData.submissions
    });
    
    // Note: Student notifications would need to be implemented separately
    // as the current notification system only supports teacher/admin notifications
    
    console.log('Successfully graded assignment');
    return true;
  } catch (error) {
    console.error('Error grading assignment:', error);
    return false;
  }
};

/**
 * Get assignment by ID
 */
export const getAssignmentById = async (assignmentId: string): Promise<Assignment | null> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (assignmentDoc.exists()) {
      return {
        id: assignmentDoc.id,
        ...assignmentDoc.data()
      } as Assignment;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting assignment by ID:', error);
    return null;
  }
};

/**
 * Update an assignment
 */
export const updateAssignment = async (
  assignmentId: string,
  updateData: {
    title?: string;
    instructions?: string;
    dueDate?: string;
  }
): Promise<boolean> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      console.error('Assignment not found:', assignmentId);
      return false;
    }
    
    await updateDoc(assignmentRef, updateData);
    
    console.log('Successfully updated assignment');
    return true;
  } catch (error) {
    console.error('Error updating assignment:', error);
    return false;
  }
};

/**
 * Delete an assignment
 */
export const deleteAssignment = async (assignmentId: string): Promise<boolean> => {
  try {
    const assignmentRef = doc(db, 'assignments', assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);
    
    if (!assignmentDoc.exists()) {
      console.error('Assignment not found:', assignmentId);
      return false;
    }
    
    // Update status to expired instead of deleting
    await updateDoc(assignmentRef, {
      status: 'expired'
    });
    
    console.log('Successfully deleted assignment');
    return true;
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return false;
  }
};

/**
 * Send notifications to students about new assignment
 * Note: Currently disabled as the notification system only supports teacher/admin notifications
 */
const sendAssignmentNotifications = async (
  assignmentId: string,
  assignmentData: CreateAssignmentData
): Promise<void> => {
  try {
    // TODO: Implement student notifications when the notification system supports it
    // const message = `New assignment: ${assignmentData.title} - Due: ${new Date(assignmentData.dueDate).toLocaleDateString()}`;
    
    // Mark notifications as sent (even though we're not sending them yet)
    const assignmentRef = doc(db, 'assignments', assignmentId);
    await updateDoc(assignmentRef, {
      notificationSent: true
    });
    
  } catch (error) {
    console.error('Error sending assignment notifications:', error);
  }
};

/**
 * Get students for assignment target (class or individual)
 */
export const getTargetStudents = async (
  targetType: 'class' | 'individual',
  targetId: string,
  individualStudents?: string[]
): Promise<string[]> => {
  try {
    if (targetType === 'individual' && individualStudents) {
      return individualStudents;
    }
    
    if (targetType === 'class') {
      const classData = await getClassById(targetId);
      if (classData && classData.students) {
        return classData.students.map(student => student.id);
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error getting target students:', error);
    return [];
  }
};

/**
 * Update assignment status based on due date
 */
export const updateExpiredAssignments = async (): Promise<void> => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(
      assignmentsRef,
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    const now = new Date();
    
    querySnapshot.docs.forEach(doc => {
      const assignment = doc.data() as Assignment;
      const dueDate = new Date(assignment.dueDate);
      
      if (now > dueDate) {
        batch.update(doc.ref, { status: 'expired' });
      }
    });
    
    await batch.commit();
    console.log('Updated expired assignments');
  } catch (error) {
    console.error('Error updating expired assignments:', error);
  }
};
