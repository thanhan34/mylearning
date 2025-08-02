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

// Upload voice feedback audio file
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
    // Create unique filename
    const timestamp = Date.now();
    const filename = `voice-feedback/${teacherId}/${studentId}/${submissionId}_${submissionType}_${submissionQuestionNumber}_${timestamp}.webm`;
    
    // Upload to Firebase Storage with retry mechanism
    const storageRef = ref(storage, filename);
    
    // Add metadata to help with CORS
    const metadata = {
      contentType: audioBlob.type || 'audio/webm',
      customMetadata: {
        'studentId': studentId,
        'teacherId': teacherId,
        'submissionId': submissionId,
        'uploadedAt': new Date().toISOString()
      }
    };
    
    let uploadResult;
    let audioUrl;
    
    try {
      uploadResult = await uploadBytes(storageRef, audioBlob, metadata);
      audioUrl = await getDownloadURL(uploadResult.ref);
    } catch (storageError: any) {
      console.error('Storage upload error:', storageError);
      
      // If CORS error, try alternative approach
      if (storageError.code === 'storage/unauthorized' || 
          storageError.message?.includes('CORS') ||
          storageError.message?.includes('Access to XMLHttpRequest')) {
        
        // Create a data URL as fallback
        const reader = new FileReader();
        audioUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        
        console.warn('Using data URL fallback due to CORS issues');
      } else {
        throw storageError;
      }
    }
    
    // Save metadata to Firestore
    const voiceFeedbackData: Omit<VoiceFeedback, 'id'> = {
      studentId,
      studentName,
      teacherId,
      teacherName,
      submissionId,
      submissionType,
      submissionQuestionNumber,
      audioUrl,
      audioPath: filename,
      duration,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'voiceFeedback'), voiceFeedbackData);
    
    return {
      id: docRef.id,
      ...voiceFeedbackData
    };
  } catch (error) {
    console.error('Error uploading voice feedback:', error);
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

// Delete voice feedback
export const deleteVoiceFeedback = async (voiceFeedbackId: string): Promise<boolean> => {
  try {
    // First get the voice feedback to get the audio path
    const voiceFeedbacks = await getDocs(
      query(collection(db, 'voiceFeedback'), where('__name__', '==', voiceFeedbackId))
    );
    
    if (voiceFeedbacks.empty) {
      console.error('Voice feedback not found');
      return false;
    }
    
    const voiceFeedbackData = voiceFeedbacks.docs[0].data() as VoiceFeedback;
    
    // Delete from Storage
    const storageRef = ref(storage, voiceFeedbackData.audioPath);
    await deleteObject(storageRef);
    
    // Delete from Firestore
    await updateDoc(doc(db, 'voiceFeedback', voiceFeedbackId), {
      deleted: true,
      deletedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error deleting voice feedback:', error);
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
