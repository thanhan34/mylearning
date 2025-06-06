'use client';

import { useState, useEffect, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import { getStudentHomework, StudentHomeworkData, getHomeworkStats } from '@/app/firebase/services/student-homework';
import { useSession } from 'next-auth/react';

interface StudentHomeworkTableProps {
  selectedTimeframe: string;
}

export default function StudentHomeworkTable({
  selectedTimeframe
}: StudentHomeworkTableProps) {
  const { data: session } = useSession();
  const [homeworkData, setHomeworkData] = useState<StudentHomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<StudentHomeworkData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<'date' | 'feedback'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  // Load homework data using async function - same pattern as progress.ts
  useEffect(() => {
    const loadHomework = async () => {
      if (!session?.user?.email) return;

      setLoading(true);
      console.log('Loading homework for user:', session.user.email);

      try {
        const homework = await getStudentHomework(session.user.email);
        console.log('Received homework data:', homework);
        setHomeworkData(homework);
      } catch (error) {
        console.error('Error loading homework:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomework();
  }, [session?.user?.email]);

  // Process and filter homework data - SIMPLIFIED VERSION
  const processedHomework = useMemo(() => {
    console.log('Processing homework data:', homeworkData);
    if (!homeworkData.length) {
      console.log('No homework data to process');
      return [];
    }

    // Show all homework first for debugging
    console.log('All homework before any filtering:', homeworkData.map(hw => ({
      id: hw.id,
      date: hw.date,
      userId: hw.userId,
      submissions: hw.submissions?.length || 0
    })));

    // TEMPORARILY REMOVE DATE FILTER FOR DEBUGGING
    let processed = homeworkData.map(homework => {
      const submissionCount = (homework.submissions || []).length;
      const feedbackCount = (homework.submissions || []).filter(
        submission => submission.feedback && submission.feedback.trim() !== ''
      ).length;

      console.log('Processing homework:', {
        id: homework.id,
        date: homework.date,
        submissionCount,
        feedbackCount,
        submissions: homework.submissions
      });

      return {
        ...homework,
        feedbackCount,
        totalCount: submissionCount
      };
    });

    console.log('Processed homework (no date filter):', processed);

    // Apply search filter only
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      processed = processed.filter(homework => 
        homework.date.includes(term)
      );
      console.log('After search filter, processed count:', processed.length);
    }

    // Apply sorting
    processed.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.date || '1970-01-01').getTime() - new Date(b.date || '1970-01-01').getTime();
          break;
        case 'feedback':
          const aPercentage = a.totalCount > 0 ? (a.feedbackCount / a.totalCount) : 0;
          const bPercentage = b.totalCount > 0 ? (b.feedbackCount / b.totalCount) : 0;
          comparison = aPercentage - bPercentage;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    console.log('Final processed homework:', processed);
    return processed;
  }, [homeworkData, searchTerm, sortBy, sortOrder]); // Removed selectedTimeframe dependency

  // Get homework stats
  const stats = useMemo(() => getHomeworkStats(homeworkData), [homeworkData]);

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

  const handleViewDetails = (homework: StudentHomeworkData) => {
    console.log('Opening modal for homework:', homework.id);
    setSelectedSubmission(homework);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    console.log('Closing modal');
    setSelectedSubmission(null);
    setIsModalOpen(false);
  };

  // Add keyboard event listener for ESC key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedSubmission) {
        console.log('ESC key pressed, closing modal');
        closeModal();
      }
    };

    if (selectedSubmission) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [selectedSubmission]);

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
    if (feedbackCount === totalCount) return { text: 'Đã có feedback', color: 'text-green-600', bg: 'bg-green-100' };
    if (feedbackCount === 0) return { text: 'Chưa có feedback', color: 'text-red-600', bg: 'bg-red-100' };
    return { text: `${feedbackCount}/${totalCount}`, color: 'text-yellow-600', bg: 'bg-yellow-100' };
  };

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
              Bài tập về nhà của tôi ({processedHomework.length})
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Tìm kiếm theo ngày..."
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
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="text-4xl mb-2">📚</div>
                      <div className="text-lg font-medium mb-1">Không có bài tập nào</div>
                      <div className="text-sm">
                        {homeworkData.length === 0 
                          ? 'Không tìm thấy homework cho email này'
                          : 'Thử thay đổi từ khóa tìm kiếm'
                        }
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedHomework.map(homework => {
                  const status = getFeedbackStatus(homework.feedbackCount, homework.totalCount);
                  return (
                    <tr key={homework.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {homework.timestamp ? formatDate(homework.timestamp.toDate()) : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{homework.date || 'No date'}</div>
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

      {/* Modal for viewing homework details */}
      {selectedSubmission && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            console.log('Background clicked');
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => {
              console.log('Modal content clicked');
              e.stopPropagation();
            }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white">
              <h3 className="text-xl font-semibold">Chi tiết bài tập</h3>
              <button 
                onClick={(e) => {
                  console.log('X button clicked');
                  e.preventDefault();
                  e.stopPropagation();
                  closeModal();
                }}
                className="text-white hover:text-gray-200 focus:outline-none p-2 rounded-full hover:bg-white/20 transition-colors"
                type="button"
                aria-label="Đóng modal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Homework Info */}
            <div className="px-6 py-4 bg-[#fedac2]/20">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Ngày nộp</p>
                  <p className="font-medium">
                    {selectedSubmission.timestamp ? formatDate(selectedSubmission.timestamp.toDate()) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Số bài tập</p>
                  <p className="font-medium">{selectedSubmission.submissions.length} bài</p>
                </div>
              </div>
            </div>

            {/* Submissions and Feedback */}
            <div className="flex-1 overflow-y-auto p-6">
              {selectedSubmission.submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Không có bài tập nào
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedSubmission.submissions.map((submission, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                        <h4 className="font-medium">Bài tập #{index + 1}</h4>
                      </div>
                      
                      <div className="p-4">
                        <div className="mb-4">
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Nội dung bài tập</h5>
                          <div className="bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                            {submission.link ? (
                              <a 
                                href={submission.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || submission.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                {submission.link}
                              </a>
                            ) : (
                              <span className="text-gray-500 italic">Không có nội dung</span>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-1">Feedback của giảng viên</h5>
                          <div className={`p-3 rounded border whitespace-pre-wrap ${
                            submission.feedback ? 'bg-[#fedac2]/20 border-[#fc5d01]/20' : 'bg-gray-50 border-gray-200'
                          }`}>
                            {submission.feedback ? (
                              <p>{submission.feedback}</p>
                            ) : (
                              <p className="text-gray-500 italic">Chưa có feedback từ giảng viên</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={(e) => {
                  console.log('Close button clicked');
                  e.preventDefault();
                  closeModal();
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                type="button"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
