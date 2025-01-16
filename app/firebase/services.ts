// Re-export functions from individual service files
export * from './services/homework';
export * from './services/notification';
export * from './services/class';
export * from './services/user';
export * from './services/progress';
export * from './services/types';
export * from './services/admin';

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc, 
  deleteDoc,
  DocumentData 
} from 'firebase/firestore';
import { db } from './config';

export const getUserByEmail = async (email: string) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
};

export const createUser = async (userData: any) => {
  try {
    const usersRef = collection(db, 'users');
    const docRef = await addDoc(usersRef, userData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const getTeacherClasses = async (teacherEmail: string) => {
  try {
    // Get teacher's document ID first
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
    }));
  } catch (error) {
    console.error('Error getting teacher classes:', error);
    return [];
  }
};

export const getClassStudents = async (classId: string) => {
  try {
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      return [];
    }
    
    const classData = classDoc.data();
    return classData.students || [];
  } catch (error) {
    console.error('Error getting class students:', error);
    return [];
  }
};

export const addStudentToClass = async (classId: string, student: any, teacherId: string) => {
  try {
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      return false;
    }
    
    const classData = classDoc.data();
    const students = classData.students || [];
    
    // Check if student is already in class
    const isStudentInClass = students.some((s: any) => s.email === student.email);
    if (isStudentInClass) {
      return false;
    }
    
    // Add student to class
    await updateDoc(classRef, {
      students: [...students, student]
    });

    // Update student's teacherId
    const userRef = doc(db, 'users', student.id);
    await updateDoc(userRef, {
      teacherId: teacherId
    });

    return true;
  } catch (error) {
    console.error('Error adding student to class:', error);
    return false;
  }
};

export const removeStudentFromClass = async (classId: string, studentId: string) => {
  try {
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      return false;
    }
    
    const classData = classDoc.data();
    const students = classData.students || [];
    
    // Remove student from class
    const updatedStudents = students.filter((s: any) => s.id !== studentId);
    await updateDoc(classRef, {
      students: updatedStudents
    });

    // Update student's teacherId to empty
    const userRef = doc(db, 'users', studentId);
    await updateDoc(userRef, {
      teacherId: ''
    });

    return true;
  } catch (error) {
    console.error('Error removing student from class:', error);
    return false;
  }
};
