'use client';

import { useState, useEffect } from 'react';
import { getHomeworkSubmissions, getHomeworkProgress, updateHomeworkFeedback } from '@/app/firebase/services';
import type { HomeworkSubmission } from '@/app/firebase/services/types';
import StudentInfo from '@/app/dashboard/admin/components/StudentInfo';
import ProgressChart from '@/app/dashboard/components/ProgressChart';
import { format, startOfMonth, getDay, getDaysInMonth } from 'date-fns';
import { convertUrlsToLinks } from '@/app/utils/textFormatting';

interface Props {
  student: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    target?: string;
  };
}

interface EditingFeedback {
  type: string;
  questionNumber: number;
  feedback: string;
}

export default function InlineStudentSubmissions({ student }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionDates, setSubmissionDates] = useState<{[key: string]: number}>({});
  const [editingFeedback, setEditingFeedback] = useState<EditingFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [homeworkProgressData, setHomeworkProgressData] = useState<{
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor: string;
      tension: number;
    }[];
  }>({
    labels: [],
    datasets: [{
      label: 'Tiến độ bài tập',
      data: [],
      borderColor: '#fc5d01',
      tension: 0.4
    }]
  });

  // Group submissions by type
  const groupedSubmissions = submissions.reduce((acc, submission) => {
    if (!acc[submission.type]) {
      acc[submission.type] = [];
    }
    acc[submission.type].push(submission);
    return acc;
  }, {} as { [key: string]: HomeworkSubmission[] });

  // Load homework progress
  useEffect(() => {
    const loadHomeworkProgress = async () => {
      try {
        setError(null);
        
        const progressData = await getHomeworkProgress(student.id);
        

        if (!progressData.length) {
          console.log('No progress data found');
          return;
        }

        // Sort progress data by date
        const sortedData = [...progressData].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        

        // Update submission dates for calendar
        const datesMap = sortedData.reduce((acc: {[key: string]: number}, {date, completed}) => {
          if (completed > 0) {
            acc[date] = completed;
          }
          return acc;
        }, {});
        setSubmissionDates(datesMap);

        // Update chart data
        const labels = sortedData.map(d => {
          const date = new Date(d.date);
          return date.toLocaleDateString('vi-VN', { 
            month: 'numeric', 
            day: 'numeric' 
          });
        });
        const data = sortedData.map(d => d.completed);
        
        

        setHomeworkProgressData({
          labels,
          datasets: [{
            label: 'Tiến độ bài tập',
            data,
            borderColor: '#fc5d01',
            tension: 0.4
          }]
        });
      } catch (error) {
        console.error('Error loading homework progress:', error);
        setError('Failed to load progress data');
      }
    };

    if (student.id) {
      loadHomeworkProgress();
      const intervalId = setInterval(loadHomeworkProgress, 60000);
      return () => clearInterval(intervalId);
    }
  }, [student.id]);

  // Load submissions for selected date
  useEffect(() => {
    const loadSubmissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const userSubmissions = await getHomeworkSubmissions(student.id, selectedDate);
        
        setSubmissions(userSubmissions || []);
      } catch (error) {
        console.error('Error loading submissions:', error);
        setError('Failed to load submissions');
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [student.id, selectedDate]);

  const handleSaveFeedback = async () => {
    if (!editingFeedback) return;

    try {
      // Use the updateHomeworkFeedback function
      const success = await updateHomeworkFeedback(
        student.name,
        selectedDate,
        editingFeedback.type,
        editingFeedback.questionNumber,
        editingFeedback.feedback
      );

      if (success) {
        // Update local state to reflect the changes
        const updatedSubmissions = submissions.map(sub => {
          if (sub.type === editingFeedback.type && sub.questionNumber === editingFeedback.questionNumber) {
            return { ...sub, feedback: editingFeedback.feedback };
          }
          return sub;
        });
        
        setSubmissions(updatedSubmissions);
        setEditingFeedback(null);
      } else {
        console.error('Failed to update feedback');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  // Get current month's dates using date-fns
  const currentDate = new Date(selectedDate);
  const daysInMonth = getDaysInMonth(currentDate);
  
  // Function to format a date as YYYY-MM-DD
  const formatDate = (year: number, month: number, day: number) => {
    const date = new Date(year, month, day);
    return format(date, 'yyyy-MM-dd');
  };
  
  // Generate dates for the current month
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    return formatDate(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
  });
  
  // Calculate the first day of the month using date-fns
  const firstDayOfMonth = startOfMonth(currentDate);

  return (
    <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
      <div className="space-y-6">
        {/* Student Info */}
        <div>
          <StudentInfo 
            student={student} 
            key={`${student.id}-${student.avatar}`} // Force re-render on avatar change
          />
        </div>
        
        {/* Homework Progress Chart */}
        <ProgressChart data={homeworkProgressData} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Calendar and Submissions */}
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
                    setSelectedDate(prevMonth.toISOString().split('T')[0]);
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
                    setSelectedDate(nextMonth.toISOString().split('T')[0]);
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
                {Array.from({ length: getDay(firstDayOfMonth) }, (_, i) => (
                  <div key={`empty-${i}`} className="border-b border-r border-gray-200 aspect-square" />
                ))}
                {days.map(date => {
                  const hasSubmission = submissionDates[date];
                  return (
                    <button
                      key={date}
                      onClick={() => hasSubmission && setSelectedDate(date)}
                      className={`border-b border-r border-gray-200 aspect-square relative transition-colors ${
                        hasSubmission
                          ? selectedDate === date
                            ? 'bg-[#fc5d01] text-white hover:bg-[#fd7f33]'
                            : 'hover:bg-[#fedac2]'
                          : 'text-gray-400'
                      }`}
                    >
                      <span className="absolute top-1 left-1 text-xs">
                        {parseInt(date.split('-')[2], 10)}
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
            {loading ? (
              <div className="flex justify-center items-center p-4">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedSubmissions).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No submissions found for this date</p>
                ) : (
                  Object.entries(groupedSubmissions).map(([type, typeSubmissions]) => (
                    <div key={type} className="border border-[#fedac2] rounded-lg overflow-hidden">
                      <div className="bg-[#fedac2] px-4 py-2">
                        <h4 className="text-[#fc5d01] font-medium">{type}</h4>
                      </div>
                      <div className="p-4">
                        <div className="grid gap-2">
                          {(typeSubmissions as HomeworkSubmission[])
                            .filter(submission => submission.link) // Only show submissions with links
                            .sort((a, b) => a.questionNumber - b.questionNumber)
                            .map((submission) => (
                              <div key={`${submission.type}_${submission.questionNumber}`} className="border-b border-gray-100 pb-4 mb-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="font-medium">Câu {submission.questionNumber}</div>
                                  <div className="text-[#fc5d01]">
                                    {submission.link ? (
                                      <a
                                        href={submission.link.match(/https:\/\/www\.apeuni\.com\/(en\/)?practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#fc5d01] hover:text-[#fd7f33]"
                                        title="Click để mở link gốc"
                                      >
                                        {submission.link.split('https://')[0].trim() || 'Xem bài làm'}
                                      </a>
                                    ) : (
                                      <span>Chưa nộp bài</span>
                                    )}
                                  </div>
                                </div>
                                
                                {editingFeedback?.type === submission.type && 
                                 editingFeedback?.questionNumber === submission.questionNumber ? (
                                  <div className="ml-4 mt-2">
                                    <div className="flex items-start gap-2">
                                      <span className="text-[#fc5d01] font-medium whitespace-nowrap mt-1">Feedback: </span>
                                      <div className="flex-1 flex gap-2">
                                        <textarea
                                          value={editingFeedback.feedback}
                                          onChange={(e) => setEditingFeedback({
                                            type: editingFeedback.type,
                                            questionNumber: editingFeedback.questionNumber,
                                            feedback: e.target.value
                                          })}
                                          className="flex-1 p-2 border rounded text-black min-h-[80px] w-full"
                                          placeholder="Enter feedback here..."
                                        />
                                        <div className="flex gap-1">
                                          <button
                                            onClick={handleSaveFeedback}
                                            className="px-2 py-1 bg-[#fc5d01] text-white rounded hover:bg-[#fd7f33]"
                                          >
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingFeedback(null)}
                                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="ml-4 flex justify-between items-start">
                                    <div className="text-left">
                                      <span className="text-[#fc5d01] font-medium">Feedback: </span>
                                      <span className="text-gray-700 break-words">
                                        {submission.feedback ? 
                                          convertUrlsToLinks(submission.feedback) : 
                                          'Chưa có nhận xét'
                                        }
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => setEditingFeedback({
                                        type: submission.type,
                                        questionNumber: submission.questionNumber,
                                        feedback: submission.feedback || ''
                                      })}
                                      className="text-[#fc5d01] hover:text-[#fd7f33] text-sm ml-2"
                                    >
                                      Edit
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
