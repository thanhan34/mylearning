'use client';

import { useState, useEffect } from 'react';
import { collection, query, getDocs, where, doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { HomeworkSubmission } from '../../../firebase/services';
import HomeworkProgress from '../../../components/HomeworkProgress';

interface Student {
  id: string;
  name: string;
  email: string;
}

const StudentSubmissions = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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

  // Fetch all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'student'));
        const querySnapshot = await getDocs(q);
        const studentsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Student[];
        setStudents(studentsList);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
      setLoading(false);
    };

    fetchStudents();
  }, []);

  // Fetch dates when student is selected
  useEffect(() => {
    const fetchDates = async () => {
      if (!selectedStudent) return;
      
      setLoading(true);
      try {
        const email = selectedStudent.email.replace(/\./g, '_');
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
  }, [selectedStudent]);

  // Fetch submissions for selected date
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedStudent || !selectedDate) return;
      
      setLoading(true);
      try {
        const email = selectedStudent.email.replace(/\./g, '_');
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
  }, [selectedStudent, selectedDate]);

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
      
      {/* Student Selection */}
      <div className="mb-6">
        <select
          value={selectedStudent?.id || ''}
          onChange={(e) => {
            const student = students.find(s => s.id === e.target.value);
            setSelectedStudent(student || null);
          }}
          className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fc5d01] text-black"
        >
          <option value="">Chọn học viên</option>
          {students.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name} ({student.email})
            </option>
          ))}
        </select>
      </div>

      {selectedStudent && (
        <div className="space-y-6">
          {/* Homework Progress Chart */}
          <HomeworkProgress studentId={selectedStudent.email.replace(/\./g, '_')} />

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
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 text-gray-600">Câu số</th>
                            <th className="text-left py-2 text-gray-600">Link bài làm</th>
                            <th className="text-left py-2 text-gray-600">Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {typeSubmissions
                            .sort((a, b) => a.questionNumber - b.questionNumber)
                            .map((submission) => (
                              <tr key={`${submission.type}_${submission.questionNumber}_${selectedDate}`} className="border-b">
                                <td className="py-2 w-24 text-black">{submission.questionNumber}</td>
                                <td className="py-2">
                                  {submission.link ? (
                                    <a
                                      href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-black hover:text-[#fd7f33] break-all"
                                      title="Click để mở link gốc"
                                    >
                                      {submission.link.split('https://')[0].trim()}
                                    </a>
                                  ) : (
                                    <span className="text-gray-400">No submission yet</span>
                                  )}
                                </td>
                                <td className="py-2">
                                  {submission.feedback ? (
                                    <span className="text-gray-700">{submission.feedback}</span>
                                  ) : (
                                    <span className="text-gray-400">No submission yet</span>
                                  )}
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
      )}
    </div>
  );
};

export default StudentSubmissions;
