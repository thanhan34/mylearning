'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { HomeworkSubmission } from '../../../firebase/services';
import HomeworkProgress from '../../../components/HomeworkProgress';
import StudentInfo from './StudentInfo';
import { convertUrlsToLinks } from '@/app/utils/textFormatting';

interface StudentSubmissionsProps {
  selectedStudentId: string;
  selectedStudentEmail: string;
}

const StudentSubmissions = ({ selectedStudentId, selectedStudentEmail }: StudentSubmissionsProps) => {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Group submissions by type
  const groupedSubmissions = submissions.reduce((acc, submission) => {
    if (!acc[submission.type]) {
      acc[submission.type] = [];
    }
    acc[submission.type].push(submission);
    return acc;
  }, {} as { [key: string]: HomeworkSubmission[] });

  // Fetch dates when component mounts or student changes
  useEffect(() => {
    const fetchDates = async () => {
      setLoading(true);
      try {
        const email = selectedStudentEmail.replace(/\./g, '_');
        const homeworkRef = collection(db, 'users', email, 'homework');
        const querySnapshot = await getDocs(homeworkRef);
        const datesList = querySnapshot.docs.map(doc => doc.id);
        setDates(datesList.sort().reverse()); // Sort dates in descending order
        setSelectedDate(datesList[0] || ''); // Select the most recent date
      } catch (error) {
        console.error('Error fetching dates:', error);
      }
      setLoading(false);
    };

    fetchDates();
  }, [selectedStudentEmail]);

  // Fetch submissions for selected date
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedDate) return;
      
      setLoading(true);
      try {
        const email = selectedStudentEmail.replace(/\./g, '_');
        const homeworkDoc = doc(db, 'users', email, 'homework', selectedDate);
        const docSnap = await getDoc(homeworkDoc);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSubmissions(data.submissions || []);
        } else {
          setSubmissions([]);
        }
      } catch (error) {
        console.error('Error fetching submissions:', error);
      }
      setLoading(false);
    };

    fetchSubmissions();
  }, [selectedStudentEmail, selectedDate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-[#fc5d01]">Bài tập về nhà</h2>
      
      <div className="space-y-6">
          {/* Student Info */}
          <StudentInfo studentEmail={selectedStudentEmail} />
          
          {/* Homework Progress Chart */}
          <HomeworkProgress email={selectedStudentEmail} />

          {/* Date Selection */}
          {dates.length > 0 && (
            <div className="mb-6">
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
              >
                {dates.map((date) => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString('vi-VN')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Submissions List */}
          {selectedDate && (
            <div className="space-y-8">
              {Object.entries(groupedSubmissions).length === 0 ? (
                <p className="text-gray-500 text-center py-8">Chưa có bài tập nào được nộp</p>
              ) : (
                Object.entries(groupedSubmissions).map(([type, typeSubmissions]) => (
                  <div key={type} className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-4 bg-[#fc5d01] text-white font-semibold">
                      {type}
                    </div>
                    <div className="p-4">
                      <div className="space-y-6">
                        {typeSubmissions
                          .filter(submission => submission.link) // Only show submissions with links
                          .sort((a, b) => a.questionNumber - b.questionNumber)
                          .map((submission) => (
                            <div key={`${submission.type}_${submission.questionNumber}_${selectedDate}`} className="border-b border-gray-100 pb-4">
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
                              
                              {submission.feedback && (
                                <div className="ml-4 text-left">
                                  <span className="text-[#fc5d01] font-medium">Feedback: </span>
                                  <span className="text-gray-700 break-words">
                                    {convertUrlsToLinks(submission.feedback)}
                                  </span>
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
  );
};

export default StudentSubmissions;
