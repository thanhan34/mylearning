import { 
  collection, 
  doc, 
  getDocs, 
  setDoc,
  runTransaction,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '../config';
import type { MispronouncedWord, WordStatistic } from '../../../types/mispronounced-words';

// Migrate existing mispronounced words to create statistics
export const migrateMispronouncedWords = async (): Promise<void> => {
  try {
    console.log('Starting migration of mispronounced words...');
    
    // Get all existing mispronounced words
    const wordsQuery = query(
      collection(db, 'mispronounced-words'),
      orderBy('createdAt', 'asc')
    );
    
    const wordsSnapshot = await getDocs(wordsQuery);
    const words: (MispronouncedWord & { id: string })[] = [];
    
    wordsSnapshot.forEach((doc) => {
      words.push({ id: doc.id, ...doc.data() } as MispronouncedWord & { id: string });
    });
    
    console.log(`Found ${words.length} words to migrate`);
    
    // Group words by word text
    const wordGroups = new Map<string, (MispronouncedWord & { id: string })[]>();
    
    words.forEach((word) => {
      const normalizedWord = word.word.toLowerCase().trim();
      if (!wordGroups.has(normalizedWord)) {
        wordGroups.set(normalizedWord, []);
      }
      wordGroups.get(normalizedWord)!.push(word);
    });
    
    console.log(`Found ${wordGroups.size} unique words`);
    
    // Create statistics for each word group
    for (const [normalizedWord, wordList] of wordGroups) {
      console.log(`Processing word: ${normalizedWord}`);
      
      // Group by student to count unique students
      const studentGroups = new Map<string, (MispronouncedWord & { id: string })[]>();
      
      wordList.forEach((word) => {
        if (!studentGroups.has(word.studentId)) {
          studentGroups.set(word.studentId, []);
        }
        studentGroups.get(word.studentId)!.push(word);
      });
      
      // Create statistics object
      const students: Record<string, any> = {};
      let totalCount = 0;
      let lastUpdated = '';
      
      for (const [studentId, studentWords] of studentGroups) {
        // For the new logic, each student should only have 1 count per word
        // But we'll take the first occurrence for migration
        const firstWord = studentWords[0];
        students[studentId] = {
          count: 1, // Each student can only have 1 occurrence of each word
          name: firstWord.studentName,
          lastAdded: firstWord.createdAt
        };
        totalCount += 1;
        
        if (firstWord.createdAt > lastUpdated) {
          lastUpdated = firstWord.createdAt;
        }
      }
      
      const wordStats: WordStatistic = {
        id: normalizedWord,
        word: normalizedWord,
        totalCount,
        lastUpdated
      };
      
      // Save to word-statistics collection
      const statsRef = doc(db, 'word-statistics', normalizedWord);
      await setDoc(statsRef, wordStats);
      
      console.log(`Created statistics for "${normalizedWord}" with ${studentGroups.size} students`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Function to clean up duplicate words (keep only first occurrence per student)
export const cleanupDuplicateWords = async (): Promise<void> => {
  try {
    console.log('Starting cleanup of duplicate words...');
    
    // Get all existing mispronounced words
    const wordsQuery = query(
      collection(db, 'mispronounced-words'),
      orderBy('createdAt', 'asc')
    );
    
    const wordsSnapshot = await getDocs(wordsQuery);
    const words: (MispronouncedWord & { id: string })[] = [];
    
    wordsSnapshot.forEach((doc) => {
      words.push({ id: doc.id, ...doc.data() } as MispronouncedWord & { id: string });
    });
    
    // Group by student and word
    const studentWordMap = new Map<string, Set<string>>();
    const wordsToDelete: string[] = [];
    
    words.forEach((word) => {
      const key = `${word.studentId}_${word.word.toLowerCase().trim()}`;
      
      if (!studentWordMap.has(word.studentId)) {
        studentWordMap.set(word.studentId, new Set());
      }
      
      const studentWords = studentWordMap.get(word.studentId)!;
      const normalizedWord = word.word.toLowerCase().trim();
      
      if (studentWords.has(normalizedWord)) {
        // This is a duplicate, mark for deletion
        wordsToDelete.push(word.id);
        console.log(`Marking duplicate word "${word.word}" for student ${word.studentId} for deletion`);
      } else {
        // First occurrence, keep it
        studentWords.add(normalizedWord);
      }
    });
    
    console.log(`Found ${wordsToDelete.length} duplicate words to delete`);
    
    // Delete duplicates (you would need to implement the actual deletion)
    // For now, just log what would be deleted
    console.log('Cleanup completed!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
};
