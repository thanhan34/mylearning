'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { getTeacherClasses, getAssistantClasses } from '@/app/firebase/services/class';
import { getUserByEmail } from '@/app/firebase/services/user';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import FeedbackDetailsModal from '@/app/dashboard/admin/components/feedback/FeedbackDetailsModal';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import { getMultipleStudentNicknames } from '@/app/firebase/services/student-nickname';
import { getVoiceFeedbackForSubmission } from '@/app/firebase/services/voice-feedback';
import { format } from 'date-fns';

// Cache for user data and classes
const userCache = new Map<string, any>();
const classCache = new Map<string, Class[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached data
const getCachedData = (key: string, cache: Map<string, any>) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
};

// Helper function to set cached data
const setCachedData = (key: string, data: any, cache: Map<string, any>) => {
  cache.set(key, { data, timestamp: Date.now() });
};

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
  voiceCheckPending?: boolean;
}

export default function TeacherFeedbackClient() {
  const { data: session } = useSession();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<HomeworkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('');
  const [processedSubmissions, setProcessedSubmissions] = useState<Set<string>>(new Set());
  const processedSubmissionsRef = useRef<Set<string>>(new Set());

  // Optimized class fetching with caching and session storage
  useEffect(() => {
    const fetchClasses = async () => {
      if (!session?.user?.email) return;
      
      const userEmail = session.user.email;
      const cacheKey = `classes_${userEmail}`;
      
      // Check session storage first
      try {
        const sessionData = sessionStorage.getItem(cacheKey);
        if (sessionData) {
          const { classes: cachedClasses, teacherId, timestamp } = JSON.parse(sessionData);
          if (Date.now() - timestamp < CACHE_DURATION) {
            setClasses(cachedClasses);
            setCurrentTeacherId(teacherId);
            setClassesLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error('Error reading from session storage:', error);
      }
      
      // Check memory cache
      const cachedClasses = getCachedData(cacheKey, classCache);
      const cachedUser = getCachedData(userEmail, userCache);
      
      if (cachedClasses && cachedUser) {
        setClasses(cachedClasses);
        setCurrentTeacherId(cachedUser.id);
        setClassesLoading(false);
        return;
      }
      
      setClassesLoading(true);
      try {
        // Get user data (with caching)
        let user = cachedUser;
        if (!user) {
          user = await getUserByEmail(userEmail);
          if (!user) {
            console.error('User not found');
            setClassesLoading(false);
            return;
          }
          setCachedData(userEmail, user, userCache);
        }

        setCurrentTeacherId(user.id);

        // Get classes (with caching)
        let teacherClasses = cachedClasses;
        if (!teacherClasses) {
          if (user.role === 'assistant') {
            teacherClasses = await getAssistantClasses(userEmail);
          } else {
            teacherClasses = await getTeacherClasses(userEmail);
          }
          setCachedData(cacheKey, teacherClasses, classCache);
        }
        
        setClasses(teacherClasses);
        
        // Store in session storage for faster subsequent loads
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            classes: teacherClasses,
            teacherId: user.id,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.error('Error saving to session storage:', error);
        }
        
      } catch (error) {
        console.error('Error fetching classes:', error);
        // Show error state
        setClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };

    fetchClasses();
  }, [session]);

  // Fetch nicknames when selected class changes
  useEffect(() => {
    const fetchNicknames = async () => {
      if (selectedClass && currentTeacherId) {
        try {
          const studentIds = selectedClass.students.map(student => student.id);
          const studentNicknames = await getMultipleStudentNicknames(currentTeacherId, studentIds);
          setNicknames(studentNicknames);
        } catch (error) {
          console.error('Error fetching nicknames:', error);
        }
      }
    };

    fetchNicknames();
  }, [selectedClass, currentTeacherId]);

  // Function to fetch homework submissions for a class - OPTIMIZED VERSION
  const fetchHomeworkSubmissions = async (classData: Class | null) => {
    if (!classData) return;

    setLoading(true);
    // Reset processed submissions when switching classes
    setProcessedSubmissions(new Set());
    processedSubmissionsRef.current = new Set();
    
    try {
      // Get all student IDs from the selected class
      const studentIds = classData.students.map(student => student.id);
      
      if (studentIds.length === 0) {
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
        
        // Fetch homework submissions for this batch of students
        const submissionsRef = collection(db, 'homework');
        const q = query(
          submissionsRef,
          where('userId', 'in', batchIds)
        );
        
        const querySnapshot = await getDocs(q);
        
        // FAST LOADING: Check text feedback and filter out completed ones immediately
        querySnapshot.forEach(doc => {
          const data = doc.data() as HomeworkData;
          
          // Calculate feedback stats based on text feedback only (for fast loading)
          const totalCount = data.submissions?.length || 0;
          const textFeedbackCount = data.submissions?.filter(sub => 
            sub.feedback && sub.feedback.trim() !== ''
          ).length || 0;
          
          // Only include submissions that don't have complete text feedback
          // This prevents showing completed assignments initially
          if (textFeedbackCount < totalCount) {
            submissions.push({
              ...data,
              id: doc.id,
              feedbackCount: textFeedbackCount,
              totalCount,
              // Add flag to indicate voice feedback not checked yet
              voiceCheckPending: true
            });
          }
        });
      }
      
      // Sort submissions by date (most recent first)
      submissions.sort((a, b) => {
        if (!a.timestamp || !b.timestamp) return 0;
        return b.timestamp.seconds - a.timestamp.seconds;
      });
      
      // Set initial submissions (fast loading)
      setHomeworkSubmissions(submissions);
      setLoading(false);
      
      // BACKGROUND: Check voice feedback and update progressively
      checkVoiceFeedbackInBackground(submissions);
      
    } catch (error) {
      console.error('Error fetching homework submissions:', error);
      setLoading(false);
    }
  };

  // Background function to check voice feedback
  const checkVoiceFeedbackInBackground = async (initialSubmissions: HomeworkData[]) => {
    const updatedSubmissions = [...initialSubmissions];
    
    for (let i = 0; i < updatedSubmissions.length; i++) {
      const submission = updatedSubmissions[i];
      
      // Skip submissions that have been processed by refreshSubmissionsList
      if (processedSubmissionsRef.current.has(submission.id)) {
        continue;
      }
      
      try {
        // Check voice feedback for each submission
        const voiceFeedbackPromises = (submission.submissions || []).map(async (sub) => {
          try {
            const voiceFeedbacks = await getVoiceFeedbackForSubmission(
              submission.id,
              sub.type,
              sub.questionNumber
            );
            return voiceFeedbacks.length > 0;
          } catch (error) {
            console.error('Error checking voice feedback:', error);
            return false;
          }
        });
        
        const voiceResults = await Promise.all(voiceFeedbackPromises);
        const voiceFeedbackCount = voiceResults.filter(Boolean).length;
        
        // Calculate total feedback (text + voice)
        const textFeedbackCount = submission.submissions?.filter(sub => 
          sub.feedback && sub.feedback.trim() !== ''
        ).length || 0;
        
        // Count submissions that have either text OR voice feedback
        let totalFeedbackCount = 0;
        for (let j = 0; j < (submission.submissions || []).length; j++) {
          const sub = submission.submissions![j];
          const hasText = sub.feedback && sub.feedback.trim() !== '';
          const hasVoice = voiceResults[j];
          if (hasText || hasVoice) {
            totalFeedbackCount++;
          }
        }
        
        // Update the submission
        updatedSubmissions[i] = {
          ...submission,
          feedbackCount: totalFeedbackCount,
          voiceCheckPending: false
        };
        
      } catch (error) {
        console.error('Error in background voice check:', error);
      }
    }
    
    // After checking all submissions, update the state once with filtered results
    setHomeworkSubmissions(currentSubmissions => {
      // Filter out submissions that are fully completed or have been processed
      const filteredSubmissions = updatedSubmissions.filter(sub => {
        // Skip if processed by refresh
        if (processedSubmissionsRef.current.has(sub.id)) {
          return false;
        }
        // Skip if fully completed
        if (sub.feedbackCount! >= sub.totalCount!) {
          return false;
        }
        return true;
      });
      
      return [...filteredSubmissions];
    });
  };

  // Fetch homework submissions when selected class changes
  useEffect(() => {
    fetchHomeworkSubmissions(selectedClass);
  }, [selectedClass]);

  const handleViewDetails = (submission: HomeworkData) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
    // Don't reload the entire list anymore
  };

  // Function to update specific submission after feedback is completed
  const refreshSubmissionsList = async (updatedSubmissionId?: string) => {
    if (!updatedSubmissionId) return;
    
    // Mark this submission as processed to prevent background voice check from overriding
    setProcessedSubmissions(prev => new Set(prev).add(updatedSubmissionId));
    processedSubmissionsRef.current.add(updatedSubmissionId);
    
    // Re-fetch and check the specific submission's feedback status
    try {
      const submissionsRef = collection(db, 'homework');
      const docRef = query(submissionsRef, where('__name__', '==', updatedSubmissionId));
      const querySnapshot = await getDocs(docRef);
      
      if (querySnapshot.empty) return;
      
      const doc = querySnapshot.docs[0];
      const updatedData = { ...doc.data(), id: doc.id } as HomeworkData;
      
      // Calculate feedback stats including both text and voice feedback
      const totalCount = updatedData.submissions?.length || 0;
      let feedbackCount = 0;
      
      // Check each submission for feedback (text or voice)
      for (const submission of updatedData.submissions || []) {
        const hasTextFeedback = submission.feedback && submission.feedback.trim() !== '';
        
        // Check for voice feedback
        let hasVoiceFeedback = false;
        try {
          const voiceFeedbacks = await getVoiceFeedbackForSubmission(
            updatedSubmissionId,
            submission.type,
            submission.questionNumber
          );
          hasVoiceFeedback = voiceFeedbacks.length > 0;
        } catch (error) {
          console.error('Error checking voice feedback:', error);
        }
        
        // If either text or voice feedback exists, count it as feedback
        if (hasTextFeedback || hasVoiceFeedback) {
          feedbackCount++;
        }
      }
      
      // Update the submissions list
      setHomeworkSubmissions(prevSubmissions => {
        return prevSubmissions.map(submission => {
          if (submission.id === updatedSubmissionId) {
            // If all submissions now have feedback, remove from list
            if (feedbackCount >= totalCount) {
              return null; // Will be filtered out
            }
            
            // Otherwise update the submission with new data and count
            return {
              ...updatedData,
              id: doc.id,
              feedbackCount,
              totalCount,
              voiceCheckPending: false
            };
          }
          return submission;
        }).filter(Boolean) as HomeworkData[]; // Remove null entries
      });
      
    } catch (error) {
      console.error('Error refreshing submission:', error);
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
        {classesLoading ? (
          <div className="flex flex-col justify-center items-center p-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-[#fc5d01] mr-3"></div>
            <span className="text-gray-600 mt-2">Đang tải danh sách lớp học...</span>
            <div className="text-xs text-gray-400 mt-1">Vui lòng đợi trong giây lát</div>
          </div>
        ) : classes.length === 0 ? (
          <div className="text-center p-8 text-gray-500 bg-gray-50 rounded-lg">
            <div className="text-lg mb-2">📚</div>
            <div>Không có lớp học nào được phân công</div>
            <div className="text-sm mt-2">Liên hệ quản trị viên để được hỗ trợ</div>
          </div>
        ) : (
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
        )}
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
                            <div className="text-sm font-medium text-gray-900">
                              {nicknames[submission.userId] ? (
                                <div>
                                  <div className="font-semibold text-[#fc5d01]">{nicknames[submission.userId]}</div>
                                  <div className="text-xs text-gray-500">{submission.userName}</div>
                                </div>
                              ) : (
                                submission.userName
                              )}
                            </div>
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
          onFeedbackComplete={refreshSubmissionsList}
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
