'use client';

import { useState } from 'react';
import TeacherFeedbackDetails from './TeacherFeedbackDetails';

interface TeacherStat {
  id: string;
  teacherName: string;
  totalSubmissions: number;
  providedFeedback: number;
  pendingFeedback: number;
  feedbackPercentage: number;
  lastFeedbackDate: Date | null;
}

interface TeacherStatsTableProps {
  teachers: any[];
  teacherStats: TeacherStat[];
  sendingReminder: string | null;
  onSendReminder: (teacherId: string, teacherEmail: string) => void;
  formatDate: (date: Date | null) => string;
  onViewTeacherDetails?: (teacherId: string) => void;
  teacherSubmissions?: Record<string, any[]>;
}

export default function TeacherStatsTable({ 
  teachers, 
  teacherStats, 
  sendingReminder, 
  onSendReminder,
  formatDate,
  teacherSubmissions = {}
}: TeacherStatsTableProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');

  const handleViewDetails = (teacherId: string, teacherName: string) => {
    setSelectedTeacher(teacherId);
    setSelectedTeacherName(teacherName);
  };

  const handleBack = () => {
    setSelectedTeacher(null);
  };

  // If a teacher is selected and we have submissions data, show the detailed view
  if (selectedTeacher && teacherSubmissions[selectedTeacher]) {
    return (
      <TeacherFeedbackDetails
        teacherId={selectedTeacher}
        teacherName={selectedTeacherName}
        submissions={teacherSubmissions[selectedTeacher]}
        formatDate={formatDate}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#fc5d01]">Thống kê theo Giảng viên</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Giảng viên
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổng số bài tập
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đã có feedback
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chưa có feedback
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tỷ lệ
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Feedback gần nhất
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {teacherStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              teacherStats.map(teacher => {
                const teacherEmail = teachers.find(t => t.id === teacher.id)?.email || '';
                
                return (
                  <tr key={teacher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{teacher.teacherName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{teacher.totalSubmissions}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-green-600 font-medium">{teacher.providedFeedback}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-yellow-600 font-medium">{teacher.pendingFeedback}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`text-sm font-medium ${
                          teacher.feedbackPercentage >= 80 ? 'text-green-600' : 
                          teacher.feedbackPercentage >= 50 ? 'text-yellow-600' : 
                          'text-red-600'
                        }`}>
                          {teacher.feedbackPercentage}%
                        </span>
                        <div className="ml-2 w-16 bg-gray-200 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              teacher.feedbackPercentage >= 80 ? 'bg-green-500' : 
                              teacher.feedbackPercentage >= 50 ? 'bg-yellow-500' : 
                              'bg-red-500'
                            }`}
                            style={{ width: `${teacher.feedbackPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(teacher.lastFeedbackDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {teacherSubmissions[teacher.id] && (
                        <button
                          onClick={() => handleViewDetails(teacher.id, teacher.teacherName)}
                          className="text-[#fc5d01] hover:text-[#fd7f33]"
                        >
                          Chi tiết
                        </button>
                      )}
                      {teacher.pendingFeedback > 0 && (
                        <button
                          onClick={() => onSendReminder(teacher.id, teacherEmail)}
                          disabled={sendingReminder === teacher.id}
                          className={`text-blue-600 hover:text-blue-800 ${sendingReminder === teacher.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {sendingReminder === teacher.id ? 'Đang gửi...' : 'Nhắc nhở'}
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
  );
}
