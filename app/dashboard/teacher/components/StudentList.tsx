'use client';

import { useState, useEffect } from 'react';
import { User } from '@/app/firebase/services/user';
import { getHomeworkSubmissions } from '@/app/firebase/services';
import type { HomeworkSubmission } from '@/app/firebase/services/types';
import { db } from '../../../../app/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import HomeworkProgress from '../../../components/HomeworkProgress';

import { SubmissionWithId } from '@/app/firebase/services/types';

interface ExtendedUser extends User {
  passed?: boolean;
}

const StudentList = () => {
  const { data: session } = useSession();
  const [students, setStudents] = useState<ExtendedUser[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<ExtendedUser[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<ExtendedUser | null>(null);
  const [hidePassedStudents, setHidePassedStudents] = useState(false);
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
        
        // Filter out students from completed classes and add passed status
        const activeStudents = [];
        
        for (const student of assignedStudentsData) {
          // Add passed status if it exists, default to false
          const extendedStudent: ExtendedUser = {
            ...student,
            passed: student.passed || false
          };
          
          if (student.classId) {
            // Check if the student's class is not completed
            const classRef = doc(db, 'classes', student.classId);
            const classDoc = await getDoc(classRef);
            
            if (classDoc.exists()) {
              const classData = classDoc.data();
              if (classData.status !== 'completed') {
                activeStudents.push(extendedStudent);
              }
            } else {
              // If class doesn't exist, still include the student
              activeStudents.push(extendedStudent);
            }
          } else {
            // If student doesn't have a class, include them
            activeStudents.push(extendedStudent);
          }
        }
        
        setStudents(activeStudents);
        applyPassedFilter(activeStudents);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Apply filter based on hidePassedStudents state
  const applyPassedFilter = (studentsList: ExtendedUser[]) => {
    if (hidePassedStudents) {
      setFilteredStudents(studentsList.filter(student => !student.passed));
    } else {
      setFilteredStudents(studentsList);
    }
  };
  
  // Update filtered students when hidePassedStudents changes
  useEffect(() => {
    applyPassedFilter(students);
  }, [hidePassedStudents, students]);

  const fetchStudentSubmissions = async (student: ExtendedUser) => {
    try {
      const userSubmissions = await getHomeworkSubmissions(student.email, selectedDate);
      
      let submissionsData: SubmissionWithId[] = [];
      
      if (userSubmissions) {
        // Filter out submissions with empty links and add unique IDs
        submissionsData = userSubmissions
          .filter(submission => submission.link && submission.link.trim() !== '')
          .map(submission => ({
            ...submission,
            uniqueId: `${submission.type}_${submission.questionNumber}_${submission.date}` // Create unique ID from type, question number and date
          }));
        
        // Filter by type if selected
        if (selectedType) {
          submissionsData = submissionsData.filter(
            submission => submission.type === selectedType
          );
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

  const handleStudentClick = (student: ExtendedUser) => {
    setSelectedStudent(student);
  };

  // Toggle student passed status
  const toggleStudentPassedStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      // Update in Firestore
      const studentRef = doc(db, 'users', studentId);
      await updateDoc(studentRef, {
        passed: !currentStatus
      });
      
      // Update local state
      const updatedStudents = students.map(s => 
        s.id === studentId ? {...s, passed: !currentStatus} : s
      );
      
      setStudents(updatedStudents);
      
      // If the selected student is being updated, update that too
      if (selectedStudent && selectedStudent.id === studentId) {
        setSelectedStudent({...selectedStudent, passed: !currentStatus});
      }
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[#fc5d01]">Danh sách học viên</h2>
        <div className="flex items-center">
          <label htmlFor="hidePassedStudents" className="mr-2 text-sm font-medium">
            Ẩn học viên đã pass
          </label>
          <button 
            onClick={() => setHidePassedStudents(!hidePassedStudents)}
            className="relative inline-block w-10 mr-2 align-middle select-none"
          >
            <input
              type="checkbox"
              id="hidePassedStudents"
              checked={hidePassedStudents}
              onChange={() => {}}
              className="sr-only"
            />
            <div className={`block h-6 rounded-full w-10 ${hidePassedStudents ? 'bg-[#fc5d01]' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${hidePassedStudents ? 'transform translate-x-4' : ''}`}></div>
          </button>
          <span className="text-sm text-gray-600">
            {hidePassedStudents 
              ? `Đang ẩn ${students.filter(s => s.passed).length} học viên đã pass` 
              : `Hiển thị tất cả học viên (${students.filter(s => s.passed).length} đã pass)`}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Students List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-medium text-[#fc5d01] mb-4">Học viên của bạn</h3>
          <div className="space-y-2">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                onClick={() => handleStudentClick(student)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedStudent?.id === student.id
                    ? 'bg-[#fedac2]'
                    : 'hover:bg-[#ffac7b]'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-black">{student.name}</p>
                    <p className="text-sm text-gray-600">{student.email}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStudentPassedStatus(student.id, student.passed || false);
                    }}
                    className={`px-2 py-1 text-xs rounded-full ${
                      student.passed 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {student.passed ? 'Đã pass' : 'Chưa pass'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submissions List */}
        <div className="md:col-span-2">
          {selectedStudent ? (
            <div className="space-y-6">
              {/* Homework Progress Chart */}
              <HomeworkProgress email={selectedStudent.email} />

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
                                      const dateDoc = doc(db, 'homework', emailPath, selectedDate);
                                      const docSnapshot = await getDoc(dateDoc);
                                      
                                      if (docSnapshot.exists()) {
                                        const data = docSnapshot.data();
                                        const updatedSubmissions = data.submissions.map((s: HomeworkSubmission) => {
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
