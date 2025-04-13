'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  Timestamp, 
  onSnapshot,
  getDocs
} from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { addNotification } from '@/app/firebase/services/notification';
import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';
import { HomeworkSubmission } from '@/app/firebase/services/types';

// Import sub-components
import FilterBar from './feedback/FilterBar';
import StatsOverview from './feedback/StatsOverview';
import TeacherStatsTable from './feedback/TeacherStatsTable';
import ClassStatsTable from './feedback/ClassStatsTable';
import RecentSubmissionsTable from './feedback/RecentSubmissionsTable';

interface HomeworkData {
  id: string;
  userId: string;
  userName: string;
  date: string;
  submissions: HomeworkSubmission[];
  timestamp: Timestamp;
}

interface FeedbackStats {
  totalSubmissions: number;
  submissionsWithFeedback: number;
  submissionsWithoutFeedback: number;
  feedbackPercentage: number;
  teacherStats: {
    [teacherId: string]: {
      teacherName: string;
      totalSubmissions: number;
      providedFeedback: number;
      pendingFeedback: number;
      feedbackPercentage: number;
      lastFeedbackDate: Date | null;
    }
  };
  classStats: {
    [classId: string]: {
      className: string;
      totalSubmissions: number;
      submissionsWithFeedback: number;
      feedbackPercentage: number;
    }
  };
  recentSubmissions: Array<HomeworkData & { 
    studentName: string, 
    className: string, 
    teacherName: string,
    feedbackCount: number,
    totalCount: number
  }>;
  teacherSubmissions: {
    [teacherId: string]: Array<HomeworkData & { 
      studentName: string, 
      className: string, 
      teacherName: string,
      feedbackCount: number,
      totalCount: number
    }>;
  };
}

/**
 * HomeworkFeedbackMonitoring Component
 * 
 * This component displays statistics about homework feedback provided by teachers.
 * 
 * Logic for counting homework submissions:
 * 
 * 1. Each homework document in Firestore represents a daily homework submission by a student
 * 2. Each homework document contains an array of individual submissions (exercises/tasks)
 * 
 * Counting method:
 * - We count each individual submission within the homework document
 * - Only count submissions from the selected time period
 * - Apply additional filtering based on teacher and class selections
 * 
 * For feedback tracking:
 * - A submission is considered to have feedback if it has non-empty feedback text
 * - We track which teachers are providing feedback and which ones need reminders
 */
export default function HomeworkFeedbackMonitoring() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [homeworkData, setHomeworkData] = useState<HomeworkData[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    totalSubmissions: 0,
    submissionsWithFeedback: 0,
    submissionsWithoutFeedback: 0,
    feedbackPercentage: 0,
    teacherStats: {},
    classStats: {},
    recentSubmissions: [],
    teacherSubmissions: {}
  });
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Fetch static data (classes and teachers)
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        // Fetch classes with real-time updates
        const classesQuery = collection(db, 'classes');
        const unsubscribeClasses = onSnapshot(classesQuery, (snapshot) => {
          const classesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Class[];
          setClasses(classesData);
        });

        // Fetch teachers with real-time updates
        const teachersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'teacher')
        );
        const unsubscribeTeachers = onSnapshot(teachersQuery, (snapshot) => {
          const teachersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as User[];
          setTeachers(teachersData);
        });

        return () => {
          unsubscribeClasses();
          unsubscribeTeachers();
        };
      } catch (error) {
        console.error('Error fetching static data:', error);
      }
    };

    fetchStaticData();
  }, []);

  // Set up real-time listener for homework data based on timeframe
  useEffect(() => {
    setLoading(true);

    // Calculate date threshold based on selected timeframe
    const days = parseInt(selectedTimeframe);
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const dateString = dateThreshold.toISOString().split('T')[0];

    // Build query for homework submissions
    const homeworkQuery = query(
      collection(db, 'homework'),
      where('date', '>=', dateString),
      orderBy('date', 'desc')
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(homeworkQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HomeworkData[];
      
      setHomeworkData(data);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching homework data:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedTimeframe]);

  // Calculate stats whenever homework data, classes, teachers, or filters change
  useEffect(() => {
    if (homeworkData.length > 0 && classes.length > 0 && teachers.length > 0) {
      calculateStats();
    }
  }, [homeworkData, classes, teachers, selectedTeacher, selectedClass]);

  const calculateStats = () => {
    try {
      // Create a map of teacher IDs to names for quick lookup
      const teacherMap = teachers.reduce((acc, teacher) => {
        acc[teacher.id] = teacher.name || teacher.email || 'Unknown Teacher';
        return acc;
      }, {} as { [key: string]: string });

      // Create a map of class IDs to names for quick lookup
      const classMap = classes.reduce((acc, classData) => {
        acc[classData.id] = classData.name || `Class ${classData.id}`;
        return acc;
      }, {} as { [key: string]: string });

      // Create a map of student IDs to names and class IDs for quick lookup
      const studentMap: { [key: string]: { name: string, classId: string } } = {};
      classes.forEach(classData => {
        (classData.students || []).forEach(student => {
          studentMap[student.id] = {
            name: student.name || student.email || 'Unknown Student',
            classId: classData.id
          };
        });
      });

      // Filter homework data based on selected filters
      let filteredHomeworkData = [...homeworkData];

      // Apply class filter if selected
      if (selectedClass !== 'all') {
        filteredHomeworkData = filteredHomeworkData.filter(homework => {
          const studentClassId = studentMap[homework.userId]?.classId;
          return studentClassId === selectedClass;
        });
      }

      // Apply teacher filter if selected
      if (selectedTeacher !== 'all') {
        // First get all classes taught by this teacher
        const teacherClasses = classes.filter(c => c.teacherId === selectedTeacher).map(c => c.id);
        filteredHomeworkData = filteredHomeworkData.filter(homework => {
          const studentClassId = studentMap[homework.userId]?.classId;
          return studentClassId ? teacherClasses.includes(studentClassId) : false;
        });
      }

      // Initialize stats
      let totalSubmissions = 0;
      let submissionsWithFeedback = 0;

      // Initialize teacher stats
      const teacherStats: FeedbackStats['teacherStats'] = {};
      
      // Initialize class stats
      const classStats: FeedbackStats['classStats'] = {};

      // Initialize teacher submissions
      const teacherSubmissions: FeedbackStats['teacherSubmissions'] = {};

      // Process homework data to build stats
      filteredHomeworkData.forEach(homework => {
        const studentInfo = studentMap[homework.userId];
        if (!studentInfo) return;

        const classId = studentInfo.classId;
        const classData = classes.find(c => c.id === classId);
        if (!classData) return;

        const teacherId = classData.teacherId;
        const className = classMap[classId] || `Class ${classId}`;
        const teacherName = teacherMap[teacherId] || `Teacher ${teacherId}`;

        // Count all submissions
        const submissionCount = (homework.submissions || []).length;
        
        // Only count submissions with non-empty feedback
        const feedbackCount = (homework.submissions || []).filter(
          submission => submission.feedback && submission.feedback.trim() !== ''
        ).length;
        
        // Update total counts
        totalSubmissions += submissionCount;
        submissionsWithFeedback += feedbackCount;

        // Update class stats
        if (!classStats[classId]) {
          classStats[classId] = {
            className,
            totalSubmissions: 0,
            submissionsWithFeedback: 0,
            feedbackPercentage: 0
          };
        }
        classStats[classId].totalSubmissions += submissionCount;
        classStats[classId].submissionsWithFeedback += feedbackCount;

        // Update teacher stats
        if (teacherId) {
          if (!teacherStats[teacherId]) {
            teacherStats[teacherId] = {
              teacherName: teacherMap[teacherId] || `Teacher ${teacherId}`,
              totalSubmissions: 0,
              providedFeedback: 0,
              pendingFeedback: 0,
              feedbackPercentage: 0,
              lastFeedbackDate: null
            };
          }
          
          teacherStats[teacherId].totalSubmissions += submissionCount;
          teacherStats[teacherId].providedFeedback += feedbackCount;
          teacherStats[teacherId].pendingFeedback += (submissionCount - feedbackCount);
          
          // Update last feedback date if newer and has feedback
          if (feedbackCount > 0) {
            const feedbackDate = homework.timestamp.toDate();
            if (!teacherStats[teacherId].lastFeedbackDate || 
                feedbackDate > teacherStats[teacherId].lastFeedbackDate) {
              teacherStats[teacherId].lastFeedbackDate = feedbackDate;
            }
          }

          // Add to teacher submissions for detailed view
          if (!teacherSubmissions[teacherId]) {
            teacherSubmissions[teacherId] = [];
          }

          teacherSubmissions[teacherId].push({
            ...homework,
            studentName: studentInfo.name,
            className,
            teacherName,
            feedbackCount,
            totalCount: submissionCount
          });
        }
      });

      // Calculate percentages for classes
      Object.keys(classStats).forEach(classId => {
        const classStat = classStats[classId];
        classStat.feedbackPercentage = classStat.totalSubmissions > 0 
          ? Math.round((classStat.submissionsWithFeedback / classStat.totalSubmissions) * 100) 
          : 0;
      });

      // Calculate percentages for teachers
      Object.keys(teacherStats).forEach(teacherId => {
        const teacher = teacherStats[teacherId];
        teacher.feedbackPercentage = teacher.totalSubmissions > 0 
          ? Math.round((teacher.providedFeedback / teacher.totalSubmissions) * 100) 
          : 0;
      });

      // Get recent submissions with student and class info
      const recentSubmissions = filteredHomeworkData.slice(0, 10).map(homework => {
        const studentInfo = studentMap[homework.userId];
        const classId = studentInfo?.classId;
        const classData = classes.find(c => c.id === classId);
        const teacherId = classData?.teacherId;
        
        const submissionCount = (homework.submissions || []).length;
        const feedbackCount = (homework.submissions || []).filter(
          submission => submission.feedback && submission.feedback.trim() !== ''
        ).length;

        return {
          ...homework,
          studentName: studentInfo?.name || 'Unknown Student',
          className: classMap[classId || ''] || 'Unknown Class',
          teacherName: teacherMap[teacherId || ''] || 'Unknown Teacher',
          feedbackCount,
          totalCount: submissionCount
        };
      });

      // Calculate overall stats
      const submissionsWithoutFeedback = totalSubmissions - submissionsWithFeedback;
      const feedbackPercentage = totalSubmissions > 0 
        ? Math.round((submissionsWithFeedback / totalSubmissions) * 100) 
        : 0;

      // Update stats
      setStats({
        totalSubmissions,
        submissionsWithFeedback,
        submissionsWithoutFeedback,
        feedbackPercentage,
        teacherStats,
        classStats,
        recentSubmissions,
        teacherSubmissions
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    }
  };

  // Send reminder to teacher
  const sendReminder = async (teacherId: string, teacherEmail: string) => {
    setSendingReminder(teacherId);
    try {
      const pendingCount = stats.teacherStats[teacherId]?.pendingFeedback || 0;
      const message = `Bạn có ${pendingCount} bài tập hàng ngày đang chờ feedback. Vui lòng kiểm tra và cung cấp feedback cho học viên.`;
      
      const success = await addNotification(
        teacherEmail,
        message,
        'teacher'
      );
      
      if (success) {
        alert(`Đã gửi nhắc nhở đến giảng viên ${stats.teacherStats[teacherId]?.teacherName}`);
      } else {
        alert('Không thể gửi nhắc nhở. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      alert('Đã xảy ra lỗi khi gửi nhắc nhở.');
    } finally {
      setSendingReminder(null);
    }
  };

  // Sort teachers by pending feedback count (descending)
  const sortedTeachers = useMemo(() => {
    return Object.entries(stats.teacherStats)
      .sort(([, a], [, b]) => b.pendingFeedback - a.pendingFeedback)
      .map(([id, data]) => ({ id, ...data }));
  }, [stats.teacherStats]);

  // Sort classes by feedback percentage (ascending)
  const sortedClasses = useMemo(() => {
    return Object.entries(stats.classStats)
      .sort(([, a], [, b]) => a.feedbackPercentage - b.feedbackPercentage)
      .map(([id, data]) => ({ id, ...data }));
  }, [stats.classStats]);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Chưa có';
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <StatsOverview 
        totalSubmissions={stats.totalSubmissions}
        submissionsWithFeedback={stats.submissionsWithFeedback}
        submissionsWithoutFeedback={stats.submissionsWithoutFeedback}
        feedbackPercentage={stats.feedbackPercentage}
      />

      <TeacherStatsTable 
        teachers={teachers}
        teacherStats={sortedTeachers}
        sendingReminder={sendingReminder}
        onSendReminder={sendReminder}
        formatDate={formatDate}
        teacherSubmissions={stats.teacherSubmissions}
      />

      <ClassStatsTable 
        classStats={sortedClasses}
      />

      <RecentSubmissionsTable 
        submissions={stats.recentSubmissions}
        formatDate={formatDate}
      />
    </div>
  );
}
