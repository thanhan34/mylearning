import { 
  collection,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "../config";
import { Mocktest, MocktestFormData, FeedbackFormData } from "../../../types/mocktest";
import { sendMocktestNotification, sendMocktestFeedbackNotification } from "./discord";

const COLLECTION = "mocktests";

export const getMocktestsByStudent = async (studentId: string, classId?: string) => {
  if (!classId) {
    console.error("classId is required for getMocktestsByStudent");
    return [];
  }

  console.log("Getting mocktests for student:", {
    studentId,
    classId,
    collection: COLLECTION,
    query: `where studentId == "${studentId}" AND classId == "${classId}"`
  });

  // Create a composite query for both studentId and classId
  const q = query(
    collection(db, COLLECTION),
    where("classId", "==", classId),
    where("studentId", "==", studentId),
    orderBy("submittedAt", "desc")
  );
  
  const querySnapshot = await getDocs(q);
  const mocktests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Mocktest[];
  
  console.log("Found mocktests for student:", {
    studentId,
    count: mocktests.length,
    mocktests: mocktests.map(m => ({
      id: m.id,
      submittedAt: m.submittedAt.toDate(),
      hasMultiple: mocktests.length > 1
    }))
  });
  
  return mocktests;
};

export const getMocktestsByClass = async (classId: string) => {
 
  // First get all mocktests for this class
  const q = query(
    collection(db, COLLECTION),
    where("classId", "==", classId),
    orderBy("submittedAt", "desc")
  );

  
  
  const querySnapshot = await getDocs(q);
  const mocktests = querySnapshot.docs.map(doc => {
    const data = doc.data();
    
    return {
      id: doc.id,
      ...data
    };
  }) as Mocktest[];

  
  
  // Group by student to check counts
  const studentCounts = mocktests.reduce((acc, mocktest) => {
    acc[mocktest.studentId] = (acc[mocktest.studentId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  
  
  return mocktests;
};

export const addMocktest = async (
  studentId: string,
  classId: string,
  data: MocktestFormData,
  studentName?: string,
  className?: string
) => {
  console.log("Adding mocktest:", { studentId, classId, data });
  const mocktest = {
    studentId,
    classId,
    link: data.link,
    submittedAt: Timestamp.fromDate(data.submittedAt),
  };

  const docRef = await addDoc(collection(db, COLLECTION), mocktest);
  console.log("Added mocktest with ID:", docRef.id);
  
  // Send Discord notification for mocktest submission
  if (studentName && className) {
    try {
      await sendMocktestNotification(
        studentName,
        className,
        data.submittedAt.toLocaleDateString('vi-VN'),
        data.link
      );
    } catch (discordError) {
      console.error('Error sending Discord notification for mocktest:', discordError);
      // Don't fail the submission if Discord fails
    }
  }
  
  return {
    id: docRef.id,
    ...mocktest
  } as Mocktest;
};

export const updateMocktest = async (
  mocktestId: string,
  data: Partial<MocktestFormData>
) => {
  const docRef = doc(db, COLLECTION, mocktestId);
  const updateData: Partial<Mocktest> = {};
  
  if (data.link) updateData.link = data.link;
  if (data.submittedAt) updateData.submittedAt = Timestamp.fromDate(data.submittedAt);

  await updateDoc(docRef, updateData);
  const updatedDoc = await getDoc(docRef);
  
  return {
    id: updatedDoc.id,
    ...updatedDoc.data()
  } as Mocktest;
};

export const addFeedback = async (
  mocktestId: string,
  teacherId: string,
  data: FeedbackFormData,
  teacherName?: string,
  studentName?: string,
  className?: string
) => {
  const docRef = doc(db, COLLECTION, mocktestId);
  await updateDoc(docRef, {
    feedback: data.feedback,
    teacherId
  });

  // Send Discord notification for mocktest feedback
  if (teacherName && studentName && className) {
    try {
      await sendMocktestFeedbackNotification(
        teacherName,
        studentName,
        className
      );
    } catch (discordError) {
      console.error('Error sending Discord notification for mocktest feedback:', discordError);
      // Don't fail the feedback if Discord fails
    }
  }

  const updatedDoc = await getDoc(docRef);
  return {
    id: updatedDoc.id,
    ...updatedDoc.data()
  } as Mocktest;
};

export const deleteMocktest = async (mocktestId: string) => {
  const docRef = doc(db, COLLECTION, mocktestId);
  await deleteDoc(docRef);
};
