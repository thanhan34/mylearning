'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import FeedbackDetailsModal from './FeedbackDetailsModal';

interface TeacherSubmission {
  id: string;
  studentName: string;
  className: string;
  date: string;
  timestamp: Timestamp;
  feedbackCount: number;
  totalCount: number;
  submissions: any[];
  studentId?: string;
}

interface TeacherFeedbackDetailsProps {
  teacherId: string;
  teacherName: string;
  submissions: TeacherSubmission[];
  formatDate: (date: Date) => string;
  onBack: () => void;
}

export default function TeacherFeedbackDetails({
  teacherId,
  teacherName,
  submissions,
  formatDate,
  onBack
}: TeacherFeedbackDetailsProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<TeacherSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string>('');

  const handleViewDetails = (submission: TeacherSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleViewClass = (className: string) => {
    setSelectedClass(className);
    setSelectedClassName(className);
  };

  const handleBackToClasses = () => {
    setSelectedClass(null);
  };

  // Calculate statistics
  const totalSubmissions = submissions.reduce((total, sub) => total + sub.totalCount, 0);
  const totalFeedback = submissions.reduce((total, sub) => total + sub.feedbackCount, 0);
  const feedbackPercentage = totalSubmissions > 0 
    ? Math.round((totalFeedback / totalSubmissions) * 100) 
    : 0;

  // Group submissions by class
  const classSummary: Record<string, { total: number, withFeedback: number }> = {};
  submissions.forEach(sub => {
    if (!classSummary[sub.className]) {
      classSummary[sub.className] = { total: 0, withFeedback: 0 };
    }
    classSummary[sub.className].total += sub.totalCount;
    classSummary[sub.className].withFeedback += sub.feedbackCount;
  });

  // Filter submissions by selected class
  const filteredSubmissions = selectedClass 
    ? submissions.filter(sub => sub.className === selectedClass)
    : submissions;

  // If a class is selected, show only submissions for that class
  if (selectedClass) {
    return (
      <>
        <div className="space-y-6">
          {/* Header with back button */}
          <div className="flex items-center justify-between">
            <button 
              onClick={handleBackToClasses}
              className="flex items-center text-gray-600 hover:text-[#fc5d01]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Quay lại danh sách lớp
            </button>
            <h2 className="text-xl font-semibold text-[#fc5d01]">Bài tập lớp {selectedClassName}</h2>
          </div>

          {/* Submissions list */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#fc5d01]">Danh sách bài tập</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Không có dữ liệu
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map(submission => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{submission.studentName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(submission.timestamp.toDate())}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-2 ${
                              submission.feedbackCount === submission.totalCount ? 'bg-green-400' : 'bg-yellow-400'
                            }`}></div>
                            <span className={`text-sm ${
                              submission.feedbackCount === submission.totalCount ? 'text-green-600' : 'text-yellow-600'
                            }`}>
                              {submission.feedbackCount === submission.totalCount 
                                ? 'Đã có feedback' 
                                : `${submission.feedbackCount}/${submission.totalCount} feedback`
                              }
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetails(submission)}
                            className="text-[#fc5d01] hover:text-[#fd7f33] font-medium text-sm"
                          >
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {selectedSubmission && (
          <FeedbackDetailsModal
            isOpen={isModalOpen}
            onClose={closeModal}
            studentName={selectedSubmission.studentName}
            teacherName={teacherName}
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

  return (
    <>
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-[#fc5d01]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Quay lại
          </button>
          <h2 className="text-xl font-semibold text-[#fc5d01]">Chi tiết Feedback của {teacherName}</h2>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tổng số bài tập</h3>
            <p className="text-3xl font-bold text-gray-800">{totalSubmissions}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Đã có feedback</h3>
            <p className="text-3xl font-bold text-green-600">{totalFeedback}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Tỷ lệ feedback</h3>
            <div className="flex items-center">
              <p className="text-3xl font-bold text-[#fc5d01]">{feedbackPercentage}%</p>
              <div className="ml-4 flex-1 bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-[#fc5d01] h-2.5 rounded-full" 
                  style={{ width: `${feedbackPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Class breakdown */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#fc5d01]">Thống kê theo lớp</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lớp học
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tổng số bài tập
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Đã có feedback
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tỷ lệ
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(classSummary).map(([className, stats]) => {
                  const percentage = stats.total > 0 
                    ? Math.round((stats.withFeedback / stats.total) * 100) 
                    : 0;
                  
                  return (
                    <tr key={className} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{className}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stats.total}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{stats.withFeedback}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-sm font-medium ${
                            percentage >= 80 ? 'text-green-600' : 
                            percentage >= 50 ? 'text-yellow-600' : 
                            'text-red-600'
                          }`}>
                            {percentage}%
                          </span>
                          <div className="ml-2 w-16 bg-gray-200 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${
                                percentage >= 80 ? 'bg-green-500' : 
                                percentage >= 50 ? 'bg-yellow-500' : 
                                'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewClass(className)}
                          className="text-[#fc5d01] hover:text-[#fd7f33] font-medium text-sm"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
