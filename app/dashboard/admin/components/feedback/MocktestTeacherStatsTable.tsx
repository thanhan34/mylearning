'use client';

import { useState } from 'react';
import { User } from '@/app/firebase/services/user';

interface TeacherStat {
  id: string;
  teacherName: string;
  totalMocktests: number;
  providedFeedback: number;
  pendingFeedback: number;
  feedbackPercentage: number;
  lastFeedbackDate: Date | null;
}

interface MocktestTeacherStatsTableProps {
  teachers: User[];
  teacherStats: TeacherStat[];
  sendingReminder: string | null;
  onSendReminder: (teacherId: string, teacherEmail: string) => void;
  formatDate: (date: Date | null) => string;
}

export default function MocktestTeacherStatsTable({ 
  teachers, 
  teacherStats, 
  sendingReminder, 
  onSendReminder,
  formatDate
}: MocktestTeacherStatsTableProps) {
  return (
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
            {teacherStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              teacherStats.map(teacher => {
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
                          onClick={() => onSendReminder(teacher.id, teacherData.email)}
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
  );
}
