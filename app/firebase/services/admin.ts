import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config';

export interface AdminStats {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  submissionCount: number;
  classProgress: Array<{
    name: string;
    completionRate: number;
  }>;
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    // Get users collection
    const usersRef = collection(db, 'users');
    
    // Query for students
    const studentsQuery = query(usersRef, where('role', '==', 'student'));
    const studentsSnapshot = await getDocs(studentsQuery);
    
    // Query for teachers
    const teachersQuery = query(usersRef, where('role', '==', 'teacher'));
    const teachersSnapshot = await getDocs(teachersQuery);
    
    // Get classes collection
    const classesRef = collection(db, 'classes');
    const classesSnapshot = await getDocs(classesRef);
    
    // Get homework collection
    const homeworkRef = collection(db, 'homework');
    const homeworkSnapshot = await getDocs(homeworkRef);

    // Calculate class progress
    const classProgress = await Promise.all(
      classesSnapshot.docs.map(async (classDoc) => {
        const classData = classDoc.data();
        const students = classData.students || [];
        
        // Get homework submissions for each student in the class
        let totalSubmissions = 0;
        let totalRequired = students.length * 5; // Assuming 5 homework assignments per student

        for (const student of students) {
          const studentHomeworkQuery = query(
            homeworkRef,
            where('userId', '==', student.id)
          );
          const studentHomeworkSnapshot = await getDocs(studentHomeworkQuery);
          totalSubmissions += studentHomeworkSnapshot.size;
        }

        // Calculate completion rate
        const completionRate = totalRequired > 0 
          ? Math.round((totalSubmissions / totalRequired) * 100)
          : 0;

        return {
          name: classData.name || `Class ${classDoc.id}`,
          completionRate
        };
      })
    );
    
    return {
      studentCount: studentsSnapshot.size,
      teacherCount: teachersSnapshot.size,
      classCount: classesSnapshot.size,
      submissionCount: homeworkSnapshot.size,
      classProgress
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      studentCount: 0,
      teacherCount: 0,
      classCount: 0,
      submissionCount: 0,
      classProgress: []
    };
  }
};
