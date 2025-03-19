'use client';

import { useState, useEffect } from 'react';
import { getHomeworkSubmissions } from '@/app/firebase/services';
import type { HomeworkSubmission } from '@/app/firebase/services/types';
import HomeworkProgress from '@/app/components/HomeworkProgress';
import { convertUrlsToLinks } from '@/app/utils/textFormatting';

interface Props {
  student: {
    id: string;
    email: string;
    name: string;
  };
  onClose: () => void;
}

export default function StudentSubmissionsView({ student, onClose }: Props) {
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Group submissions by type
  const groupedSubmissions = submissions.reduce((acc, submission) => {
    if (!acc[submission.type]) {
      acc[submission.type] = [];
    }
    acc[submission.type].push(submission);
    return acc;
  }, {} as { [key: string]: HomeworkSubmission[] });

  useEffect(() => {
    const loadSubmissions = async () => {
      setLoading(true);
      try {
        const userSubmissions = await getHomeworkSubmissions(student.email, selectedDate);
        setSubmissions(userSubmissions || []);
      } catch (error) {
        console.error('Error loading submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [student.email, selectedDate]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-[#fc5d01]">
            {student.name}&apos;s Submissions
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Homework Progress Chart */}
          <HomeworkProgress email={student.email} />

          {/* Date Selection */}
          <div className="mb-6">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
            />
          </div>

          {/* Submissions List */}
          {loading ? (
            <div className="flex justify-center items-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedSubmissions).length === 0 ? (
                <p className="text-gray-500 text-center py-8">No submissions found for this date</p>
              ) : (
                Object.entries(groupedSubmissions).map(([type, typeSubmissions]) => (
                  <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-[#fc5d01] text-white font-semibold">
                      {type}
                    </div>
                    <div className="p-4">
                      <div className="space-y-6">
                        {(typeSubmissions as HomeworkSubmission[])
                          .sort((a, b) => a.questionNumber - b.questionNumber)
                          .map((submission) => (
                            <div key={`${submission.type}_${submission.questionNumber}`} className="border-b border-gray-100 pb-4">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="font-medium">Câu {submission.questionNumber}</div>
                                <div className="text-[#fc5d01]">
                                  {submission.link ? (
                                    <a
                                      href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[#fc5d01] hover:text-[#fd7f33]"
                                      title="Click to open original link"
                                    >
                                      RA#{submission.questionNumber} APEUni RA EN V2e AI Score 66/90
                                    </a>
                                  ) : (
                                    <span>No submission</span>
                                  )}
                                </div>
                              </div>
                              
                              {submission.feedback ? (
                                <div className="ml-4 text-left">
                                  <span className="text-[#fc5d01] font-medium">Feedback: </span>
                                  <span className="text-gray-700 break-words">
                                    {convertUrlsToLinks(submission.feedback)}
                                  </span>
                                </div>
                              ) : (
                                <div className="ml-4 text-left text-gray-400">
                                  No feedback yet
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
  );
}
