'use client';

import { useState, useEffect } from 'react';
import { HomeworkSubmission, getHomeworkSubmissions, getHomeworkProgress } from '@/app/firebase/services';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import HomeworkProgress from '@/app/components/HomeworkProgress';
import StudentInfo from '@/app/dashboard/admin/components/StudentInfo';
import { db } from '@/app/firebase/config';

interface Props {
  student: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    target?: string;
  };
}

export default function InlineStudentSubmissions({ student }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionDates, setSubmissionDates] = useState<{[key: string]: number}>({});
  const [editingFeedback, setEditingFeedback] = useState<{
    type: string;
    questionNumber: number;
    feedback: string;
  } | null>(null);

  // Group submissions by type
  const groupedSubmissions = submissions.reduce((acc, submission) => {
    if (!acc[submission.type]) {
      acc[submission.type] = [];
    }
    acc[submission.type].push(submission);
    return acc;
  }, {} as { [key: string]: HomeworkSubmission[] });

  // Load submission dates
  useEffect(() => {
    const loadSubmissionDates = async () => {
      try {
        const progress = await getHomeworkProgress(student.email);
        const datesMap = progress.reduce((acc: {[key: string]: number}, {date, completed}: {date: string; completed: number}) => {
          if (completed > 0) {
            acc[date] = completed;
          }
          return acc;
        }, {} as {[key: string]: number});
        setSubmissionDates(datesMap);
      } catch (error) {
        console.error('Error loading submission dates:', error);
      }
    };
    loadSubmissionDates();
  }, [student.email]);

  // Load submissions for selected date
  useEffect(() => {
    const loadSubmissions = async () => {
      setLoading(true);
      try {
        const userSubmissions = await getHomeworkSubmissions(student.email, selectedDate);
        setSubmissions(userSubmissions || []);
      } catch (error) {
        console.error('Error loading submissions:', error);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [student.email, selectedDate]);

  const handleSaveFeedback = async () => {
    if (!editingFeedback) return;

    try {
      // Replace dots with underscores in email
      const sanitizedEmail = student.email.replace(/\./g, '_');
      const docRef = doc(db, 'users', sanitizedEmail, 'homework', selectedDate);

      // Update the specific submission's feedback
      const updatedSubmissions = submissions.map(sub => {
        if (sub.type === editingFeedback.type && sub.questionNumber === editingFeedback.questionNumber) {
          return { ...sub, feedback: editingFeedback.feedback };
        }
        return sub;
      });

      await updateDoc(docRef, {
        submissions: updatedSubmissions,
        lastUpdated: new Date().toISOString()
      });

      setSubmissions(updatedSubmissions);
      setEditingFeedback(null);
    } catch (error) {
      console.error('Error saving feedback:', error);
    }
  };

  // Get current month's dates
  const currentDate = new Date(selectedDate);
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const days = Array.from({ length: lastDay.getDate() }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1);
    return date.toISOString().split('T')[0];
  });

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
        <HomeworkProgress studentId={student.email} />

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
                {Array.from({ length: firstDay.getDay() }, (_, i) => (
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
                          {typeSubmissions
                            .sort((a, b) => a.questionNumber - b.questionNumber)
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
                                <div className="flex-1">
                                  {editingFeedback?.type === submission.type && 
                                   editingFeedback?.questionNumber === submission.questionNumber ? (
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        value={editingFeedback.feedback}
                                        onChange={(e) => setEditingFeedback({
                                          ...editingFeedback,
                                          feedback: e.target.value
                                        })}
                                        className="flex-1 p-1 border rounded text-black"
                                      />
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
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-500">
                                        {submission.feedback || 'Chưa có nhận xét'}
                                      </span>
                                      <button
                                        onClick={() => setEditingFeedback({
                                          type: submission.type,
                                          questionNumber: submission.questionNumber,
                                          feedback: submission.feedback || ''
                                        })}
                                        className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                                      >
                                        Edit
                                      </button>
                                    </div>
                                  )}
                                </div>
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
