import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../config';

export interface User {
  id: string;
  email: string;
  role: "admin" | "teacher" | "student";
  avatar?: string;
  target?: string;
  name?: string;
  classId?: string;
  teacherId?: string;
  passed?: boolean;
}

export const createUser = async (userData: {
  email: string;
  name: string;
  role?: "admin" | "teacher" | "student";
}): Promise<string | null> => {
  try {
    // Check if user exists first
    const usersRef = collection(db, 'users');
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
      teacherId: '',
      passed: false
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
    const userRef = doc(db, 'users', userId);
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

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        id: userSnap.id,
        email: data.email,
        role: data.role as "admin" | "teacher" | "student",
        avatar: data.avatar,
        target: data.target,
        name: data.name,
        classId: data.classId,
        teacherId: data.teacherId,
        passed: data.passed
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
};

export const updateUserPassedStatus = async (userId: string, passed: boolean): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { passed });
    return true;
  } catch (error) {
    console.error('Error updating user passed status:', error);
    return false;
  }
};

export const markClassAsPassed = async (classId: string): Promise<boolean> => {
  try {
    // Get class document
    const classRef = doc(db, 'classes', classId);
    const classDoc = await getDoc(classRef);
    
    if (!classDoc.exists()) {
      throw new Error('Class not found');
    }
    
    const classData = classDoc.data();
    const students = classData.students || [];
    
    // Update passed status for all students in the class
    for (const student of students) {
      await updateUserPassedStatus(student.id, true);
    }
    
    return true;
  } catch (error) {
    console.error('Error marking class as passed:', error);
    return false;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    console.log('Getting user by email:', email);
    
    // Try direct document lookup first using sanitized email
    const sanitizedEmail = email.replace(/[.#$[\]]/g, '_');
    const userDoc = await getDoc(doc(db, 'users', sanitizedEmail));
    
    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('Found user by direct lookup:', {
        id: userDoc.id,
        email: data.email,
        teacherId: data.teacherId,
        passed: data.passed
      });
      return {
        id: userDoc.id,
        email: data.email,
        role: data.role as "admin" | "teacher" | "student",
        avatar: data.avatar,
        target: data.target,
        name: data.name,
        classId: data.classId,
        teacherId: data.teacherId,
        passed: data.passed
      };
    }

    // Fallback to query if direct lookup fails
    console.log('Direct lookup failed, trying query...');
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      console.log('Found user by query:', {
        id: doc.id,
        email: data.email,
        teacherId: data.teacherId,
        passed: data.passed
      });
      return {
        id: doc.id,
        email: data.email,
        role: data.role as "admin" | "teacher" | "student",
        avatar: data.avatar,
        target: data.target,
        name: data.name,
        classId: data.classId,
        teacherId: data.teacherId,
        passed: data.passed
      };
    }

    console.log('User not found:', email);
    
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
