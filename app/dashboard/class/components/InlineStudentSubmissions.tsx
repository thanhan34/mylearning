'use client';

import { useState, useEffect } from 'react';
import { HomeworkSubmission, getHomeworkSubmissions } from '@/app/firebase/services';
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
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-gray-600">Question</th>
                          <th className="text-left py-2 text-gray-600">Link</th>
                          <th className="text-left py-2 text-gray-600">Feedback</th>
                          <th className="text-left py-2 text-gray-600">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeSubmissions
                          .sort((a, b) => a.questionNumber - b.questionNumber)
                          .map((submission) => (
                            <tr key={`${submission.type}_${submission.questionNumber}`} className="border-b">
                              <td className="py-2 w-24 text-black">{submission.questionNumber}</td>
                              <td className="py-2">
                                {submission.link ? (
                                  <a
                                    href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-black hover:text-[#fd7f33] break-all"
                                    title="Click to open original link"
                                  >
                                    {submission.link.split('https://')[0].trim()}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">No submission</span>
                                )}
                              </td>
                              <td className="py-2">
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
                                  <span className="text-gray-700">
                                    {submission.feedback || 'No feedback yet'}
                                  </span>
                                )}
                              </td>
                              <td className="py-2">
                                {editingFeedback?.type !== submission.type ||
                                 editingFeedback?.questionNumber !== submission.questionNumber ? (
                                  <button
                                    onClick={() => setEditingFeedback({
                                      type: submission.type,
                                      questionNumber: submission.questionNumber,
                                      feedback: submission.feedback || ''
                                    })}
                                    className="text-[#fc5d01] hover:text-[#fd7f33]"
                                  >
                                    Edit Feedback
                                  </button>
                                ) : null}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
