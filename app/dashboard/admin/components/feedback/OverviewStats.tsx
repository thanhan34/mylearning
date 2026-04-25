'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  QueryConstraint,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  limit
} from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';
import { HomeworkSubmission } from '@/app/firebase/services/types';

interface OverviewStatsProps {
  selectedTimeframe: string;
  customStartDate?: string;
  customEndDate?: string;
  selectedTeacher: string;
  selectedClass: string;
  teachers: User[];
  classes: Class[];
  allowedClassIds?: string[];
}

interface HomeworkData {
  id: string;
  userId: string;
  userName: string;
  date: string;
  submissions: HomeworkSubmission[];
}

interface TeacherExerciseTypeStat {
  type: string;
  count: number;
  percentageOfTeacher: number;
  percentageOfTotal: number;
}

interface TeacherFeedbackStat {
  name: string;
  count: number;
  percentage: number;
  typeStats: TeacherExerciseTypeStat[];
}

export default function OverviewStats({
  selectedTimeframe,
  customStartDate = '',
  customEndDate = '',
  selectedTeacher,
  selectedClass,
  teachers,
  classes,
  allowedClassIds
}: OverviewStatsProps) {
  const [homeworkData, setHomeworkData] = useState<HomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherDetail, setSelectedTeacherDetail] = useState<TeacherFeedbackStat | null>(null);

  // Fetch homework data
  useEffect(() => {
    setLoading(true);

    let startDateString = '';
    let endDateString = '';

    if (selectedTimeframe === 'custom' && (customStartDate || customEndDate)) {
      startDateString = customStartDate;
      endDateString = customEndDate;

      if (startDateString && endDateString && startDateString > endDateString) {
        [startDateString, endDateString] = [endDateString, startDateString];
      }
    } else {
      const days = parseInt(selectedTimeframe) || 7;
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      startDateString = dateThreshold.toISOString().split('T')[0];
    }

    const queryConstraints: QueryConstraint[] = [];

    if (startDateString) {
      queryConstraints.push(where('date', '>=', startDateString));
    }

    if (endDateString) {
      queryConstraints.push(where('date', '<=', endDateString));
    }

    queryConstraints.push(orderBy('date', 'desc'), limit(200));

    const homeworkQuery = query(
      collection(db, 'homework'),
      ...queryConstraints
    );

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
  }, [selectedTimeframe, customStartDate, customEndDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!homeworkData.length || !classes.length || !teachers.length) {
      return {
        totalHomework: 0,
        totalSubmissions: 0,
        withFeedback: 0,
        withoutFeedback: 0,
        feedbackPercentage: 0,
        teacherStats: [] as TeacherFeedbackStat[]
      };
    }

    // Create lookup maps
    const teacherMap = teachers.reduce((acc, teacher) => {
      acc[teacher.id] = teacher.name || teacher.email || 'Unknown';
      return acc;
    }, {} as { [key: string]: string });

    const studentMap: { [key: string]: { classId: string } } = {};
    classes.forEach(classData => {
      (classData.students || []).forEach(student => {
        studentMap[student.id] = { classId: classData.id };
      });
    });

    // Filter homework by role-based access
    let filteredHomework = homeworkData.filter(hw => {
      const studentInfo = studentMap[hw.userId];
      if (!studentInfo) return false;

      // Apply role-based filtering
      if (allowedClassIds && allowedClassIds.length > 0) {
        if (!allowedClassIds.includes(studentInfo.classId)) return false;
      }

      // Apply user-selected filters
      if (selectedClass !== 'all' && studentInfo.classId !== selectedClass) return false;

      const classData = classes.find(c => c.id === studentInfo.classId);
      if (!classData) return false;

      if (selectedTeacher !== 'all' && classData.teacherId !== selectedTeacher) return false;

      return true;
    });

    // Calculate homework records with feedback status (đồng bộ với AllHomeworkTable)
    // Threshold: 25% để coi như đã hoàn thành feedback
    const FEEDBACK_THRESHOLD = 0.25; // 25% (giữa 20-30%)
    
    let totalSubmissions = 0;
    let homeworkWithFullFeedback = 0;
    let homeworkWithoutFullFeedback = 0;
    const teacherFeedbackCount: { [key: string]: number } = {};
    const teacherFeedbackTypeCount: { [teacherName: string]: { [exerciseType: string]: number } } = {};

    filteredHomework.forEach(hw => {
      const submissionCount = (hw.submissions || []).length;
      const feedbackCount = (hw.submissions || []).filter(
        sub => sub.feedback && sub.feedback.trim() !== ''
      ).length;

      totalSubmissions += submissionCount;

      // Đếm homework records với threshold 25%
      if (submissionCount > 0) {
        const feedbackPercentage = feedbackCount / submissionCount;
        if (feedbackPercentage >= FEEDBACK_THRESHOLD) {
          homeworkWithFullFeedback++;
        } else {
          homeworkWithoutFullFeedback++;
        }
      }

      // Track who gave feedback
      (hw.submissions || []).forEach(sub => {
        if (sub.feedback && sub.feedback.trim() !== '') {
          const feedbackBy = sub.feedbackByName || 'Unknown';
          const exerciseType = sub.type?.trim() || 'Không rõ dạng bài';

          teacherFeedbackCount[feedbackBy] = (teacherFeedbackCount[feedbackBy] || 0) + 1;

          if (!teacherFeedbackTypeCount[feedbackBy]) {
            teacherFeedbackTypeCount[feedbackBy] = {};
          }
          teacherFeedbackTypeCount[feedbackBy][exerciseType] = (teacherFeedbackTypeCount[feedbackBy][exerciseType] || 0) + 1;
        }
      });
    });

    const feedbackPercentage = (homeworkWithFullFeedback + homeworkWithoutFullFeedback) > 0
      ? Math.round((homeworkWithFullFeedback / (homeworkWithFullFeedback + homeworkWithoutFullFeedback)) * 100) 
      : 0;

    // Calculate teacher stats
    const teacherStats = Object.entries(teacherFeedbackCount)
      .map(([name, count]) => {
        const typeStats = Object.entries(teacherFeedbackTypeCount[name] || {})
          .map(([type, typeCount]) => ({
            type,
            count: typeCount,
            percentageOfTeacher: count > 0
              ? Math.round((typeCount / count) * 100)
              : 0,
            percentageOfTotal: totalSubmissions > 0
              ? Math.round((typeCount / totalSubmissions) * 100)
              : 0
          }))
          .sort((a, b) => b.count - a.count);

        return {
          name,
          count,
          percentage: totalSubmissions > 0 
          ? Math.round((count / totalSubmissions) * 100) 
          : 0,
          typeStats
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalHomework: filteredHomework.length,
      totalSubmissions,
      withFeedback: homeworkWithFullFeedback,
      withoutFeedback: homeworkWithoutFullFeedback,
      feedbackPercentage,
      teacherStats
    };
  }, [homeworkData, classes, teachers, selectedClass, selectedTeacher, allowedClassIds]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-12">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#fc5d01]"></div>
          <p className="text-gray-600 font-medium">Đang tải thống kê...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Tổng số bài nộp</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalHomework}</p>
              <p className="text-sm text-gray-500 mt-1">Submissions của học viên</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Tổng số bài tập</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSubmissions}</p>
              <p className="text-sm text-gray-500 mt-1">Individual exercises</p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Bài nộp đã feedback đủ</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.withFeedback}</p>
              <p className="text-sm text-gray-500 mt-1">{stats.feedbackPercentage}% hoàn thành (&ge;25%)</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Bài nộp chưa feedback đủ</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.withoutFeedback}</p>
              <p className="text-sm text-gray-500 mt-1">{100 - stats.feedbackPercentage}% còn lại (&lt;25%)</p>
            </div>
            <div className="bg-red-100 rounded-full p-3">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiến độ feedback tổng thể</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Đã hoàn thành</span>
            <span>{stats.feedbackPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.feedbackPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{stats.withFeedback} bài nộp hoàn tất</span>
            <span>{stats.withoutFeedback} bài nộp chưa đủ</span>
          </div>
        </div>
      </div>

      {/* Teacher Stats */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Thống kê feedback theo giảng viên</h3>
        {stats.teacherStats.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Chưa có feedback nào trong khoảng thời gian này</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stats.teacherStats.map((teacher, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setSelectedTeacherDetail(teacher)}
                className="w-full text-left border-b border-gray-100 pb-4 last:border-0 rounded-lg transition-colors hover:bg-[#fedac2]/20 focus:outline-none focus:ring-2 focus:ring-[#fc5d01]/40"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{teacher.name}</p>
                      <p className="text-sm text-gray-500">{teacher.count} bài tập đã feedback • Bấm để xem chi tiết</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#fc5d01]">{teacher.percentage}%</p>
                    <p className="text-xs text-gray-500">của tổng số</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#fc5d01] h-full rounded-full transition-all duration-500"
                    style={{ width: `${teacher.percentage}%` }}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTeacherDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white">
              <div>
                <h3 className="text-xl font-semibold">Chi tiết feedback của {selectedTeacherDetail.name}</h3>
                <p className="text-sm text-white/90 mt-1">
                  {selectedTeacherDetail.count} bài đã feedback • {selectedTeacherDetail.percentage}% của tổng số bài trong bộ lọc
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTeacherDetail(null)}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60 rounded-md p-1"
                aria-label="Đóng chi tiết trainer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#fedac2]/30 border border-[#fdbc94] rounded-xl p-4">
                  <p className="text-sm text-gray-600">Tổng bài đã feedback</p>
                  <p className="text-2xl font-bold text-[#fc5d01] mt-1">{selectedTeacherDetail.count}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">% của tổng số bài</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedTeacherDetail.percentage}%</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-sm text-gray-600">Số dạng bài</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{selectedTeacherDetail.typeStats.length}</p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#fedac2]/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dạng bài tập</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">Số bài đã feedback</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">% trong trainer</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">% của tổng số</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {selectedTeacherDetail.typeStats.map((typeStat) => (
                      <tr key={typeStat.type} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{typeStat.type}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-700">{typeStat.count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-[#fc5d01] h-full rounded-full"
                                style={{ width: `${typeStat.percentageOfTeacher}%` }}
                              />
                            </div>
                            <span className="w-10 text-right text-sm font-semibold text-[#fc5d01]">{typeStat.percentageOfTeacher}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-700">{typeStat.percentageOfTotal}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                “% trong trainer” = số bài dạng đó / tổng số bài trainer đã feedback. “% của tổng số” = số bài dạng đó / tổng số bài tập trong bộ lọc hiện tại.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTeacherDetail(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
