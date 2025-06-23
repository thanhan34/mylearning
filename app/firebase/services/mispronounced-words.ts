import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  updateDoc, 
  getDoc, 
  setDoc,
  runTransaction,
  Timestamp,
  limit 
} from 'firebase/firestore';
import { db } from '../config';
import type { MispronouncedWord, WordStatistic, PersonalWordCount } from '../../../types/mispronounced-words';

// Add a new mispronounced word for a student
export const addMispronouncedWord = async (
  studentId: string, 
  studentName: string, 
  word: string,
  classId?: string
): Promise<boolean> => {
  try {
    const normalizedWord = word.toLowerCase().trim();
    if (!normalizedWord) return false;

    // Check if student already has this word in their personal list
    const existingWordQuery = query(
      collection(db, 'mispronounced-words'),
      where('studentId', '==', studentId),
      where('word', '==', normalizedWord)
    );
    
    const existingWordSnapshot = await getDocs(existingWordQuery);
    
    // If word already exists for this student, don't add it again
    if (!existingWordSnapshot.empty) {
      return false; // Word already exists for this student
    }

    const now = new Date().toISOString();
    
    // Add to personal collection
    const personalWordData: Omit<MispronouncedWord, 'id'> = {
      word: normalizedWord,
      studentId,
      studentName,
      classId,
      createdAt: now,
      updatedAt: now
    };

    await addDoc(collection(db, 'mispronounced-words'), personalWordData);

    // Update statistics using transaction
    await runTransaction(db, async (transaction) => {
      const statsRef = doc(db, 'word-statistics', normalizedWord);
      const statsDoc = await transaction.get(statsRef);

      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as WordStatistic;
        
        // Simply increment total count regardless of student
        const updatedStats: WordStatistic = {
          ...currentStats,
          totalCount: currentStats.totalCount + 1,
          lastUpdated: now
        };
        transaction.update(statsRef, updatedStats as any);
      } else {
        // Create new word statistics
        const newStats: WordStatistic = {
          id: normalizedWord,
          word: normalizedWord,
          totalCount: 1,
          lastUpdated: now
        };
        
        transaction.set(statsRef, newStats);
      }
    });

    return true;
  } catch (error) {
    console.error('Error adding mispronounced word:', error);
    return false;
  }
};

// Get personal mispronounced words for a student (with counts)
export const getPersonalWords = async (studentId: string): Promise<PersonalWordCount[]> => {
  try {
    const q = query(
      collection(db, 'mispronounced-words'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const words: PersonalWordCount[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as MispronouncedWord;
      words.push({
        id: doc.id, // Add document ID for deletion
        word: data.word,
        count: 1, // Each word appears only once per student
        lastAdded: data.createdAt
      });
    });

    // Sort by creation date (newest first)
    return words.sort((a, b) => new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime());
  } catch (error) {
    console.error('Error getting personal words:', error);
    return [];
  }
};

// Get common words statistics (sorted by frequency) with pagination
export const getCommonWords = async (limitCount: number = 50): Promise<WordStatistic[]> => {
  try {
    // Use query with orderBy and limit to reduce data transfer
    const q = query(
      collection(db, 'word-statistics'),
      orderBy('totalCount', 'desc'),
      orderBy('lastUpdated', 'desc'),
      limit(limitCount)
    );
    
    const querySnapshot = await getDocs(q);
    const stats: WordStatistic[] = [];
    
    querySnapshot.forEach((doc) => {
      stats.push({ id: doc.id, ...doc.data() } as WordStatistic);
    });

    return stats;
  } catch (error) {
    console.error('Error getting common words:', error);
    return [];
  }
};

// Delete a mispronounced word from personal list
export const deleteMispronouncedWord = async (
  wordId: string, 
  studentId: string, 
  word: string,
  studentName: string
): Promise<boolean> => {
  try {
    const normalizedWord = word.toLowerCase().trim();
    
    // Delete from personal collection
    await deleteDoc(doc(db, 'mispronounced-words', wordId));

    // Update statistics using transaction
    await runTransaction(db, async (transaction) => {
      const statsRef = doc(db, 'word-statistics', normalizedWord);
      const statsDoc = await transaction.get(statsRef);

      if (statsDoc.exists()) {
        const currentStats = statsDoc.data() as WordStatistic;
        const newTotalCount = currentStats.totalCount - 1;
        
        if (newTotalCount <= 0) {
          // Delete the entire statistics document if count reaches 0
          transaction.delete(statsRef);
        } else {
          // Update total count
          const updatedStats: WordStatistic = {
            ...currentStats,
            totalCount: newTotalCount,
            lastUpdated: new Date().toISOString()
          };
          transaction.update(statsRef, updatedStats as any);
        }
      }
    });

    return true;
  } catch (error) {
    console.error('Error deleting mispronounced word:', error);
    return false;
  }
};
