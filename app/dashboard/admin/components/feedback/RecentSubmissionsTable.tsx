'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import FeedbackDetailsModal from './FeedbackDetailsModal';

interface RecentSubmission {
  id: string;
  studentName: string;
  className: string;
  teacherName: string;
  date: string;
  timestamp: Timestamp;
  feedbackCount: number;
  totalCount: number;
  submissions: any[];
}

interface RecentSubmissionsTableProps {
  submissions: RecentSubmission[];
  formatDate: (date: Date) => string;
}

export default function RecentSubmissionsTable({ 
  submissions, 
  formatDate 
}: RecentSubmissionsTableProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<RecentSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (submission: RecentSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-[#fc5d01]">Bài tập gần đây</h3>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                submissions.map(submission => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{submission.studentName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{submission.className}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{submission.teacherName}</div>
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

      {selectedSubmission && (
        <FeedbackDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          studentName={selectedSubmission.studentName}
          teacherName={selectedSubmission.teacherName}
          className={selectedSubmission.className}
          date={formatDate(selectedSubmission.timestamp.toDate())}
          submissions={selectedSubmission.submissions}
        />
      )}
    </>
  );
}
