'use client';

import { Line } from 'react-chartjs-2';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface StudentDashboardProps {
  homeworkProgressData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  };
  selectedDate: string;
  selectedHomeworkType: string;
  homeworkSubmissions: any[];
  onDateChange: (date: string) => void;
  onTypeChange: (type: string) => void;
}

export default function StudentDashboard({
  homeworkProgressData,
  selectedDate,
  selectedHomeworkType,
  homeworkSubmissions,
  onDateChange,
  onTypeChange,
}: StudentDashboardProps) {
  const router = useRouter();


  // Check if we have data
  const hasData = homeworkProgressData.datasets[0].data.length > 0;
  const hasSubmissions = homeworkSubmissions.length > 0;

  if (!hasData && !hasSubmissions) {
    return (
      <div className="space-y-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center space-x-4 text-[#fc5d01]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium">Chưa có dữ liệu</h3>
              <p className="text-sm text-gray-600">Bạn chưa có bài tập nào. Hãy bắt đầu làm bài để theo dõi tiến độ.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Charts */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Tiến độ học tập</h3>
        <div className="h-64">
          <Line 
            data={homeworkProgressData} 
            options={{ 
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1,
                    color: '#666'
                  },
                  grid: {
                    color: '#eee'
                  }
                },
                x: {
                  ticks: {
                    color: '#666'
                  },
                  grid: {
                    color: '#eee'
                  }
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Daily Targets */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Mục tiêu hàng ngày</h3>
        <DailyTargetTable />
      </div>

      {/* Daily Home */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Bài tập về nhà</h3>
        <DailyHome />
      </div>

      {/* Homework Submissions */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-[#fc5d01]">Nộp bài tập</h3>
          <button
            onClick={() => router.push('/dashboard/submit')}
            className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
          >
            Nộp bài mới
          </button>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent transition-all duration-200"
          />
          <select
            value={selectedHomeworkType}
            onChange={(e) => onTypeChange(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent transition-all duration-200"
          >
            <option value="Read aloud">Read aloud</option>
            <option value="Repeat sentence">Repeat sentence</option>
            <option value="Describe image">Describe image</option>
            <option value="Retell lecture">Retell lecture</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Câu hỏi</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Link</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Nhận xét</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {homeworkSubmissions
                .filter(submission => submission.type === selectedHomeworkType)
                .sort((a, b) => a.questionNumber - b.questionNumber)
                .slice(0, selectedHomeworkType === 'Read aloud' || selectedHomeworkType === 'Repeat sentence' ? 20 : 5)
                .map((submission) => (
                  <tr 
                    key={`${submission.type}_${submission.questionNumber}_${submission.date}`}
                    className="hover:bg-gray-50 transition-colors duration-200"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      Câu {submission.questionNumber}
                    </td>
                    <td className="px-4 py-3">
                      {submission.link ? (
                        <a 
                          href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                          title="Click để mở link gốc"
                        >
                          {submission.link.split('https://')[0].trim() || 'Xem bài làm'}
                        </a>
                      ) : (
                        <span className="text-gray-400 text-sm">Chưa nộp bài</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {submission.feedback ? (
                        <div className="text-sm text-gray-900">{submission.feedback}</div>
                      ) : (
                        <span className="text-gray-400 text-sm">Chưa có nhận xét</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
