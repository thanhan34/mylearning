import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../config';
import { PTEChecklistProgress, PTE_CHECKLIST_ITEMS } from '../../../types/pte-checklist';

const COLLECTION_NAME = 'pte-checklist';

export const createPTEChecklistProgress = async (
  userId: string,
  userName: string,
  userEmail: string
): Promise<string | null> => {
  try {
    // Check if progress already exists
    const existingProgress = await getPTEChecklistProgress(userId);
    if (existingProgress) {
      return existingProgress.id!;
    }

    // Initialize items with default values
    const items: PTEChecklistProgress['items'] = {};
    PTE_CHECKLIST_ITEMS.forEach(item => {
      items[item.id] = {
        studentCompleted: false,
        teacherApproved: false,
        notes: ''
      };
    });

    const progressData: PTEChecklistProgress = {
      userId,
      userName,
      userEmail,
      items,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, progressData);
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating PTE checklist progress:', error);
    return null;
  }
};

export const getPTEChecklistProgress = async (userId: string): Promise<PTEChecklistProgress | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as PTEChecklistProgress;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting PTE checklist progress:', error);
    return null;
  }
};

export const getAllPTEChecklistProgress = async (): Promise<PTEChecklistProgress[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('userName')
    );
    
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PTEChecklistProgress));
  } catch (error) {
    console.error('Error getting all PTE checklist progress:', error);
    return [];
  }
};

export const updatePTEChecklistItem = async (
  userId: string,
  itemId: string,
  updates: {
    studentCompleted?: boolean;
    teacherApproved?: boolean;
    notes?: string;
  },
  updatedBy: string
): Promise<boolean> => {
  try {
    const progress = await getPTEChecklistProgress(userId);
    if (!progress || !progress.id) {
      return false;
    }

    const currentItem = progress.items[itemId] || {
      studentCompleted: false,
      teacherApproved: false,
      notes: ''
    };

    const updatedItem = {
      ...currentItem,
      ...updates,
      lastUpdatedBy: updatedBy,
      lastUpdatedAt: Timestamp.now()
    };

    const docRef = doc(db, COLLECTION_NAME, progress.id);
    await updateDoc(docRef, {
      [`items.${itemId}`]: updatedItem,
      updatedAt: Timestamp.now()
    });

    return true;
  } catch (error) {
    console.error('Error updating PTE checklist item:', error);
    return false;
  }
};

export const subscribeToPTEChecklistProgress = (
  userId: string,
  callback: (progress: PTEChecklistProgress | null) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      callback({
        id: doc.id,
        ...doc.data()
      } as PTEChecklistProgress);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to PTE checklist progress:', error);
    callback(null);
  });
};

export const subscribeToAllPTEChecklistProgress = (
  callback: (progressList: PTEChecklistProgress[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, COLLECTION_NAME),
    orderBy('userName')
  );

  return onSnapshot(q, (querySnapshot) => {
    const progressList = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as PTEChecklistProgress));
    
    callback(progressList);
  }, (error) => {
    console.error('Error subscribing to all PTE checklist progress:', error);
    callback([]);
  });
};

export const subscribeToTeacherPTEChecklistProgress = (
  teacherId: string,
  callback: (progressList: PTEChecklistProgress[]) => void
): Unsubscribe => {
  // Subscribe to PTE checklist changes and filter by teacher's students
  const checklistRef = collection(db, COLLECTION_NAME);
  const checklistQuery = query(checklistRef, orderBy('userName'));

  return onSnapshot(checklistQuery, async (checklistSnapshot) => {
    try {
      // Get all students assigned to this teacher
      const usersRef = collection(db, 'users');
      const studentsQuery = query(
        usersRef, 
        where('role', '==', 'student'),
        where('teacherId', '==', teacherId)
      );
      
      const studentsSnapshot = await getDocs(studentsQuery);
      const studentIds = new Set(studentsSnapshot.docs.map(doc => doc.id));
      
      if (studentIds.size === 0) {
        callback([]);
        return;
      }

      // Filter checklist progress for teacher's students
      const progressList: PTEChecklistProgress[] = [];
      
      checklistSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (studentIds.has(data.userId)) {
          progressList.push({
            id: doc.id,
            ...data
          } as PTEChecklistProgress);
        }
      });

      // Sort by userName
      progressList.sort((a, b) => a.userName.localeCompare(b.userName));
      callback(progressList);
    } catch (error) {
      console.error('Error processing teacher PTE checklist progress:', error);
      callback([]);
    }
  }, (error) => {
    console.error('Error subscribing to teacher PTE checklist progress:', error);
    callback([]);
  });
};

export const subscribeToAssistantPTEChecklistProgress = (
  assistantId: string,
  callback: (progressList: PTEChecklistProgress[]) => void
): Unsubscribe => {
  // Subscribe to PTE checklist changes and filter by assistant's students
  const checklistRef = collection(db, COLLECTION_NAME);
  const checklistQuery = query(checklistRef, orderBy('userName'));

  return onSnapshot(checklistQuery, async (checklistSnapshot) => {
    try {
      // Get the assistant's data to see which teachers/classes they support
      const assistantRef = doc(db, 'users', assistantId);
      const assistantDoc = await getDoc(assistantRef);
      
      if (!assistantDoc.exists()) {
        callback([]);
        return;
      }

      const assistantData = assistantDoc.data();
      const supportingTeacherIds = assistantData.supportingTeacherIds || [];
      const assignedClassIds = assistantData.assignedClassIds || [];

      let studentIds: string[] = [];

      // Get students from supporting teachers
      if (supportingTeacherIds.length > 0) {
        const usersRef = collection(db, 'users');
        for (const teacherId of supportingTeacherIds) {
          const studentsQuery = query(
            usersRef,
            where('role', '==', 'student'),
            where('teacherId', '==', teacherId)
          );
          const studentsSnapshot = await getDocs(studentsQuery);
          studentIds.push(...studentsSnapshot.docs.map(doc => doc.id));
        }
      }

      // Get students from assigned classes
      if (assignedClassIds.length > 0) {
        const classesRef = collection(db, 'classes');
        for (const classId of assignedClassIds) {
          const classDoc = await getDoc(doc(classesRef, classId));
          if (classDoc.exists()) {
            const classData = classDoc.data();
            const classStudents = classData.students || [];
            studentIds.push(...classStudents.map((student: any) => student.id));
          }
        }
      }

      // Remove duplicates
      const studentIdsSet = new Set(studentIds);

      if (studentIdsSet.size === 0) {
        callback([]);
        return;
      }

      // Filter checklist progress for assistant's students
      const progressList: PTEChecklistProgress[] = [];
      
      checklistSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (studentIdsSet.has(data.userId)) {
          progressList.push({
            id: doc.id,
            ...data
          } as PTEChecklistProgress);
        }
      });

      // Sort by userName
      progressList.sort((a, b) => a.userName.localeCompare(b.userName));
      callback(progressList);
    } catch (error) {
      console.error('Error processing assistant PTE checklist progress:', error);
      callback([]);
    }
  }, (error) => {
    console.error('Error subscribing to assistant PTE checklist progress:', error);
    callback([]);
  });
};

export const getPTEChecklistStats = async (): Promise<{
  totalStudents: number;
  completedItems: number;
  approvedItems: number;
  averageCompletion: number;
  averageApproval: number;
}> => {
  try {
    const allProgress = await getAllPTEChecklistProgress();
    
    if (allProgress.length === 0) {
      return {
        totalStudents: 0,
        completedItems: 0,
        approvedItems: 0,
        averageCompletion: 0,
        averageApproval: 0
      };
    }

    let totalCompleted = 0;
    let totalApproved = 0;
    const totalPossibleItems = allProgress.length * PTE_CHECKLIST_ITEMS.length;

    allProgress.forEach(progress => {
      Object.values(progress.items).forEach(item => {
        if (item.studentCompleted) totalCompleted++;
        if (item.teacherApproved) totalApproved++;
      });
    });

    return {
      totalStudents: allProgress.length,
      completedItems: totalCompleted,
      approvedItems: totalApproved,
      averageCompletion: totalPossibleItems > 0 ? (totalCompleted / totalPossibleItems) * 100 : 0,
      averageApproval: totalPossibleItems > 0 ? (totalApproved / totalPossibleItems) * 100 : 0
    };
  } catch (error) {
    console.error('Error getting PTE checklist stats:', error);
    return {
      totalStudents: 0,
      completedItems: 0,
      approvedItems: 0,
      averageCompletion: 0,
      averageApproval: 0
    };
  }
};
