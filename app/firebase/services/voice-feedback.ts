import { db, storage } from '../config';
import { collection, addDoc, updateDoc, doc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export interface VoiceFeedback {
  id?: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  submissionId: string;
  submissionType: string;
  submissionQuestionNumber: number;
  audioUrl: string;
  audioPath: string;
  duration: number; // in seconds
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Upload voice feedback audio file (FREE VERSION - No Firebase Storage needed)
export const uploadVoiceFeedback = async (
  audioBlob: Blob,
  studentId: string,
  studentName: string,
  teacherId: string,
  teacherName: string,
  submissionId: string,
  submissionType: string,
  submissionQuestionNumber: number,
  duration: number
): Promise<VoiceFeedback | null> => {
  try {
    console.log('🎤 Uploading voice feedback (FREE version - no storage costs)...');
    
    // Convert audio blob to base64 (completely free!)
    const audioUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
    
    // Create unique filename for reference
    const timestamp = Date.now();
    const filename = `voice-feedback/${teacherId}/${studentId}/${submissionId}_${submissionType}_${submissionQuestionNumber}_${timestamp}.webm`;
    
    // Save everything to Firestore (completely free within limits!)
    const voiceFeedbackData: Omit<VoiceFeedback, 'id'> = {
      studentId,
      studentName,
      teacherId,
      teacherName,
      submissionId,
      submissionType,
      submissionQuestionNumber,
      audioUrl, // This is now a base64 data URL - no storage needed!
      audioPath: filename,
      duration,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'voiceFeedback'), voiceFeedbackData);
    
    console.log('✅ Voice feedback uploaded successfully (FREE)!', {
      id: docRef.id,
      duration: duration,
      size: Math.round(audioUrl.length / 1024) + 'KB'
    });
    
    return {
      id: docRef.id,
      ...voiceFeedbackData
    };
  } catch (error) {
    console.error('❌ Error uploading voice feedback:', error);
    return null;
  }
};

// Get voice feedback for a specific submission
export const getVoiceFeedbackForSubmission = async (
  submissionId: string,
  submissionType: string,
  submissionQuestionNumber: number
): Promise<VoiceFeedback[]> => {
  try {
    const q = query(
      collection(db, 'voiceFeedback'),
      where('submissionId', '==', submissionId),
      where('submissionType', '==', submissionType),
      where('submissionQuestionNumber', '==', submissionQuestionNumber),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const voiceFeedbacks: VoiceFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      voiceFeedbacks.push({
        id: doc.id,
        ...doc.data()
      } as VoiceFeedback);
    });
    
    return voiceFeedbacks;
  } catch (error) {
    console.error('Error getting voice feedback:', error);
    return [];
  }
};

// Get all voice feedback for a student
export const getVoiceFeedbackForStudent = async (
  studentId: string,
  limit?: number
): Promise<VoiceFeedback[]> => {
  try {
    let q = query(
      collection(db, 'voiceFeedback'),
      where('studentId', '==', studentId),
      orderBy('createdAt', 'desc')
    );
    
    if (limit) {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const voiceFeedbacks: VoiceFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      voiceFeedbacks.push({
        id: doc.id,
        ...doc.data()
      } as VoiceFeedback);
    });
    
    return voiceFeedbacks;
  } catch (error) {
    console.error('Error getting voice feedback for student:', error);
    return [];
  }
};

// Get all voice feedback by a teacher
export const getVoiceFeedbackByTeacher = async (
  teacherId: string,
  limit?: number
): Promise<VoiceFeedback[]> => {
  try {
    let q = query(
      collection(db, 'voiceFeedback'),
      where('teacherId', '==', teacherId),
      orderBy('createdAt', 'desc')
    );
    
    if (limit) {
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const voiceFeedbacks: VoiceFeedback[] = [];
    
    querySnapshot.forEach((doc) => {
      voiceFeedbacks.push({
        id: doc.id,
        ...doc.data()
      } as VoiceFeedback);
    });
    
    return voiceFeedbacks;
  } catch (error) {
    console.error('Error getting voice feedback by teacher:', error);
    return [];
  }
};

// Delete voice feedback (FREE VERSION - No storage deletion needed)
export const deleteVoiceFeedback = async (voiceFeedbackId: string): Promise<boolean> => {
  try {
    console.log('🗑️ Deleting voice feedback (FREE version)...');
    
    // Since we're using base64 storage in Firestore, we just mark as deleted
    // No need to delete from Firebase Storage since we're not using it!
    await updateDoc(doc(db, 'voiceFeedback', voiceFeedbackId), {
      deleted: true,
      deletedAt: Timestamp.now(),
      audioUrl: '', // Clear the base64 data to save space
    });
    
    console.log('✅ Voice feedback deleted successfully (FREE)!');
    return true;
  } catch (error) {
    console.error('❌ Error deleting voice feedback:', error);
    return false;
  }
};

// Update voice feedback metadata
export const updateVoiceFeedbackMetadata = async (
  voiceFeedbackId: string,
  updates: Partial<Pick<VoiceFeedback, 'studentName' | 'teacherName'>>
): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'voiceFeedback', voiceFeedbackId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating voice feedback metadata:', error);
    return false;
  }
};

// Get voice feedback statistics for a teacher
export const getVoiceFeedbackStats = async (teacherId: string): Promise<{
  totalFeedbacks: number;
  totalDuration: number; // in seconds
  studentsWithVoiceFeedback: number;
  recentFeedbacks: VoiceFeedback[];
}> => {
  try {
    const q = query(
      collection(db, 'voiceFeedback'),
      where('teacherId', '==', teacherId),
      where('deleted', '!=', true)
    );
    
    const querySnapshot = await getDocs(q);
    const voiceFeedbacks: VoiceFeedback[] = [];
    let totalDuration = 0;
    const uniqueStudents = new Set<string>();
    
    querySnapshot.forEach((doc) => {
      const feedback = { id: doc.id, ...doc.data() } as VoiceFeedback;
      voiceFeedbacks.push(feedback);
      totalDuration += feedback.duration || 0;
      uniqueStudents.add(feedback.studentId);
    });
    
    // Sort by creation date and get recent ones
    voiceFeedbacks.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    const recentFeedbacks = voiceFeedbacks.slice(0, 10);
    
    return {
      totalFeedbacks: voiceFeedbacks.length,
      totalDuration,
      studentsWithVoiceFeedback: uniqueStudents.size,
      recentFeedbacks
    };
  } catch (error) {
    console.error('Error getting voice feedback stats:', error);
    return {
      totalFeedbacks: 0,
      totalDuration: 0,
      studentsWithVoiceFeedback: 0,
      recentFeedbacks: []
    };
  }
};
