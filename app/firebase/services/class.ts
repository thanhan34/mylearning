import { collection, doc, getDoc, getDocs, query, where, runTransaction, arrayUnion, addDoc } from 'firebase/firestore';
import { db } from '../config';
import { Class, ClassStudent } from './types';
import { getUserByEmail } from './user';

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
    // Get teacher's document ID
    const teacherRef = doc(db, 'users', classData.teacherId);
    const teacherDoc = await getDoc(teacherRef);
    
    if (!teacherDoc.exists()) {
      // Try to find teacher by email
      const teachersRef = collection(db, 'users');
      const teacherQuery = query(teachersRef, where('email', '==', classData.teacherId));
      const teacherSnapshot = await getDocs(teacherQuery);
      
      if (teacherSnapshot.empty) {
        throw new Error('Teacher not found');
      }
      
      // Use the actual document ID
      classData = {
        ...classData,
        teacherId: teacherSnapshot.docs[0].id
      };
    }
    
    const classesRef = collection(db, 'classes');
    const docRef = await addDoc(classesRef, classData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating class:', error);
    return null;
  }
};

export const addStudentToClass = async (classId: string, student: ClassStudent, teacherId: string): Promise<boolean> => {
  try {
    const classRef = doc(db, 'classes', classId);
    const userRef = doc(db, 'users', student.id);
    
    await runTransaction(db, async (transaction) => {
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
        
        // Get teacher's document ID
        const teacherRef = doc(db, 'users', teacherId);
        const teacherDoc = await transaction.get(teacherRef);
        if (!teacherDoc.exists()) {
          // Try to find teacher by email
          const teachersRef = collection(db, 'users');
          const teacherQuery = query(teachersRef, where('email', '==', teacherId));
          const teacherSnapshot = await getDocs(teacherQuery);
          
          if (teacherSnapshot.empty) {
            throw new Error('Teacher not found');
          }
          
          // Use the actual document ID
          transaction.update(userRef, { 
            teacherId: teacherSnapshot.docs[0].id,
            classId: classId 
          });
        } else {
          // Use the document ID directly
          transaction.update(userRef, { 
            teacherId: teacherId,
            classId: classId 
          });
        }
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
    const classRef = doc(db, 'classes', classId);
    const userRef = doc(db, 'users', studentId);
    
    await runTransaction(db, async (transaction) => {
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

export const cleanupClassStudents = async (classId: string): Promise<boolean> => {
  try {
    const classRef = doc(db, 'classes', classId);
    
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
      await runTransaction(db, async (transaction) => {
        transaction.update(classRef, {
          students: uniqueStudentsArray,
          studentCount: uniqueStudentsArray.length
        });
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cleaning up class students:', error);
    return false;
  }
};
