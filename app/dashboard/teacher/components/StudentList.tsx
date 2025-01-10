'use client';

import { useState, useEffect } from 'react';
import { User } from '../../../../types/admin';
import { AssignmentSubmission } from '../../../../types/submission';
import { db } from '../../../../app/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, CollectionReference, DocumentData } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import HomeworkProgress from '../../../components/HomeworkProgress';

interface SubmissionWithId extends AssignmentSubmission {
  uniqueId: string;
}

const StudentList = () => {
  const { data: session } = useSession();
  const [students, setStudents] = useState<User[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithId[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [editingSubmission, setEditingSubmission] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState<string>('');
  
  const homeworkTypes = [
    { value: 'Read aloud', label: 'Reading Aloud' },
    { value: 'Repeat sentence', label: 'Repeat Sentence' },
    { value: 'Describe image', label: 'Describe Image' },
    { value: 'Retell lecture', label: 'Retell Lecture' }
  ];

  useEffect(() => {
    if (session?.user?.email) {
      fetchAssignedStudents();
    }
  }, [session]);

  const fetchAssignedStudents = async () => {
    try {
      // First get the teacher's document
      const teachersQuery = query(
        collection(db, 'users'),
        where('email', '==', session?.user?.email)
      );
      const teacherSnapshot = await getDocs(teachersQuery);
      if (!teacherSnapshot.empty) {
        const teacherDoc = teacherSnapshot.docs[0];

        // Get assigned students
        const assignedStudentsQuery = query(
          collection(db, 'users'),
          where('teacherId', '==', teacherDoc.id)
        );
        const assignedStudentsSnapshot = await getDocs(assignedStudentsQuery);
        const assignedStudentsData = assignedStudentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as User));
        setStudents(assignedStudentsData);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchStudentSubmissions = async (student: User) => {
    try {
      // Format email for path (replace . with _)
      const emailPath = student.email.replace(/\./g, '_');
      
      // Get the specific date document from homework collection
      const dateDoc = doc(db, 'users', emailPath, 'homework', selectedDate);
      const docSnapshot = await getDoc(dateDoc);
      
      let submissionsData: SubmissionWithId[] = [];
      
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        if (Array.isArray(data.submissions)) {
          // Filter out submissions with empty links and add unique IDs
          submissionsData = data.submissions
            .filter((submission: AssignmentSubmission) => submission.link && submission.link.trim() !== '')
            .map((submission: AssignmentSubmission) => ({
              ...submission,
              uniqueId: `${submission.type}_${submission.questionNumber}_${submission.date}` // Create unique ID from type, question number and date
            }));
          
          // Filter by type if selected
          if (selectedType) {
            submissionsData = submissionsData.filter(
              (submission: AssignmentSubmission) => submission.type === selectedType
            );
          }
        }
      }
      
      setSubmissions(submissionsData);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentSubmissions(selectedStudent);
    }
  }, [selectedDate, selectedType, selectedStudent]);

  const handleStudentClick = (student: User) => {
    setSelectedStudent(student);
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[#fc5d01] mb-6">Danh sách học viên</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-[#fc5d01] mb-4">Học viên của bạn</h3>
          <div className="space-y-2">
            {students.map((student) => (
              <div
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedStudent?.id === student.id
                    ? 'bg-[#fedac2]'
                    : 'hover:bg-[#ffac7b]'
                }`}
              >
                <p className="font-medium text-black">{student.name}</p>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        <div className="md:col-span-2">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Homework Progress Chart */}
              <HomeworkProgress studentId={selectedStudent.email.replace(/\./g, '_')} />

              {/* Submissions */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-[#fc5d01]">
                    Bài nộp của {selectedStudent.name}
                  </h3>
                  <div className="flex space-x-4">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-black"
                    />
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-black"
                    >
                      <option value="">Tất cả</option>
                      {homeworkTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {submissions.length > 0 ? (
                  <div className="space-y-4">
                    {submissions.map((submission) => (
                      <div
                        key={submission.uniqueId}
                        className="border rounded-lg p-4 hover:border-[#fc5d01] transition-colors"
                      >
                        <div className="mb-2">
                          <p className="font-medium text-black">{submission.type}</p>
                          <p className="text-sm text-gray-600">
                            Ngày: {new Date(submission.date).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                        <p className="text-sm mb-2">
                          <span className="font-medium text-black">Link:</span>{' '}
                          <a
                            href={submission.link.match(/https:\/\/www\.apeuni\.com\/practice\/answer_item\?[^\s]+/)?.[0] || submission.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#fc5d01] hover:text-[#fd7f33]"
                            title="Click để mở link gốc"
                          >
                            {submission.link.split('https://')[0].trim()}
                          </a>
                        </p>
                        {submission.notes && (
                          <p className="text-sm">
                            <span className="font-medium text-black">Ghi chú:</span>{' '}
                            <span className="text-gray-600">{submission.notes}</span>
                          </p>
                        )}
                        <div className="mt-2 border-t pt-2">
                          {editingSubmission === submission.uniqueId ? (
                            <div className="space-y-2">
                              <textarea
                                value={feedbackText}
                                onChange={(e) => setFeedbackText(e.target.value)}
                                className="w-full p-2 border rounded-lg text-black"
                                placeholder="Nhập feedback..."
                                rows={2}
                              />
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => {
                                    setEditingSubmission(null);
                                    setFeedbackText('');
                                  }}
                                  className="px-3 py-1 text-sm bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                  Hủy
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      const emailPath = selectedStudent.email.replace(/\./g, '_');
                                      const dateDoc = doc(db, 'users', emailPath, 'homework', selectedDate);
                                      const docSnapshot = await getDoc(dateDoc);
                                      
                                      if (docSnapshot.exists()) {
                                        const data = docSnapshot.data();
                                        const updatedSubmissions = data.submissions.map((s: AssignmentSubmission) => {
                                          if (s.type === submission.type && 
                                              s.questionNumber === submission.questionNumber && 
                                              s.date === submission.date) {
                                            return { ...s, feedback: feedbackText };
                                          }
                                          return s;
                                        });
                                        
                                        await updateDoc(dateDoc, {
                                          submissions: updatedSubmissions
                                        });
                                        
                                        // Refresh submissions
                                        fetchStudentSubmissions(selectedStudent);
                                        setEditingSubmission(null);
                                        setFeedbackText('');
                                      }
                                    } catch (error) {
                                      console.error('Error updating feedback:', error);
                                    }
                                  }}
                                  className="px-3 py-1 text-sm bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33]"
                                >
                                  Lưu
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-black">Feedback:</span>{' '}
                                <span className="text-gray-600">{submission.feedback || 'Chưa có feedback'}</span>
                              </div>
                              <button
                                onClick={() => {
                                  setEditingSubmission(submission.uniqueId);
                                  setFeedbackText(submission.feedback || '');
                                }}
                                className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                              >
                                Chỉnh sửa
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">Chưa có bài nộp nào.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-gray-500">Chọn một học viên để xem bài nộp.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentList;
