import { collection, doc, getDoc, getDocs, query, where, runTransaction, arrayUnion, addDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import { Class, ClassStudent } from './types';
import { getUserByEmail, User } from './user';

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

export const getClassById = async (classId: string): Promise<Class | null> => {
  try {
    console.log("Getting class by ID:", classId);
    const classRef = doc(db, 'classes', classId);
    
    // Get class document with retry logic
    const classDoc = await retryOperation(() => getDoc(classRef));
    
    if (classDoc.exists()) {
      const classData = classDoc.data();
      console.log("Found class data:", {
        id: classDoc.id,
        name: classData.name,
        teacherId: classData.teacherId,
        studentCount: classData.students?.length || 0
      });
      return {
        id: classDoc.id,
        ...classData
      } as Class;
    }
    
    console.log("No class found with ID:", classId);
    return null;
  } catch (error) {
    console.error('Error getting class by ID:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

export const getAssistantClasses = async (assistantEmail: string): Promise<Class[]> => {
  try {
    // Get assistant's document ID
    const assistantDoc = await getUserByEmail(assistantEmail);
    if (!assistantDoc) {
      console.error('Assistant not found:', assistantEmail);
      return [];
    }

    // Check if user is an assistant and has assigned classes
    if (assistantDoc.role !== 'assistant' || !assistantDoc.assignedClassIds || assistantDoc.assignedClassIds.length === 0) {
      console.error('User is not an assistant or has no assigned classes:', assistantEmail);
      return [];
    }

    const allClasses: Class[] = [];
    
    // Get each assigned class by ID
    for (const classId of assistantDoc.assignedClassIds) {
      const classData = await getClassById(classId);
      if (classData) {
        allClasses.push(classData);
      }
    }
    
    console.log(`Retrieved ${allClasses.length} classes for assistant: ${assistantEmail}`);
    return allClasses;
  } catch (error) {
    console.error('Error getting assistant classes:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        assistantEmail,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

export const getTeacherClasses = async (teacherEmail: string): Promise<Class[]> => {
  try {
    // Get teacher's document ID
    const teacherDoc = await getUserByEmail(teacherEmail);
    if (!teacherDoc) {
      console.error('Teacher not found:', teacherEmail);
      return [];
    }

    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('teacherId', '==', teacherDoc.id));
    
    // Get classes with retry logic
    const querySnapshot = await retryOperation(() => getDocs(q));
    
    const classes = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as Class));
    
    console.log(`Retrieved ${classes.length} classes for teacher: ${teacherEmail}`);
    return classes;
  } catch (error) {
    console.error('Error getting teacher classes:', error);
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

export const createClass = async (classData: Omit<Class, 'id'>): Promise<string | null> => {
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
    
    const classesRef = collection(db, 'classes');
    
    // Add document with retry logic
    const docRef = await retryOperation(() => addDoc(classesRef, classData));
    
    console.log(`Successfully created class: ${docRef.id} (${classData.name})`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
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

export const addStudentToClass = async (classId: string, student: ClassStudent, teacherId: string): Promise<boolean> => {
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

    const classRef = doc(db, 'classes', classId);
    const userRef = doc(db, 'users', student.id);
    
    // Get class document with retry logic
    const classDoc = await retryOperation(() => getDoc(classRef));
    if (!classDoc.exists()) {
      console.error('Class not found:', classId);
      return false;
    }
    
    // Get user document with retry logic
    const userDoc = await retryOperation(() => getDoc(userRef));
    if (!userDoc.exists()) {
      console.error('User not found:', student.id);
      return false;
    }
    
    // Get current students array and check for duplicates
    const classData = classDoc.data();
    const students = classData.students || [];
    const isDuplicate = students.some((s: ClassStudent) => s.email === student.email);
    
    if (isDuplicate) {
      console.log(`Student ${student.email} is already in class ${classId}`);
      return true; // Already in class, consider it a success
    }
    
    // Get user data to check current status
    const userData = userDoc.data();
    const currentClassId = userData.classId;

    // Only add if not already in a class
    if (currentClassId && currentClassId !== '') {
      console.log(`Student ${student.id} is already in another class: ${currentClassId}`);
      return false;
    }
    
    // Create a batch for the updates
    const batch = writeBatch(db);
    
    // Add updates to batch
    batch.update(classRef, {
      students: [...students, student]
    });
    
    // Update user with teacher and class IDs
    batch.update(userRef, { 
      teacherId: finalTeacherId || '',
      classId: classId
    });
    
    // Commit the batch with retry logic
    await retryOperation(() => batch.commit());
    
    console.log(`Successfully added student ${student.id} to class ${classId}`);
    return true;
  } catch (error) {
    console.error('Error adding student to class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        studentId: student.id,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

export const removeStudentFromClass = async (classId: string, studentId: string): Promise<boolean> => {
  try {
    // Get references
    const classRef = doc(db, 'classes', classId);
    const userRef = doc(db, 'users', studentId);
    
    // First, get the class document to check if it exists and get current students
    const classDoc = await retryOperation(() => getDoc(classRef));
    if (!classDoc.exists()) {
      console.error('Class not found:', classId);
      return false;
    }
    
    // Get the user document to check if it exists
    const userDoc = await retryOperation(() => getDoc(userRef));
    if (!userDoc.exists()) {
      console.error('User not found:', studentId);
      return false;
    }
    
    // Update class students array
    const classData = classDoc.data() as Class;
    const updatedStudents = classData.students.filter(student => student.id !== studentId);
    
    // Create a batch for the updates
    const batch = writeBatch(db);
    
    // Add updates to batch
    batch.update(classRef, { students: updatedStudents });
    batch.update(userRef, { 
      teacherId: '',
      classId: '' 
    });
    
    // Commit the batch with retry logic
    await retryOperation(() => batch.commit());
    
    console.log(`Successfully removed student ${studentId} from class ${classId}`);
    return true;
  } catch (error) {
    console.error('Error removing student from class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        studentId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

export const updateStudentName = async (
  userId: string, 
  classId: string, 
  newName: string, 
  email: string,
  target: string
): Promise<boolean> => {
  try {
    // Get references
    const userRef = doc(db, 'users', userId);
    const classRef = doc(db, 'classes', classId);

    // Get current data with retry logic
    const userDoc = await retryOperation(() => getDoc(userRef));
    if (!userDoc.exists()) {
      console.error('User not found:', userId);
      return false;
    }

    const classDoc = await retryOperation(() => getDoc(classRef));
    if (!classDoc.exists()) {
      console.error('Class not found:', classId);
      return false;
    }

    // Get class data
    const classData = classDoc.data() as Class;
    const students = classData.students || [];

    // Update the student in the class's students array
    const updatedStudents = students.map(student => {
      if (student.id === userId) {
        return {
          ...student,
          name: newName
        };
      }
      return student;
    });

    // Create a batch for the updates
    const batch = writeBatch(db);
    
    // Add updates to batch
    batch.update(userRef, {
      name: newName,
      email,
      target
    });

    batch.update(classRef, {
      students: updatedStudents
    });
    
    // Commit the batch with retry logic
    await retryOperation(() => batch.commit());
    
    console.log(`Successfully updated student ${userId} name to ${newName}`);
    return true;
  } catch (error) {
    console.error('Error updating student name:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        userId,
        classId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

export const cleanupClassStudents = async (classId: string): Promise<boolean> => {
  try {
    const classRef = doc(db, 'classes', classId);
    
    // Get class document with retry logic
    const classDoc = await retryOperation(() => getDoc(classRef));
    if (!classDoc.exists()) {
      console.error('Class not found:', classId);
      return false;
    }
    
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
      // Create a batch for the update
      const batch = writeBatch(db);
      
      // Add update to batch
      batch.update(classRef, {
        students: uniqueStudentsArray,
        studentCount: uniqueStudentsArray.length
      });
      
      // Commit the batch with retry logic
      await retryOperation(() => batch.commit());
      
      console.log(`Successfully cleaned up class ${classId}, removed ${students.length - uniqueStudentsArray.length} duplicate students`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cleaning up class students:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};
