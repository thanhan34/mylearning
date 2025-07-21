import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  addDoc, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { wfdDb } from '../wfd-config';
import { db } from '../config'; // Main MyLearning database
import { WFDSentence, WFDProgress, WFDDailySession, WFDAttempt, VoiceType } from '../../../types/wfd';

// Collection names
const WFD_SENTENCES_COLLECTION = 'writefromdictation';
const WFD_PROGRESS_COLLECTION = 'wfd_progress';
const WFD_DAILY_SESSIONS_COLLECTION = 'wfd_daily_sessions';

/**
 * Get daily WFD sentences (10 sentences with highest occurrence, isHidden: false)
 */
export async function getDailyWFDSentences(): Promise<WFDSentence[]> {
  try {
    const sentencesRef = collection(wfdDb, WFD_SENTENCES_COLLECTION);
    const q = query(
      sentencesRef,
      where('isHidden', '==', false),
      orderBy('occurrence', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    const sentences: WFDSentence[] = [];
    
    querySnapshot.forEach((doc) => {
      sentences.push({
        id: doc.id,
        ...doc.data()
      } as WFDSentence);
    });
    
    console.log(`Fetched ${sentences.length} WFD sentences`);
    return sentences;
  } catch (error) {
    console.error('Error fetching daily WFD sentences:', error);
    throw error;
  }
}

/**
 * Get a specific WFD sentence by ID
 */
export async function getWFDSentenceById(sentenceId: string): Promise<WFDSentence | null> {
  try {
    const sentenceRef = doc(wfdDb, WFD_SENTENCES_COLLECTION, sentenceId);
    const sentenceSnap = await getDoc(sentenceRef);
    
    if (sentenceSnap.exists()) {
      return {
        id: sentenceSnap.id,
        ...sentenceSnap.data()
      } as WFDSentence;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching WFD sentence:', error);
    throw error;
  }
}

/**
 * Get user's daily WFD session
 */
export async function getUserDailySession(userId: string, date: string): Promise<WFDDailySession | null> {
  try {
    const sessionsRef = collection(db, WFD_DAILY_SESSIONS_COLLECTION);
    const q = query(
      sessionsRef,
      where('userId', '==', userId),
      where('date', '==', date),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as WFDDailySession;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user daily session:', error);
    throw error;
  }
}

/**
 * Create or update user's daily WFD session
 */
export async function createOrUpdateDailySession(
  userId: string, 
  date: string, 
  sentences: string[]
): Promise<WFDDailySession> {
  try {
    const existingSession = await getUserDailySession(userId, date);
    
    if (existingSession) {
      // Update existing session
      const sessionRef = doc(db, WFD_DAILY_SESSIONS_COLLECTION, existingSession.id!);
      const updatedData = {
        sentences,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(sessionRef, updatedData);
      
      return {
        ...existingSession,
        sentences,
        updatedAt: Timestamp.now()
      };
    } else {
      // Create new session
      const newSession: Omit<WFDDailySession, 'id'> = {
        userId,
        date,
        sentences,
        completedSentences: [],
        totalProgress: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, WFD_DAILY_SESSIONS_COLLECTION), {
        ...newSession,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...newSession
      };
    }
  } catch (error) {
    console.error('Error creating/updating daily session:', error);
    throw error;
  }
}

/**
 * Get user's progress for a specific WFD sentence
 */
export async function getWFDProgress(userId: string, wfdId: string, dailyDate: string): Promise<WFDProgress | null> {
  try {
    const progressRef = collection(db, WFD_PROGRESS_COLLECTION);
    const q = query(
      progressRef,
      where('userId', '==', userId),
      where('wfdId', '==', wfdId),
      where('dailyDate', '==', dailyDate),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as WFDProgress;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching WFD progress:', error);
    throw error;
  }
}

/**
 * Create or update WFD progress
 */
export async function updateWFDProgress(
  userId: string,
  wfdId: string,
  dailyDate: string,
  attempt: WFDAttempt
): Promise<WFDProgress> {
  try {
    const existingProgress = await getWFDProgress(userId, wfdId, dailyDate);
    
    if (existingProgress) {
      // Update existing progress
      const newAttempts = [...existingProgress.attempts, attempt];
      const correctAttempts = newAttempts.filter(a => a.isCorrect).length;
      const totalAttempts = newAttempts.length;
      const isCompleted = totalAttempts >= 10; // ✅ Hoàn thành sau 10 lần đánh (không cần đúng)
      
      const updatedData: any = {
        attempts: newAttempts,
        correctAttempts,
        updatedAt: serverTimestamp()
      };

      // Only set completedAt if the sentence is completed and wasn't completed before
      if (isCompleted && !existingProgress.completedAt) {
        updatedData.completedAt = new Date().toISOString();
      }
      
      const progressRef = doc(db, WFD_PROGRESS_COLLECTION, existingProgress.id!);
      await updateDoc(progressRef, updatedData);
      
      const updatedProgress = {
        ...existingProgress,
        attempts: newAttempts,
        correctAttempts,
        completedAt: updatedData.completedAt,
        updatedAt: Timestamp.now()
      };

      // Update daily session if sentence is completed
      if (isCompleted && !existingProgress.completedAt) {
        await updateDailySessionProgress(userId, dailyDate, wfdId);
      }
      
      return updatedProgress;
    } else {
      // Create new progress
      const correctAttempts = attempt.isCorrect ? 1 : 0;
      const totalAttempts = 1;
      const isCompleted = totalAttempts >= 10; // ✅ Hoàn thành sau 10 lần đánh (không cần đúng)
      
      const newProgressData: any = {
        userId,
        wfdId,
        dailyDate,
        attempts: [attempt],
        correctAttempts,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Only add completedAt if the sentence is completed
      if (isCompleted) {
        newProgressData.completedAt = new Date().toISOString();
      }
      
      const docRef = await addDoc(collection(db, WFD_PROGRESS_COLLECTION), newProgressData);
      
      const createdProgress = {
        id: docRef.id,
        userId,
        wfdId,
        dailyDate,
        attempts: [attempt],
        correctAttempts,
        completedAt: isCompleted ? new Date().toISOString() : undefined,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      // Update daily session if sentence is completed
      if (isCompleted) {
        await updateDailySessionProgress(userId, dailyDate, wfdId);
      }
      
      return createdProgress;
    }
  } catch (error) {
    console.error('Error updating WFD progress:', error);
    throw error;
  }
}

/**
 * Update daily session progress when a sentence is completed
 */
async function updateDailySessionProgress(userId: string, date: string, completedWfdId: string): Promise<void> {
  try {
    const session = await getUserDailySession(userId, date);
    if (!session) return;
    
    const completedSentences = [...session.completedSentences];
    if (!completedSentences.includes(completedWfdId)) {
      completedSentences.push(completedWfdId);
    }
    
    const totalProgress = Math.round((completedSentences.length / session.sentences.length) * 100);
    
    const sessionRef = doc(db, WFD_DAILY_SESSIONS_COLLECTION, session.id!);
    await updateDoc(sessionRef, {
      completedSentences,
      totalProgress,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating daily session progress:', error);
    throw error;
  }
}

/**
 * Get all user's WFD progress for a specific date
 */
export async function getUserDailyProgress(userId: string, dailyDate: string): Promise<WFDProgress[]> {
  try {
    const progressRef = collection(db, WFD_PROGRESS_COLLECTION);
    const q = query(
      progressRef,
      where('userId', '==', userId),
      where('dailyDate', '==', dailyDate)
    );
    
    const querySnapshot = await getDocs(q);
    const progress: WFDProgress[] = [];
    
    querySnapshot.forEach((doc) => {
      progress.push({
        id: doc.id,
        ...doc.data()
      } as WFDProgress);
    });
    
    return progress;
  } catch (error) {
    console.error('Error fetching user daily progress:', error);
    throw error;
  }
}

/**
 * Check text accuracy (exact match)
 */
export function checkTextAccuracy(userInput: string, correctText: string): { isCorrect: boolean; accuracy: number } {
  const trimmedInput = userInput.trim();
  const trimmedCorrect = correctText.trim();
  
  const isCorrect = trimmedInput === trimmedCorrect;
  
  // Calculate accuracy based on character similarity
  const maxLength = Math.max(trimmedInput.length, trimmedCorrect.length);
  if (maxLength === 0) return { isCorrect: true, accuracy: 100 };
  
  let matches = 0;
  const minLength = Math.min(trimmedInput.length, trimmedCorrect.length);
  
  for (let i = 0; i < minLength; i++) {
    if (trimmedInput[i] === trimmedCorrect[i]) {
      matches++;
    }
  }
  
  const accuracy = Math.round((matches / maxLength) * 100);
  
  return { isCorrect, accuracy };
}

/**
 * Get audio URL for a sentence with specific voice
 */
export function getAudioUrl(sentence: WFDSentence, voice: VoiceType): string {
  return sentence.audio[voice] || sentence.audio.Brian; // Fallback to Brian if voice not available
}
