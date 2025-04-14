'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getTeacherClasses } from '@/app/firebase/services/class';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import FeedbackDetailsModal from '@/app/dashboard/admin/components/feedback/FeedbackDetailsModal';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import { format } from 'date-fns';

interface Class {
  id: string;
  name: string;
  teacherId: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

interface HomeworkData {
  id: string;
  userId: string;
  userName: string;
  date: string;
  timestamp: any;
  submissions: HomeworkSubmission[];
  feedbackCount?: number;
  totalCount?: number;
}

export default function TeacherFeedbackClient() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch teacher's classes
  useEffect(() => {
    const fetchClasses = async () => {
      if (session?.user?.email) {
        try {
          const teacherClasses = await getTeacherClasses(session.user.email);
          setClasses(teacherClasses);
        } catch (error) {
          console.error('Error fetching classes:', error);
        }
      }
    };

    fetchClasses();
  }, [session]);

  // Fetch homework submissions for selected class
  useEffect(() => {
    const fetchHomeworkSubmissions = async () => {
      if (!selectedClass) return;

      setLoading(true);
      try {
        // Get all student IDs from the selected class
        const studentIds = selectedClass.students.map(student => student.id);
        console.log('Fetching homework for students:', studentIds);
        
        if (studentIds.length === 0) {
          console.log('No students in class');
          setHomeworkSubmissions([]);
          setLoading(false);
          return;
        }
        
        // Firestore has a limit of 10 values in an 'in' query
        // So we need to batch the queries if there are more than 10 students
        const submissions: HomeworkData[] = [];
        const batchSize = 10;
        
        for (let i = 0; i < studentIds.length; i += batchSize) {
          const batchIds = studentIds.slice(i, i + batchSize);
          console.log(`Processing batch ${i / batchSize + 1}, students:`, batchIds);
          
          // Fetch homework submissions for this batch of students
          const submissionsRef = collection(db, 'homework');
          const q = query(
            submissionsRef,
            where('userId', 'in', batchIds)
          );
          
          const querySnapshot = await getDocs(q);
          console.log(`Batch ${i / batchSize + 1} results:`, querySnapshot.size);
          
          querySnapshot.forEach(doc => {
            const data = doc.data() as HomeworkData;
            
            // Calculate feedback stats
            const totalCount = data.submissions?.length || 0;
            const feedbackCount = data.submissions?.filter(sub => 
              sub.feedback && sub.feedback.trim() !== ''
            ).length || 0;
            
            // Only include submissions that need feedback (not all submissions have feedback)
            if (feedbackCount < totalCount) {
              submissions.push({
                ...data,
                id: doc.id,
                feedbackCount,
                totalCount
              });
            }
          });
        }
        
        // Sort submissions by date (most recent first)
        submissions.sort((a, b) => {
          if (!a.timestamp || !b.timestamp) return 0;
          return b.timestamp.seconds - a.timestamp.seconds;
        });
        
        console.log('Total submissions found:', submissions.length);
        setHomeworkSubmissions(submissions);
      } catch (error) {
        console.error('Error fetching homework submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHomeworkSubmissions();
  }, [selectedClass]);

  const handleViewDetails = (submission: HomeworkData) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
    
    // Refresh the submissions list after providing feedback
    if (selectedClass) {
      // Trigger a refetch by setting selectedClass again
      const currentClass = selectedClass;
      setSelectedClass(null);
      setTimeout(() => setSelectedClass(currentClass), 100);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return format(date, 'HH:mm dd/MM/yyyy');
  };

  const getFeedbackStatus = (feedbackCount: number = 0, totalCount: number = 0) => {
    if (totalCount === 0) return { text: 'Không có bài tập', color: 'text-gray-500', dot: 'bg-gray-400' };
    if (feedbackCount === totalCount) return { text: 'Đã có feedback', color: 'text-green-600', dot: 'bg-green-400' };
    return { text: `${feedbackCount}/${totalCount} feedback`, color: 'text-yellow-600', dot: 'bg-yellow-400' };
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#fc5d01] mb-6">Quản lý Feedback Bài tập</h1>
      
      {/* Class Selection */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Chọn lớp học</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {classes.map(cls => (
            <div 
              key={cls.id}
              onClick={() => setSelectedClass(cls)}
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedClass?.id === cls.id 
                  ? 'bg-[#fc5d01] text-white' 
                  : 'bg-white hover:bg-[#fedac2] border border-gray-200'
              }`}
            >
              <h3 className="font-semibold">{cls.name}</h3>
              <p>Học viên: {cls.students.length}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Homework Submissions */}
      {selectedClass && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#fc5d01]">Danh sách bài tập</h3>
            <p className="text-sm text-gray-600">Lớp: {selectedClass.name}</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#fc5d01]"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Học viên
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày nộp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hành động
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {homeworkSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        Không có bài tập nào
                      </td>
                    </tr>
                  ) : (
                    homeworkSubmissions.map(submission => {
                      const status = getFeedbackStatus(submission.feedbackCount, submission.totalCount);
                      return (
                        <tr key={submission.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{submission.userName}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatDate(submission.timestamp)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-2 ${status.dot}`}></div>
                              <span className={`text-sm ${status.color}`}>
                                {status.text}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewDetails(submission)}
                              className="text-[#fc5d01] hover:text-[#fd7f33] font-medium text-sm"
                            >
                              Xem chi tiết
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      
      {/* Feedback Modal */}
      {selectedSubmission && (
        <FeedbackDetailsModal
          isOpen={isModalOpen}
          onClose={closeModal}
          studentName={selectedSubmission.userName}
          teacherName={session?.user?.name || 'Giảng viên'}
          className={selectedClass?.name || ''}
          date={selectedSubmission.date}
          submissions={selectedSubmission.submissions}
          studentId={selectedSubmission.userId}
          documentId={selectedSubmission.id}
        />
      )}
    </div>
  );
}
