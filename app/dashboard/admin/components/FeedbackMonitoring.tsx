'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { addNotification } from '@/app/firebase/services/notification';
import { Class } from '@/app/firebase/services/types';
import { Mocktest } from '@/types/mocktest';
import { User } from '@/app/firebase/services/user';

// Import sub-components
import MocktestFilterBar from './feedback/MocktestFilterBar';
import MocktestStatsOverview from './feedback/MocktestStatsOverview';
import MocktestTeacherStatsTable from './feedback/MocktestTeacherStatsTable';
import MocktestClassStatsTable from './feedback/MocktestClassStatsTable';
import MocktestRecentTable from './feedback/MocktestRecentTable';

interface FeedbackStats {
  totalMocktests: number;
  mocktestsWithFeedback: number;
  mocktestsWithoutFeedback: number;
  feedbackPercentage: number;
  teacherStats: {
    [teacherId: string]: {
      teacherName: string;
      totalMocktests: number;
      providedFeedback: number;
      pendingFeedback: number;
      feedbackPercentage: number;
      lastFeedbackDate: Date | null;
    }
  };
  classMocktests: {
    [classId: string]: {
      className: string;
      totalMocktests: number;
      mocktestsWithFeedback: number;
      feedbackPercentage: number;
    }
  };
  recentMocktests: Array<Mocktest & { studentName: string, className: string, teacherName: string }>;
}

export default function FeedbackMonitoring() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [stats, setStats] = useState<FeedbackStats>({
    totalMocktests: 0,
    mocktestsWithFeedback: 0,
    mocktestsWithoutFeedback: 0,
    feedbackPercentage: 0,
    teacherStats: {},
    classMocktests: {},
    recentMocktests: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('30');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch classes
        const classesSnapshot = await getDocs(collection(db, 'classes'));
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Class[];
        setClasses(classesData);

        // Fetch teachers
        const teachersSnapshot = await getDocs(query(
          collection(db, 'users'),
          where('role', '==', 'teacher')
        ));
        const teachersData = teachersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];
        setTeachers(teachersData);

        // Calculate stats
        await calculateStats(classesData, teachersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Recalculate stats when filters change
  useEffect(() => {
    if (classes.length > 0 && teachers.length > 0) {
      calculateStats(classes, teachers);
    }
  }, [selectedTimeframe, selectedTeacher, selectedClass]);

  const calculateStats = async (classesData: Class[], teachersData: User[]) => {
    setLoading(true);
    try {
      // Create a map of teacher IDs to names for quick lookup
      const teacherMap = teachersData.reduce((acc, teacher) => {
        acc[teacher.id] = teacher.name || teacher.email || 'Unknown Teacher';
        return acc;
      }, {} as { [key: string]: string });

      // Create a map of class IDs to names for quick lookup
      const classMap = classesData.reduce((acc, classData) => {
        acc[classData.id] = classData.name || `Class ${classData.id}`;
        return acc;
      }, {} as { [key: string]: string });

      // Create a map of student IDs to names for quick lookup
      const studentMap: { [key: string]: string } = {};
      classesData.forEach(classData => {
        (classData.students || []).forEach(student => {
          studentMap[student.id] = student.name || student.email || 'Unknown Student';
        });
      });

      // Calculate date threshold based on selected timeframe
      const days = parseInt(selectedTimeframe);
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const timestampThreshold = Timestamp.fromDate(dateThreshold);

      // Build query for mocktests
      let mocktestQuery = query(
        collection(db, 'mocktests'),
        where('submittedAt', '>=', timestampThreshold),
        orderBy('submittedAt', 'desc')
      );

      // Get all mocktests
      const mocktestSnapshot = await getDocs(mocktestQuery);
      let mocktests = mocktestSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Mocktest[];

      // Apply class filter if selected
      if (selectedClass !== 'all') {
        mocktests = mocktests.filter(mocktest => mocktest.classId === selectedClass);
      }

      // Apply teacher filter if selected
      if (selectedTeacher !== 'all') {
        // First get all classes taught by this teacher
        const teacherClasses = classesData.filter(c => c.teacherId === selectedTeacher).map(c => c.id);
        mocktests = mocktests.filter(mocktest => teacherClasses.includes(mocktest.classId));
      }

      // Initialize stats
      const totalMocktests = mocktests.length;
      const mocktestsWithFeedback = mocktests.filter(m => m.feedback).length;
      const mocktestsWithoutFeedback = totalMocktests - mocktestsWithFeedback;
      const feedbackPercentage = totalMocktests > 0 ? Math.round((mocktestsWithFeedback / totalMocktests) * 100) : 0;

      // Initialize teacher stats
      const teacherStats: FeedbackStats['teacherStats'] = {};
      
      // Initialize class stats
      const classMocktests: FeedbackStats['classMocktests'] = {};

      // Process mocktests to build stats
      mocktests.forEach(mocktest => {
        // Get class data
        const classData = classesData.find(c => c.id === mocktest.classId);
        if (!classData) return;

        const teacherId = classData.teacherId;
        const className = classMap[mocktest.classId] || `Class ${mocktest.classId}`;

        // Update class stats
        if (!classMocktests[mocktest.classId]) {
          classMocktests[mocktest.classId] = {
            className,
            totalMocktests: 0,
            mocktestsWithFeedback: 0,
            feedbackPercentage: 0
          };
        }
        classMocktests[mocktest.classId].totalMocktests++;
        if (mocktest.feedback) {
          classMocktests[mocktest.classId].mocktestsWithFeedback++;
        }

        // Update teacher stats
        if (teacherId) {
          if (!teacherStats[teacherId]) {
            teacherStats[teacherId] = {
              teacherName: teacherMap[teacherId] || `Teacher ${teacherId}`,
              totalMocktests: 0,
              providedFeedback: 0,
              pendingFeedback: 0,
              feedbackPercentage: 0,
              lastFeedbackDate: null
            };
          }
          
          teacherStats[teacherId].totalMocktests++;
          
          if (mocktest.feedback) {
            teacherStats[teacherId].providedFeedback++;
            
            // Update last feedback date if newer
            const feedbackDate = mocktest.submittedAt.toDate();
            if (!teacherStats[teacherId].lastFeedbackDate || 
                feedbackDate > teacherStats[teacherId].lastFeedbackDate) {
              teacherStats[teacherId].lastFeedbackDate = feedbackDate;
            }
          } else {
            teacherStats[teacherId].pendingFeedback++;
          }
        }
      });

      // Calculate percentages for classes
      Object.keys(classMocktests).forEach(classId => {
        const classStats = classMocktests[classId];
        classStats.feedbackPercentage = classStats.totalMocktests > 0 
          ? Math.round((classStats.mocktestsWithFeedback / classStats.totalMocktests) * 100) 
          : 0;
      });

      // Calculate percentages for teachers
      Object.keys(teacherStats).forEach(teacherId => {
        const teacher = teacherStats[teacherId];
        teacher.feedbackPercentage = teacher.totalMocktests > 0 
          ? Math.round((teacher.providedFeedback / teacher.totalMocktests) * 100) 
          : 0;
      });

      // Get recent mocktests with student and class info
      const recentMocktests = mocktests.slice(0, 10).map(mocktest => ({
        ...mocktest,
        studentName: studentMap[mocktest.studentId] || 'Unknown Student',
        className: classMap[mocktest.classId] || 'Unknown Class',
        teacherName: teacherMap[classesData.find(c => c.id === mocktest.classId)?.teacherId || ''] || 'Unknown Teacher'
      }));

      // Update stats
      setStats({
        totalMocktests,
        mocktestsWithFeedback,
        mocktestsWithoutFeedback,
        feedbackPercentage,
        teacherStats,
        classMocktests,
        recentMocktests
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Send reminder to teacher
  const sendReminder = async (teacherId: string, teacherEmail: string) => {
    setSendingReminder(teacherId);
    try {
      const pendingCount = stats.teacherStats[teacherId]?.pendingFeedback || 0;
      const message = `Bạn có ${pendingCount} bài mocktest đang chờ feedback. Vui lòng kiểm tra và cung cấp feedback cho học viên.`;
      
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
    return Object.entries(stats.classMocktests)
      .sort(([, a], [, b]) => a.feedbackPercentage - b.feedbackPercentage)
      .map(([id, data]) => ({ id, ...data }));
  }, [stats.classMocktests]);

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
      <MocktestFilterBar 
        selectedTimeframe={selectedTimeframe}
        setSelectedTimeframe={setSelectedTimeframe}
        selectedTeacher={selectedTeacher}
        setSelectedTeacher={setSelectedTeacher}
        selectedClass={selectedClass}
        setSelectedClass={setSelectedClass}
        teachers={teachers}
        classes={classes}
      />

      <MocktestStatsOverview 
        totalMocktests={stats.totalMocktests}
        mocktestsWithFeedback={stats.mocktestsWithFeedback}
        mocktestsWithoutFeedback={stats.mocktestsWithoutFeedback}
        feedbackPercentage={stats.feedbackPercentage}
      />

      <MocktestTeacherStatsTable 
        teachers={teachers}
        teacherStats={sortedTeachers}
        sendingReminder={sendingReminder}
        onSendReminder={sendReminder}
        formatDate={formatDate}
      />

      <MocktestClassStatsTable 
        classStats={sortedClasses}
      />

      <MocktestRecentTable 
        mocktests={stats.recentMocktests}
        formatDate={formatDate}
      />
    </div>
  );
}
