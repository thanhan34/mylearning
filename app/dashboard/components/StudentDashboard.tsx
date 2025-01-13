'use client';

import { Line } from 'react-chartjs-2';
import { HomeworkSubmission } from '@/app/firebase/services';
import DailyHome from './DailyHome';
import DailyTargetTable from './DailyTargetTable';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  homeworkSubmissions: HomeworkSubmission[];
  onDateChange: (date: string) => void;
}

export default function StudentDashboard({
  homeworkProgressData,
  selectedDate,
  homeworkSubmissions,
  onDateChange,
}: StudentDashboardProps) {
  const router = useRouter();

  // Check if we have data
  const hasData = homeworkProgressData.datasets[0].data.length > 0;
  const hasSubmissions = homeworkSubmissions.length > 0;

  // Create a map of dates with submissions
  const submissionDates = homeworkProgressData.labels.reduce((acc: { [key: string]: number }, date, index) => {
    const count = homeworkProgressData.datasets[0].data[index];
    if (count > 0) {
      acc[date] = count;
    }
    return acc;
  }, {});

  const handleDateChange = (date: string) => {
    onDateChange(date);
  };

  // Get current month's dates
  const currentDate = new Date(selectedDate);
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const days = Array.from({ length: lastDay.getDate() }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return date.toISOString().split('T')[0];
  });

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

        <div className="flex gap-8">
          {/* Calendar View */}
          <div className="w-[280px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#fc5d01] font-medium">
                {currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const prevMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
                    handleDateChange(prevMonth.toISOString().split('T')[0]);
                  }}
                  className="p-1 rounded hover:bg-[#fedac2] text-[#fc5d01]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    const nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
                    handleDateChange(nextMonth.toISOString().split('T')[0]);
                  }}
                  className="p-1 rounded hover:bg-[#fedac2] text-[#fc5d01]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-200">
                {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay.getDay() }, (_, i) => (
                  <div key={`empty-${i}`} className="border-b border-r border-gray-200 aspect-square" />
                ))}
                {days.map(date => {
                  const hasSubmission = submissionDates[date];
                  return (
                    <button
                      key={date}
                      onClick={() => hasSubmission && handleDateChange(date)}
                      className={`border-b border-r border-gray-200 aspect-square relative transition-colors ${
                        hasSubmission
                          ? selectedDate === date
                            ? 'bg-[#fc5d01] text-white hover:bg-[#fd7f33]'
                            : 'hover:bg-[#fedac2]'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="absolute top-1 left-1 text-xs">
                        {new Date(date).getDate()}
                      </span>
                      {hasSubmission && (
                        <span className="absolute bottom-1 right-1 flex gap-0.5">
                          {Array.from({ length: Math.min(submissionDates[date], 3) }).map((_, i) => (
                            <span 
                              key={i} 
                              className={`w-1 h-1 rounded-full ${
                                selectedDate === date ? 'bg-white' : 'bg-[#fc5d01]'
                              }`} 
                            />
                          ))}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="flex-1">
            {selectedDate && submissionDates[selectedDate] > 0 && (
              <div className="space-y-4">
                {Object.entries(
                  homeworkSubmissions.reduce((acc: { [key: string]: HomeworkSubmission[] }, submission: HomeworkSubmission) => {
                    if (!acc[submission.type]) {
                      acc[submission.type] = [];
                    }
                    acc[submission.type].push(submission);
                    return acc;
                  }, {} as { [key: string]: HomeworkSubmission[] })
                ).map(([type, typeSubmissions]) => (
                  <div key={type} className="border border-[#fedac2] rounded-lg overflow-hidden">
                    <div className="bg-[#fedac2] px-4 py-2">
                      <h4 className="text-[#fc5d01] font-medium">{type}</h4>
                    </div>
                    <div className="p-4">
                      <div className="grid gap-2">
                        {typeSubmissions
                          .sort((a, b) => a.questionNumber - b.questionNumber)
                          .slice(0, type === 'Read aloud' || type === 'Repeat sentence' ? 20 : 5)
                          .map((submission) => (
                            <div key={`${submission.type}_${submission.questionNumber}`} className="flex items-center gap-4">
                              <div className="w-16 text-sm">Câu {submission.questionNumber}</div>
                              <div className="flex-1">
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
                              </div>
                              <div className="text-sm text-gray-500">
                                {submission.feedback || 'Chưa có nhận xét'}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
