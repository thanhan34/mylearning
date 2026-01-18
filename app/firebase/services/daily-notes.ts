import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../config';

export interface DailyNote {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  date: string; // YYYY-MM-DD format
  content: string;
  whatLearned: string; // Học được gì
  whatToPractice: string; // Cần luyện tập gì
  images?: string[]; // Array of image URLs
  createdAt: string;
  updatedAt: string;
}

/**
 * Get daily note for a specific student and date
 */
export const getDailyNote = async (
  studentId: string,
  date: string
): Promise<DailyNote | null> => {
  try {
    const noteId = `${studentId}_${date}`;
    const noteRef = doc(db, 'dailyNotes', noteId);
    const noteDoc = await getDoc(noteRef);
    
    if (noteDoc.exists()) {
      return {
        id: noteDoc.id,
        ...noteDoc.data()
      } as DailyNote;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting daily note:', error);
    return null;
  }
};

/**
 * Save or update daily note
 */
export const saveDailyNote = async (
  studentId: string,
  studentName: string,
  teacherId: string,
  date: string,
  content: string,
  whatLearned: string,
  whatToPractice: string,
  images?: string[]
): Promise<boolean> => {
  try {
    const noteId = `${studentId}_${date}`;
    const noteRef = doc(db, 'dailyNotes', noteId);
    const noteDoc = await getDoc(noteRef);
    
    const now = new Date().toISOString();
    
    if (noteDoc.exists()) {
      // Update existing note
      await updateDoc(noteRef, {
        content,
        whatLearned,
        whatToPractice,
        images: images || [],
        updatedAt: now
      });
    } else {
      // Create new note
      await setDoc(noteRef, {
        studentId,
        studentName,
        teacherId,
        date,
        content,
        whatLearned,
        whatToPractice,
        images: images || [],
        createdAt: now,
        updatedAt: now
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving daily note:', error);
    return false;
  }
};

/**
 * Get all daily notes for a student
 */
export const getStudentDailyNotes = async (
  studentId: string,
  limit: number = 30
): Promise<DailyNote[]> => {
  try {
    const notesRef = collection(db, 'dailyNotes');
    const q = query(
      notesRef,
      where('studentId', '==', studentId),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DailyNote));
    
    return notes.slice(0, limit);
  } catch (error) {
    console.error('Error getting student daily notes:', error);
    return [];
  }
};

/**
 * Get daily notes for a specific date range
 */
export const getDailyNotesByDateRange = async (
  studentId: string,
  startDate: string,
  endDate: string
): Promise<DailyNote[]> => {
  try {
    const notesRef = collection(db, 'dailyNotes');
    const q = query(
      notesRef,
      where('studentId', '==', studentId),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as DailyNote));
    
    return notes;
  } catch (error) {
    console.error('Error getting daily notes by date range:', error);
    return [];
  }
};
