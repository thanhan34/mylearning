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
  console.log("Getting mocktests for class:", {
    queryClassId: classId,
    collection: COLLECTION,
    query: `where("classId", "==", "${classId}")`
  });
  // First get all mocktests for this class
  const q = query(
    collection(db, COLLECTION),
    where("classId", "==", classId),
    orderBy("submittedAt", "desc")
  );

  console.log("Querying mocktests with:", {
    collection: COLLECTION,
    classId,
    query: "where classId == classId orderBy submittedAt desc"
  });
  
  const querySnapshot = await getDocs(q);
  const mocktests = querySnapshot.docs.map(doc => {
    const data = doc.data();
    console.log(`Mocktest ${doc.id} data:`, {
      ...data,
      classIdMatch: data.classId === classId,
      classIdInDoc: data.classId,
      expectedClassId: classId
    });
    return {
      id: doc.id,
      ...data
    };
  }) as Mocktest[];

  console.log("Found mocktests for class:", {
    classId,
    count: mocktests.length,
    mocktests: mocktests.map(m => ({
      id: m.id,
      studentId: m.studentId,
      submittedAt: m.submittedAt.toDate()
    }))
  });
  
  // Group by student to check counts
  const studentCounts = mocktests.reduce((acc, mocktest) => {
    acc[mocktest.studentId] = (acc[mocktest.studentId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log("Student mocktest counts:", studentCounts);
  
  return mocktests;
};

export const addMocktest = async (
  studentId: string,
  classId: string,
  data: MocktestFormData
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
  data: FeedbackFormData
) => {
  const docRef = doc(db, COLLECTION, mocktestId);
  await updateDoc(docRef, {
    feedback: data.feedback,
    teacherId
  });

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
