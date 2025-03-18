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

// Cache for admin stats to prevent frequent refetching
let statsCache: {
  data: AdminStats | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0
};

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

export const getAdminStats = async (): Promise<AdminStats> => {
  // Check if we have cached data that's not expired
  const now = Date.now();
  if (statsCache.data && (now - statsCache.timestamp) < CACHE_EXPIRATION) {
    console.log('Using cached admin stats');
    return statsCache.data;
  }

  try {
    console.log('Fetching fresh admin stats');
    // Get users collection
    const usersRef = collection(db, 'users');
    
    // Get classes collection
    const classesRef = collection(db, 'classes');
    
    // Get homework collection
    const homeworkRef = collection(db, 'homework');
    
    // Run queries in parallel for better performance
    const [studentsSnapshot, teachersSnapshot, classesSnapshot, homeworkSnapshot] = await Promise.all([
      getDocs(query(usersRef, where('role', '==', 'student'))),
      getDocs(query(usersRef, where('role', '==', 'teacher'))),
      getDocs(classesRef),
      getDocs(homeworkRef)
    ]);

    // Prepare a map of user IDs to their homework submissions count for faster lookup
    const userSubmissionsMap = new Map();
    homeworkSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      if (userId) {
        userSubmissionsMap.set(userId, (userSubmissionsMap.get(userId) || 0) + 1);
      }
    });

    // Calculate class progress more efficiently
    const classProgress = classesSnapshot.docs.map((classDoc) => {
      const classData = classDoc.data();
      const students = classData.students || [];
      
      // Calculate submissions using the map instead of additional queries
      let totalSubmissions = 0;
      let totalRequired = students.length * 5; // Assuming 5 homework assignments per student

      students.forEach((student: { id: string }) => {
        totalSubmissions += userSubmissionsMap.get(student.id) || 0;
      });

      // Calculate completion rate
      const completionRate = totalRequired > 0 
        ? Math.round((totalSubmissions / totalRequired) * 100)
        : 0;

      return {
        name: classData.name || `Class ${classDoc.id}`,
        completionRate
      };
    });
    
    // Create the stats object
    const stats = {
      studentCount: studentsSnapshot.size,
      teacherCount: teachersSnapshot.size,
      classCount: classesSnapshot.size,
      submissionCount: homeworkSnapshot.size,
      classProgress
    };

    // Update the cache
    statsCache = {
      data: stats,
      timestamp: now
    };
    
    return stats;
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
