'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { addNotification } from '@/app/firebase/services/notification';
import { Class } from '@/app/firebase/services/types';
import { Mocktest } from '@/types/mocktest';
import { User } from '@/app/firebase/services/user';

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-xl font-bold text-gray-900">Theo dõi Feedback Mocktest</h2>
        
        <div className="flex flex-wrap gap-3">
          {/* Timeframe filter */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
          >
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
            <option value="365">365 ngày qua</option>
          </select>
          
          {/* Teacher filter */}
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
          >
            <option value="all">Tất cả giảng viên</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name || teacher.email}
              </option>
            ))}
          </select>
          
          {/* Class filter */}
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
          >
            <option value="all">Tất cả lớp học</option>
            {classes.map(classData => (
              <option key={classData.id} value={classData.id}>
                {classData.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Tổng số mocktest</span>
          </div>
          <div className="text-3xl font-bold text-[#fc5d01]">{stats.totalMocktests}</div>
          <div className="mt-2 text-sm text-gray-600">Trong khoảng thời gian đã chọn</div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Đã có feedback</span>
          </div>
          <div className="text-3xl font-bold text-[#fc5d01]">{stats.mocktestsWithFeedback}</div>
          <div className="mt-2 text-sm text-gray-600">
            {stats.feedbackPercentage}% tổng số mocktest
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Chưa có feedback</span>
          </div>
          <div className="text-3xl font-bold text-[#fc5d01]">{stats.mocktestsWithoutFeedback}</div>
          <div className="mt-2 text-sm text-gray-600">
            {stats.totalMocktests > 0 ? (100 - stats.feedbackPercentage) : 0}% tổng số mocktest
          </div>
        </div>
      </div>

      {/* Teacher feedback stats */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Thống kê feedback theo giảng viên</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảng viên
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng mocktest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đã feedback
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Chưa feedback
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ lệ
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feedback gần nhất
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                sortedTeachers.map(teacher => {
                  const teacherData = teachers.find(t => t.id === teacher.id);
                  return (
                    <tr key={teacher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{teacher.teacherName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.totalMocktests}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.providedFeedback}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-2 ${
                            teacher.pendingFeedback > 0 ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className="text-sm text-gray-900">{teacher.pendingFeedback}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{teacher.feedbackPercentage}%</div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${
                              teacher.feedbackPercentage < 50 ? 'bg-red-500' : 
                              teacher.feedbackPercentage < 80 ? 'bg-yellow-500' : 
                              'bg-green-500'
                            }`} 
                            style={{ width: `${teacher.feedbackPercentage}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(teacher.lastFeedbackDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {teacher.pendingFeedback > 0 && teacherData?.email && (
                          <button
                            onClick={() => sendReminder(teacher.id, teacherData.email)}
                            disabled={sendingReminder === teacher.id}
                            className="inline-flex items-center px-3 py-1.5 border border-[#fc5d01] text-[#fc5d01] hover:bg-[#fc5d01] hover:text-white rounded-md transition-all duration-200 hover:shadow-md active:transform active:scale-95 disabled:opacity-50"
                          >
                            {sendingReminder === teacher.id ? (
                              <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Đang gửi...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                Nhắc nhở
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class feedback stats */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Thống kê feedback theo lớp học</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lớp học
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tổng mocktest
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Đã có feedback
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tỷ lệ
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedClasses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                sortedClasses.map(classData => (
                  <tr key={classData.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{classData.className}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{classData.totalMocktests}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{classData.mocktestsWithFeedback}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{classData.feedbackPercentage}%</div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full ${
                            classData.feedbackPercentage < 50 ? 'bg-red-500' : 
                            classData.feedbackPercentage < 80 ? 'bg-yellow-500' : 
                            'bg-green-500'
                          }`} 
                          style={{ width: `${classData.feedbackPercentage}%` }}
                        ></div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Recent mocktests */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Mocktest gần đây</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Học viên
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lớp học
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảng viên
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày nộp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.recentMocktests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                stats.recentMocktests.map(mocktest => (
                  <tr key={mocktest.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{mocktest.studentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mocktest.className}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{mocktest.teacherName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(mocktest.submittedAt.toDate())}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-2 ${
                          mocktest.feedback ? 'bg-green-400' : 'bg-yellow-400'
                        }`}></div>
                        <span className={`text-sm ${
                          mocktest.feedback ? 'text-green-600' : 'text-yellow-600'
                        }`}>
                          {mocktest.feedback ? 'Đã có feedback' : 'Chưa có feedback'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
