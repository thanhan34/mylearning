import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, deleteDoc, Timestamp, orderBy, limit, writeBatch } from 'firebase/firestore';
import { db } from '../config';
import { Attendance, AttendanceRecord, AttendanceStats } from '../../../types/attendance';
import { Class, ClassStudent } from './types';
import { getClassById } from './class';

// Helper function to delay execution (for rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to implement exponential backoff
const retryOperation = async (
  operation: () => Promise<any>,
  maxRetries = 5,
  initialDelay = 1000
): Promise<any> => {
  let retries = 0;
  
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      retries++;
      
      // If we've reached max retries or it's not a resource exhausted error, throw
      if (retries >= maxRetries || 
          !(error?.code === 'resource-exhausted' || 
            (error?.name === 'FirebaseError' && error?.message?.includes('resource-exhausted')))) {
        throw error;
      }
      
      // Calculate delay with exponential backoff (1s, 2s, 4s, 8s, etc.)
      const waitTime = initialDelay * Math.pow(2, retries - 1);
      console.log(`Retrying operation after ${waitTime}ms (attempt ${retries})`);
      await delay(waitTime);
    }
  }
};

// Create a new attendance record for a class
export const createAttendance = async (
  classId: string,
  date: string,
  createdBy: string,
  students: AttendanceRecord[]
): Promise<string | null> => {
  try {
    // Validate class exists
    const classData = await getClassById(classId);
    if (!classData) {
      console.error('Class not found:', classId);
      return null;
    }

    // Check if attendance already exists for this date and class
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('classId', '==', classId),
      where('date', '==', date)
    );
    
    const existingAttendance = await retryOperation(() => getDocs(q));
    
    if (!existingAttendance.empty) {
      console.log(`Attendance already exists for class ${classId} on ${date}`);
      return existingAttendance.docs[0].id;
    }
    
    // Create new attendance record
    const now = Timestamp.now();
    const attendanceData: Omit<Attendance, 'id'> = {
      classId,
      date,
      createdAt: now,
      updatedAt: now,
      createdBy,
      students
    };
    
    const docRef = await retryOperation(() => addDoc(attendanceRef, attendanceData));
    
    console.log(`Successfully created attendance record: ${docRef.id} for class ${classId} on ${date}`);
    return docRef.id;
  } catch (error) {
    console.error('Error creating attendance record:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Update an existing attendance record
export const updateAttendance = async (
  attendanceId: string,
  students: AttendanceRecord[]
): Promise<boolean> => {
  try {
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if attendance exists
    const attendanceDoc = await retryOperation(() => getDoc(attendanceRef));
    if (!attendanceDoc.exists()) {
      console.error('Attendance record not found:', attendanceId);
      return false;
    }
    
    // Update attendance
    await retryOperation(() => updateDoc(attendanceRef, {
      students,
      updatedAt: Timestamp.now()
    }));
    
    console.log(`Successfully updated attendance record: ${attendanceId}`);
    return true;
  } catch (error) {
    console.error('Error updating attendance record:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        attendanceId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

// Delete an attendance record
export const deleteAttendance = async (attendanceId: string): Promise<boolean> => {
  try {
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if attendance exists
    const attendanceDoc = await retryOperation(() => getDoc(attendanceRef));
    if (!attendanceDoc.exists()) {
      console.error('Attendance record not found:', attendanceId);
      return false;
    }
    
    // Delete attendance
    await retryOperation(() => deleteDoc(attendanceRef));
    
    console.log(`Successfully deleted attendance record: ${attendanceId}`);
    return true;
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        attendanceId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};

// Get attendance for a specific class on a specific date
export const getAttendanceByClassAndDate = async (
  classId: string,
  date: string
): Promise<Attendance | null> => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('classId', '==', classId),
      where('date', '==', date)
    );
    
    const attendanceSnapshot = await retryOperation(() => getDocs(q));
    
    if (attendanceSnapshot.empty) {
      console.log(`No attendance found for class ${classId} on ${date}`);
      return null;
    }
    
    const attendanceDoc = attendanceSnapshot.docs[0];
    const attendanceData = attendanceDoc.data();
    
    return {
      id: attendanceDoc.id,
      classId: attendanceData.classId,
      date: attendanceData.date,
      createdAt: attendanceData.createdAt,
      updatedAt: attendanceData.updatedAt,
      createdBy: attendanceData.createdBy,
      students: attendanceData.students || []
    } as Attendance;
  } catch (error) {
    console.error('Error getting attendance by class and date:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Get all attendance records for a specific class
export const getAttendanceByClass = async (classId: string): Promise<Attendance[]> => {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('classId', '==', classId),
      orderBy('date', 'desc')
    );
    
    const attendanceSnapshot = await retryOperation(() => getDocs(q));
    
    const attendanceRecords = attendanceSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        classId: data.classId,
        date: data.date,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        createdBy: data.createdBy,
        students: data.students || []
      } as Attendance;
    });
    
    console.log(`Retrieved ${attendanceRecords.length} attendance records for class: ${classId}`);
    return attendanceRecords;
  } catch (error) {
    console.error('Error getting attendance by class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        timestamp: new Date().toISOString()
      });
    }
    return [];
  }
};

// Get attendance statistics for a specific class
export const getAttendanceStatsByClass = async (classId: string): Promise<AttendanceStats | null> => {
  try {
    // Get all attendance records for the class
    const attendanceRecords = await getAttendanceByClass(classId);
    
    if (attendanceRecords.length === 0) {
      console.log(`No attendance records found for class ${classId}`);
      return null;
    }
    
    // Get class data to get student list
    const classData = await getClassById(classId);
    if (!classData) {
      console.error('Class not found:', classId);
      return null;
    }
    
    const totalSessions = attendanceRecords.length;
    const totalStudents = classData.students.length;
    
    // Calculate attendance rates by student
    const studentStats = new Map<string, {
      studentId: string;
      studentName: string;
      presentCount: number;
      lateCount: number;
      absentCount: number;
      excusedCount: number;
      totalSessions: number;
    }>();
    
    // Initialize stats for all students
    classData.students.forEach(student => {
      studentStats.set(student.id, {
        studentId: student.id,
        studentName: student.name,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        excusedCount: 0,
        totalSessions: 0
      });
    });
    
    // Process attendance records
    attendanceRecords.forEach(record => {
      record.students.forEach(studentRecord => {
        const stats = studentStats.get(studentRecord.studentId);
        if (stats) {
          stats.totalSessions++;
          
          switch (studentRecord.status) {
            case 'present':
              stats.presentCount++;
              break;
            case 'late':
              stats.lateCount++;
              break;
            case 'absent':
              stats.absentCount++;
              break;
            case 'excused':
              stats.excusedCount++;
              break;
          }
          
          studentStats.set(studentRecord.studentId, stats);
        }
      });
    });
    
    // Calculate overall attendance rate
    let totalPresent = 0;
    let totalAttendanceRecords = 0;
    
    const byStudent = Array.from(studentStats.values()).map(stats => {
      const attendanceRate = stats.totalSessions > 0
        ? Math.round(((stats.presentCount + stats.lateCount + stats.excusedCount) / stats.totalSessions) * 100)
        : 0;
      
      totalPresent += stats.presentCount + stats.lateCount + stats.excusedCount;
      totalAttendanceRecords += stats.totalSessions;
      
      return {
        studentId: stats.studentId,
        studentName: stats.studentName,
        attendanceRate,
        lateCount: stats.lateCount,
        absentCount: stats.absentCount
      };
    });
    
    const averageAttendance = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;
    
    return {
      totalSessions,
      totalStudents,
      averageAttendance,
      byClass: [{
        classId,
        className: classData.name,
        attendanceRate: averageAttendance
      }],
      byStudent
    };
  } catch (error) {
    console.error('Error getting attendance stats by class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Get attendance statistics for all classes (admin view)
export const getAttendanceStatsForAllClasses = async (): Promise<AttendanceStats | null> => {
  try {
    // Get all classes
    const classesRef = collection(db, 'classes');
    const classesSnapshot = await retryOperation(() => getDocs(classesRef));
    
    if (classesSnapshot.empty) {
      console.log('No classes found');
      return null;
    }
    
    // Process each class
    const classStats = await Promise.all(
      classesSnapshot.docs.map(async (classDoc: any) => {
        const classData = classDoc.data() as Class;
        const stats = await getAttendanceStatsByClass(classDoc.id);
        
        return {
          classId: classDoc.id,
          className: classData.name,
          stats
        };
      })
    );
    
    // Filter out classes with no attendance data
    const validClassStats = classStats.filter(stat => stat.stats !== null);
    
    if (validClassStats.length === 0) {
      console.log('No attendance data found for any class');
      return null;
    }
    
    // Calculate overall statistics
    let totalSessions = 0;
    let totalStudents = 0;
    let totalPresent = 0;
    let totalAttendanceRecords = 0;
    
    const byClass = validClassStats.map(classStat => {
      const stats = classStat.stats!;
      
      totalSessions += stats.totalSessions;
      totalStudents += stats.totalStudents;
      
      // Calculate total present and total records for average
      stats.byStudent.forEach((student: any) => {
        totalPresent += Math.round((student.attendanceRate / 100) * stats.totalSessions);
        totalAttendanceRecords += stats.totalSessions;
      });
      
      return {
        classId: classStat.classId,
        className: classStat.className,
        attendanceRate: stats.averageAttendance
      };
    });
    
    // Combine all student stats
    const allStudentStats = validClassStats.flatMap(classStat => 
      classStat.stats!.byStudent.map((student: any) => ({
        ...student,
        classId: classStat.classId,
        className: classStat.className
      }))
    );
    
    // Deduplicate students (in case a student is in multiple classes)
    const studentMap = new Map();
    allStudentStats.forEach(student => {
      if (!studentMap.has(student.studentId) || 
          studentMap.get(student.studentId).attendanceRate < student.attendanceRate) {
        studentMap.set(student.studentId, student);
      }
    });
    
    const byStudent = Array.from(studentMap.values());
    
    const averageAttendance = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;
    
    return {
      totalSessions,
      totalStudents,
      averageAttendance,
      byClass,
      byStudent
    };
  } catch (error) {
    console.error('Error getting attendance stats for all classes:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Get attendance statistics for a teacher's classes
export const getAttendanceStatsForTeacher = async (teacherId: string): Promise<AttendanceStats | null> => {
  try {
    // Get all classes for this teacher
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, where('teacherId', '==', teacherId));
    
    const classesSnapshot = await retryOperation(() => getDocs(q));
    
    if (classesSnapshot.empty) {
      console.log(`No classes found for teacher ${teacherId}`);
      return null;
    }
    
    // Process each class
    const classStats = await Promise.all(
      classesSnapshot.docs.map(async (classDoc: any) => {
        const classData = classDoc.data() as Class;
        const stats = await getAttendanceStatsByClass(classDoc.id);
        
        return {
          classId: classDoc.id,
          className: classData.name,
          stats
        };
      })
    );
    
    // Filter out classes with no attendance data
    const validClassStats = classStats.filter(stat => stat.stats !== null);
    
    if (validClassStats.length === 0) {
      console.log(`No attendance data found for teacher ${teacherId}`);
      return null;
    }
    
    // Calculate overall statistics
    let totalSessions = 0;
    let totalStudents = 0;
    let totalPresent = 0;
    let totalAttendanceRecords = 0;
    
    const byClass = validClassStats.map(classStat => {
      const stats = classStat.stats!;
      
      totalSessions += stats.totalSessions;
      totalStudents += stats.totalStudents;
      
      // Calculate total present and total records for average
      stats.byStudent.forEach((student: any) => {
        totalPresent += Math.round((student.attendanceRate / 100) * stats.totalSessions);
        totalAttendanceRecords += stats.totalSessions;
      });
      
      return {
        classId: classStat.classId,
        className: classStat.className,
        attendanceRate: stats.averageAttendance
      };
    });
    
    // Combine all student stats
    const byStudent = validClassStats.flatMap(classStat => 
      classStat.stats!.byStudent
    );
    
    const averageAttendance = totalAttendanceRecords > 0
      ? Math.round((totalPresent / totalAttendanceRecords) * 100)
      : 0;
    
    return {
      totalSessions,
      totalStudents,
      averageAttendance,
      byClass,
      byStudent
    };
  } catch (error) {
    console.error('Error getting attendance stats for teacher:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        teacherId,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Create attendance records for all students in a class with default status
export const createDefaultAttendanceForClass = async (
  classId: string,
  date: string,
  createdBy: string,
  defaultStatus: 'present' | 'absent' | 'late' | 'excused' = 'present'
): Promise<string | null> => {
  try {
    // Get class data to get student list
    const classData = await getClassById(classId);
    if (!classData) {
      console.error('Class not found:', classId);
      return null;
    }
    
    // Create attendance records for all students
    const students: AttendanceRecord[] = classData.students.map(student => ({
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      status: defaultStatus
    }));
    
    // Create attendance record
    return await createAttendance(classId, date, createdBy, students);
  } catch (error) {
    console.error('Error creating default attendance for class:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        classId,
        date,
        timestamp: new Date().toISOString()
      });
    }
    return null;
  }
};

// Bulk update attendance status for multiple students
export const bulkUpdateAttendanceStatus = async (
  attendanceId: string,
  studentUpdates: { studentId: string; status: 'present' | 'absent' | 'late' | 'excused'; notes?: string }[]
): Promise<boolean> => {
  try {
    const attendanceRef = doc(db, 'attendance', attendanceId);
    
    // Check if attendance exists
    const attendanceDoc = await retryOperation(() => getDoc(attendanceRef));
    if (!attendanceDoc.exists()) {
      console.error('Attendance record not found:', attendanceId);
      return false;
    }
    
    const attendanceData = attendanceDoc.data();
    const students = [...(attendanceData.students || [])];
    
    // Update each student's status
    studentUpdates.forEach(update => {
      const studentIndex = students.findIndex(s => s.studentId === update.studentId);
      if (studentIndex >= 0) {
        // Create a new object with only defined values
        const updatedStudent = {
          ...students[studentIndex],
          status: update.status
        };
        
        // Only add notes if it's defined
        if (update.notes !== undefined) {
          updatedStudent.notes = update.notes;
        } else if (students[studentIndex].notes) {
          updatedStudent.notes = students[studentIndex].notes;
        }
        
        students[studentIndex] = updatedStudent;
      }
    });
    
    // Update attendance
    await retryOperation(() => updateDoc(attendanceRef, {
      students,
      updatedAt: Timestamp.now()
    }));
    
    console.log(`Successfully updated ${studentUpdates.length} student attendance records for ${attendanceId}`);
    return true;
  } catch (error) {
    console.error('Error bulk updating attendance status:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        attendanceId,
        timestamp: new Date().toISOString()
      });
    }
    return false;
  }
};
