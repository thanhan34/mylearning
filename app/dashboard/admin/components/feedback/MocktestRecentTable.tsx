'use client';

import { useState } from 'react';
import { Mocktest } from '@/types/mocktest';
import MocktestFeedbackDetailsModal from './MocktestFeedbackDetailsModal';

interface MocktestRecentTableProps {
  mocktests: Array<Mocktest & { studentName: string, className: string, teacherName: string }>;
  formatDate: (date: Date) => string;
}

export default function MocktestRecentTable({ 
  mocktests, 
  formatDate 
}: MocktestRecentTableProps) {
  const [selectedMocktest, setSelectedMocktest] = useState<(Mocktest & { studentName: string, className: string, teacherName: string }) | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleViewDetails = (mocktest: Mocktest & { studentName: string, className: string, teacherName: string }) => {
    setSelectedMocktest(mocktest);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mocktests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                mocktests.map(mocktest => (
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleViewDetails(mocktest)}
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

      {selectedMocktest && (
        <MocktestFeedbackDetailsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          mocktest={selectedMocktest}
          formatDate={formatDate}
        />
      )}
    </>
  );
}
