'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import FeedbackDetailsModal from './FeedbackDetailsModal';

interface HomeworkData {
  id: string;
  userId: string;
  userName: string;
  date: string;
  submissions: HomeworkSubmission[];
  timestamp: Timestamp;
}

interface ExtendedHomeworkData extends HomeworkData {
  studentName: string;
  className: string;
  teacherName: string;
  feedbackCount: number;
  totalCount: number;
  studentId: string;
  classId: string;
  teacherId: string;
}

interface AllHomeworkTableProps {
  selectedTimeframe: string;
  selectedTeacher: string;
  selectedClass: string;
  teachers: User[];
  classes: Class[];
  feedbackFilter?: 'with-feedback' | 'without-feedback';
  customTitle?: string;
  customEmptyMessage?: string;
  customEmptyIcon?: string;
}

export default function AllHomeworkTable({
  selectedTimeframe,
  selectedTeacher,
  selectedClass,
  teachers,
  classes,
  feedbackFilter,
  customTitle,
  customEmptyMessage,
  customEmptyIcon
}: AllHomeworkTableProps) {
  const [homeworkData, setHomeworkData] = useState<HomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<ExtendedHomeworkData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortBy, setSortBy] = useState<'date' | 'student' | 'class' | 'feedback'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Set up real-time listener for homework data
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

  // Process and filter homework data
  const processedHomework = useMemo(() => {
    if (!homeworkData.length || !classes.length || !teachers.length) return [];

    // Create lookup maps
    const teacherMap = teachers.reduce((acc, teacher) => {
      acc[teacher.id] = teacher.name || teacher.email || 'Unknown Teacher';
      return acc;
    }, {} as { [key: string]: string });

    const classMap = classes.reduce((acc, classData) => {
      acc[classData.id] = classData.name || `Class ${classData.id}`;
      return acc;
    }, {} as { [key: string]: string });

    const studentMap: { [key: string]: { name: string, classId: string } } = {};
    classes.forEach(classData => {
      (classData.students || []).forEach(student => {
        studentMap[student.id] = {
          name: student.name || student.email || 'Unknown Student',
          classId: classData.id
        };
      });
    });

    // Process homework data
    let processed = homeworkData.map(homework => {
      const studentInfo = studentMap[homework.userId];
      if (!studentInfo) return null;

      const classId = studentInfo.classId;
      const classData = classes.find(c => c.id === classId);
      if (!classData) return null;

      const teacherId = classData.teacherId;
      const submissionCount = (homework.submissions || []).length;
      const feedbackCount = (homework.submissions || []).filter(
        submission => submission.feedback && submission.feedback.trim() !== ''
      ).length;

      return {
        ...homework,
        studentName: studentInfo.name,
        className: classMap[classId] || 'Unknown Class',
        teacherName: teacherMap[teacherId] || 'Unknown Teacher',
        feedbackCount,
        totalCount: submissionCount,
        studentId: homework.userId,
        classId,
        teacherId
      } as ExtendedHomeworkData;
    }).filter(Boolean) as ExtendedHomeworkData[];

    // Apply feedback filter
    if (feedbackFilter === 'with-feedback') {
      processed = processed.filter(homework => homework.feedbackCount === homework.totalCount && homework.totalCount > 0);
    } else if (feedbackFilter === 'without-feedback') {
      processed = processed.filter(homework => homework.feedbackCount < homework.totalCount && homework.totalCount > 0);
    }

    // Apply filters
    if (selectedClass !== 'all') {
      processed = processed.filter(homework => homework.classId === selectedClass);
    }

    if (selectedTeacher !== 'all') {
      processed = processed.filter(homework => homework.teacherId === selectedTeacher);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      processed = processed.filter(homework => 
        homework.studentName.toLowerCase().includes(term) ||
        homework.className.toLowerCase().includes(term) ||
        homework.teacherName.toLowerCase().includes(term) ||
        homework.date.includes(term)
      );
    }

    // Apply sorting
    processed.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'student':
          comparison = a.studentName.localeCompare(b.studentName);
          break;
        case 'class':
          comparison = a.className.localeCompare(b.className);
          break;
        case 'feedback':
          const aPercentage = a.totalCount > 0 ? (a.feedbackCount / a.totalCount) : 0;
          const bPercentage = b.totalCount > 0 ? (b.feedbackCount / b.totalCount) : 0;
          comparison = aPercentage - bPercentage;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return processed;
  }, [homeworkData, classes, teachers, selectedClass, selectedTeacher, searchTerm, sortBy, sortOrder, feedbackFilter]);

  // Pagination
  const totalPages = Math.ceil(processedHomework.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedHomework = processedHomework.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleViewDetails = (homework: ExtendedHomeworkData) => {
    setSelectedSubmission(homework);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSortIcon = (column: typeof sortBy) => {
    if (sortBy !== column) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const getFeedbackStatus = (feedbackCount: number, totalCount: number) => {
    if (totalCount === 0) return { text: 'Không có bài tập', color: 'text-gray-500', bg: 'bg-gray-100' };
    if (feedbackCount === totalCount) return { text: 'Hoàn thành', color: 'text-green-600', bg: 'bg-green-100' };
    if (feedbackCount === 0) return { text: 'Chưa có feedback', color: 'text-red-600', bg: 'bg-red-100' };
    return { text: `${feedbackCount}/${totalCount}`, color: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

  // Get title and empty state based on props
  const title = customTitle || `Toàn bộ bài tập về nhà (${processedHomework.length})`;
  const emptyMessage = customEmptyMessage || 'Không có bài tập nào';
  const emptyIcon = customEmptyIcon || '📚';

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-semibold text-[#fc5d01]">
              {title}
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Tìm kiếm học viên, lớp, giảng viên..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('student')}
                >
                  <div className="flex items-center gap-1">
                    Học viên
                    <span className="text-gray-400">{getSortIcon('student')}</span>
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('class')}
                >
                  <div className="flex items-center gap-1">
                    Lớp học
                    <span className="text-gray-400">{getSortIcon('class')}</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Giảng viên
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1">
                    Ngày nộp
                    <span className="text-gray-400">{getSortIcon('date')}</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số bài tập
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('feedback')}
                >
                  <div className="flex items-center gap-1">
                    Trạng thái feedback
                    <span className="text-gray-400">{getSortIcon('feedback')}</span>
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedHomework.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-2">{emptyIcon}</div>
                      <div className="text-lg font-medium mb-1">{emptyMessage}</div>
                      <div className="text-sm">Thử thay đổi bộ lọc hoặc khoảng thời gian</div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHomework.map(homework => {
                  const status = getFeedbackStatus(homework.feedbackCount, homework.totalCount);
                  return (
                    <tr key={homework.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{homework.studentName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{homework.className}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{homework.teacherName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(homework.timestamp.toDate())}
                        </div>
                        <div className="text-xs text-gray-500">{homework.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{homework.totalCount} bài</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                          {status.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(homework)}
                          className="text-[#fc5d01] hover:text-[#fd7f33] font-medium text-sm transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Hiển thị {startIndex + 1} - {Math.min(startIndex + itemsPerPage, processedHomework.length)} trong tổng số {processedHomework.length} bài tập
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Trước
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded-md ${
                          currentPage === pageNum
                            ? 'bg-[#fc5d01] text-white border-[#fc5d01]'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <FeedbackDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          studentName={selectedSubmission.studentName}
          teacherName={selectedSubmission.teacherName}
          className={selectedSubmission.className}
          date={formatDate(selectedSubmission.timestamp.toDate())}
          submissions={selectedSubmission.submissions}
          studentId={selectedSubmission.studentId}
          documentId={selectedSubmission.id}
        />
      )}
    </>
  );
}
