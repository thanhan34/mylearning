import { db } from "../config";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { ExamTrackingInfo, ExamTrackingFormData, ExamTrackingWithCalendar } from "@/types/exam-tracking";
import { createCalendarEventAPI, updateCalendarEventAPI, deleteCalendarEventAPI } from "./calendar-api";
import { CalendarEventData } from "./calendar";
import { UserProfile, ClassInfo } from "@/types/profile";
import { Class } from "./types";

const COLLECTION_NAME = "examTracking";

const getTeacherName = async (teacherId: string): Promise<string | undefined> => {
  try {
    const teacherDoc = doc(db, 'users', teacherId);
    const teacherSnapshot = await getDoc(teacherDoc);
    
    if (teacherSnapshot.exists()) {
      const teacherData = teacherSnapshot.data() as UserProfile;
      console.log('Teacher data found:', teacherData);
      return teacherData.name;
    }
    console.log('No teacher found for ID:', teacherId);
    return undefined;
  } catch (error) {
    console.error('Error getting teacher:', error);
    return undefined;
  }
};

export const createExamTrackingInfo = async (
  data: ExamTrackingFormData,
  studentId: string
): Promise<string> => {
  try {
    // Get user data
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', studentId));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userData = userSnapshot.docs[0].data() as UserProfile;
    console.log('User data found:', userData);
    
    let className: string | undefined;
    let teacherName: string | undefined;

    // Get class info if user has classId
    if (userData.classId) {
      try {
        const classDoc = doc(db, 'classes', userData.classId);
        const classSnapshot = await getDoc(classDoc);
        
        if (classSnapshot.exists()) {
          const classData = classSnapshot.data() as Class;
          className = classData.name;
          teacherName = await getTeacherName(classData.teacherId);
          console.log('Class info found:', { className, teacherName });
        } else {
          console.log('No class found for ID:', userData.classId);
        }
      } catch (error) {
        console.error('Error fetching class:', error);
      }
    } else {
      console.log('No classId for user:', userData);
    }

    // Prepare exam tracking info without calendar event ID first
    const examTrackingInfo: Omit<ExamTrackingWithCalendar, 'calendarEventId'> = {
      ...data,
      studentId: userData.email,
      name: userData.name,
      email: userData.email,
      target: userData.target,
      className: className || "",
      teacherName: teacherName || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      _createdBy: userData.email,
      _updatedBy: userData.email,
    };

    // Save to Firestore first
    const docRef = await addDoc(
      collection(db, COLLECTION_NAME),
      examTrackingInfo
    );

    // Then create calendar event
    try {
      const calendarData: CalendarEventData = {
        name: userData.name,
        examLocation: data.examLocation,
        examDate: data.examDate,
        target: userData.target,
        className: className,
        teacherName: teacherName,
      };
      
      console.log('Attempting to create calendar event with data:', calendarData);
      const eventId = await createCalendarEventAPI(calendarData);
      
      if (eventId) {
        // Update the document with the calendar event ID
        await updateDoc(docRef, {
          calendarEventId: eventId
        });
        console.log('Calendar event ID saved:', eventId);
      }
    } catch (error) {
      console.error('Error creating calendar event:', error);
      // Continue even if calendar fails - document is already saved
    }

    return docRef.id;
  } catch (error) {
    console.error("Error creating exam tracking info:", error);
    throw error;
  }
};

export const updateExamTrackingInfo = async (
  id: string,
  data: ExamTrackingFormData
): Promise<void> => {
  try {
    // Get current exam tracking info
    const docRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Exam tracking info not found');
    }

    const currentData = docSnap.data() as ExamTrackingInfo;
    
    // Get user data to get classId
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', currentData.email));
    const userSnapshot = await getDocs(userQuery);
    
    if (userSnapshot.empty) {
      throw new Error('User not found');
    }

    const userData = userSnapshot.docs[0].data() as UserProfile;
    console.log('User data found for update:', userData);
    
    let className: string | undefined;
    let teacherName: string | undefined;

    // Get class info if user has classId
    if (userData.classId) {
      try {
        const classDoc = doc(db, 'classes', userData.classId);
        const classSnapshot = await getDoc(classDoc);
        
        if (classSnapshot.exists()) {
          const classData = classSnapshot.data() as Class;
          className = classData.name;
          teacherName = await getTeacherName(classData.teacherId);
          console.log('Class info found for update:', { className, teacherName });
        } else {
          console.log('No class found for update with ID:', userData.classId);
        }
      } catch (error) {
        console.error('Error fetching class:', error);
      }
    }

    // Update calendar event if it exists
    if (currentData.calendarEventId) {
      const calendarData: CalendarEventData = {
        name: userData.name,
        examLocation: data.examLocation,
        examDate: data.examDate,
        target: userData.target,
        className: className || currentData.className,
        teacherName: teacherName || currentData.teacherName,
      };
      try {
        await updateCalendarEventAPI(currentData.calendarEventId, calendarData);
        console.log('Calendar event updated successfully');
      } catch (error) {
        console.error('Error updating calendar event:', error);
        // Continue with exam tracking info update even if calendar fails
      }
    }

    const updateData = {
      ...currentData,
      examLocation: data.examLocation,
      examDate: data.examDate,
      className: className || currentData.className || "",
      teacherName: teacherName || currentData.teacherName || "",
      updatedAt: new Date().toISOString(),
      _updatedBy: currentData.email,
    };

    console.log('Updating exam tracking info:', updateData);

    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating exam tracking info:", error);
    throw error;
  }
};

export const getStudentExamInfo = async (
  email: string
): Promise<ExamTrackingInfo | null> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("email", "==", email),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;

    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as ExamTrackingInfo;
  } catch (error) {
    console.error("Error getting student exam info:", error);
    throw error;
  }
};

export const getExamInfoByDate = async (
  startDate: string,
  endDate: string
): Promise<ExamTrackingInfo[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("examDate", ">=", startDate),
      where("examDate", "<=", endDate),
      orderBy("examDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as ExamTrackingInfo)
    );
  } catch (error) {
    console.error("Error getting exam info by date:", error);
    throw error;
  }
};

export const getAllExamInfo = async (): Promise<ExamTrackingInfo[]> => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy("examDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const examInfo = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as ExamTrackingInfo)
    );
   
    return examInfo;
  } catch (error) {
    console.error("Error getting all exam info:", error);
    throw error;
  }
};

export const deletePastExamRecords = async (): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, COLLECTION_NAME),
      where("examDate", "<", today.toISOString())
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    // Delete calendar events first
    for (const doc of querySnapshot.docs) {
      const examData = doc.data() as ExamTrackingInfo;
      if (examData.calendarEventId) {
        try {
          await deleteCalendarEventAPI(examData.calendarEventId);
          console.log('Calendar event deleted successfully');
        } catch (error) {
          console.error('Error deleting calendar event:', error);
          // Continue with exam tracking deletion even if calendar fails
        }
      }
      batch.delete(doc.ref);
    }

    await batch.commit();
    console.log(`Deleted ${querySnapshot.size} past exam records`);
  } catch (error) {
    console.error("Error deleting past exam records:", error);
    throw error;
  }
};

export const getTeacherStudentsExamInfo = async (
  teacherName: string
): Promise<ExamTrackingInfo[]> => {
  try {
    console.log('Getting exam info for teacher:', teacherName);
    const q = query(
      collection(db, COLLECTION_NAME),
      where("teacherName", "==", teacherName),
      orderBy("examDate", "asc")
    );

    const querySnapshot = await getDocs(q);
    const examInfo = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as ExamTrackingInfo)
    );
    console.log('Teacher students exam info:', examInfo);
    return examInfo;
  } catch (error) {
    console.error("Error getting teacher students exam info:", error);
    throw error;
  }
};
