import { collection, doc, getDoc, getDocs, query, where, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../config';

export interface StudentNickname {
  id: string;
  teacherId: string;
  studentId: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to create nickname document ID
const createNicknameId = (teacherId: string, studentId: string): string => {
  return `${teacherId}_${studentId}`;
};

// Set or update a student's nickname for a specific teacher
export const setStudentNickname = async (
  teacherId: string, 
  studentId: string, 
  nickname: string
): Promise<boolean> => {
  try {
    if (!nickname.trim()) {
      // If nickname is empty, delete the existing nickname
      return await deleteStudentNickname(teacherId, studentId);
    }

    const nicknameId = createNicknameId(teacherId, studentId);
    const nicknameRef = doc(db, 'student-nicknames', nicknameId);
    
    const nicknameData: Omit<StudentNickname, 'id'> = {
      teacherId,
      studentId,
      nickname: nickname.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check if nickname already exists to update createdAt appropriately
    const existingDoc = await getDoc(nicknameRef);
    if (existingDoc.exists()) {
      const existingData = existingDoc.data();
      nicknameData.createdAt = existingData.createdAt;
    }

    await setDoc(nicknameRef, nicknameData);
    
    console.log(`Successfully set nickname "${nickname}" for student ${studentId} by teacher ${teacherId}`);
    return true;
  } catch (error) {
    console.error('Error setting student nickname:', error);
    return false;
  }
};

// Get a student's nickname for a specific teacher
export const getStudentNickname = async (
  teacherId: string, 
  studentId: string
): Promise<string | null> => {
  try {
    const nicknameId = createNicknameId(teacherId, studentId);
    const nicknameRef = doc(db, 'student-nicknames', nicknameId);
    
    const nicknameDoc = await getDoc(nicknameRef);
    
    if (nicknameDoc.exists()) {
      const data = nicknameDoc.data() as StudentNickname;
      return data.nickname;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting student nickname:', error);
    return null;
  }
};

// Get all nicknames for a specific teacher
export const getStudentNicknames = async (teacherId: string): Promise<Record<string, string>> => {
  try {
    const nicknamesRef = collection(db, 'student-nicknames');
    const q = query(nicknamesRef, where('teacherId', '==', teacherId));
    
    const querySnapshot = await getDocs(q);
    const nicknames: Record<string, string> = {};
    
    querySnapshot.forEach(doc => {
      const data = doc.data() as StudentNickname;
      nicknames[data.studentId] = data.nickname;
    });
    
    return nicknames;
  } catch (error) {
    console.error('Error getting student nicknames:', error);
    return {};
  }
};

// Delete a student's nickname for a specific teacher
export const deleteStudentNickname = async (
  teacherId: string, 
  studentId: string
): Promise<boolean> => {
  try {
    const nicknameId = createNicknameId(teacherId, studentId);
    const nicknameRef = doc(db, 'student-nicknames', nicknameId);
    
    await deleteDoc(nicknameRef);
    
    console.log(`Successfully deleted nickname for student ${studentId} by teacher ${teacherId}`);
    return true;
  } catch (error) {
    console.error('Error deleting student nickname:', error);
    return false;
  }
};

// Get nicknames for multiple students for a specific teacher
export const getMultipleStudentNicknames = async (
  teacherId: string, 
  studentIds: string[]
): Promise<Record<string, string>> => {
  try {
    if (studentIds.length === 0) {
      return {};
    }

    const nicknames: Record<string, string> = {};
    
    // Firestore has a limit of 10 values in an 'in' query
    // So we need to batch the queries if there are more than 10 students
    const batchSize = 10;
    
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batchIds = studentIds.slice(i, i + batchSize);
      
      const nicknamesRef = collection(db, 'student-nicknames');
      const q = query(
        nicknamesRef, 
        where('teacherId', '==', teacherId),
        where('studentId', 'in', batchIds)
      );
      
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach(doc => {
        const data = doc.data() as StudentNickname;
        nicknames[data.studentId] = data.nickname;
      });
    }
    
    return nicknames;
  } catch (error) {
    console.error('Error getting multiple student nicknames:', error);
    return {};
  }
};

// Bulk update nicknames for multiple students
export const bulkUpdateStudentNicknames = async (
  teacherId: string,
  updates: Array<{ studentId: string; nickname: string }>
): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    const timestamp = new Date().toISOString();
    
    for (const update of updates) {
      const nicknameId = createNicknameId(teacherId, update.studentId);
      const nicknameRef = doc(db, 'student-nicknames', nicknameId);
      
      if (update.nickname.trim()) {
        // Check if nickname already exists to preserve createdAt
        const existingDoc = await getDoc(nicknameRef);
        const createdAt = existingDoc.exists() ? existingDoc.data().createdAt : timestamp;
        
        const nicknameData: Omit<StudentNickname, 'id'> = {
          teacherId,
          studentId: update.studentId,
          nickname: update.nickname.trim(),
          createdAt,
          updatedAt: timestamp
        };
        
        batch.set(nicknameRef, nicknameData);
      } else {
        // Delete if nickname is empty
        batch.delete(nicknameRef);
      }
    }
    
    await batch.commit();
    
    console.log(`Successfully bulk updated ${updates.length} nicknames for teacher ${teacherId}`);
    return true;
  } catch (error) {
    console.error('Error bulk updating student nicknames:', error);
    return false;
  }
};
