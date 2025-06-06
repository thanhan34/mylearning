'use client';

import { useState } from 'react';
import StudentHomeworkTable from '../components/StudentHomeworkTable';

export default function HomeworkFeedbackPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const timeframeOptions = [
    { value: '7', label: '7 ngày qua' },
    { value: '30', label: '30 ngày qua' },
    { value: '90', label: '3 tháng qua' },
    { value: '365', label: '1 năm qua' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fedac2]/30 via-white to-[#fdbc94]/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#fc5d01] mb-2">
                Bài tập về nhà & Feedback
              </h1>
              <p className="text-gray-600">
                Xem toàn bộ bài tập về nhà của bạn và feedback từ giảng viên
              </p>
            </div>
            
            {/* Timeframe Filter */}
            <div className="flex flex-col sm:flex-row gap-2">
              <label className="text-sm font-medium text-gray-700 sm:self-center">
                Khoảng thời gian:
              </label>
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent bg-white"
              >
                {timeframeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Homework Table */}
        <StudentHomeworkTable selectedTimeframe={selectedTimeframe} />
      </div>
    </div>
  );
}
