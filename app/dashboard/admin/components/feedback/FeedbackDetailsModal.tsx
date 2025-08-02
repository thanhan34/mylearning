'use client';

import { useState, useEffect } from 'react';
import { HomeworkSubmission } from '@/app/firebase/services/types';
import { updateHomeworkFeedback } from '@/app/firebase/services/homework';
import { useSession } from 'next-auth/react';
import VoiceRecorder from '@/app/components/VoiceRecorder';
import VoiceFeedbackPlayer from '@/app/components/VoiceFeedbackPlayer';
import { 
  uploadVoiceFeedback, 
  getVoiceFeedbackForSubmission, 
  VoiceFeedback 
} from '@/app/firebase/services/voice-feedback';

interface FeedbackDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  teacherName: string;
  className: string;
  date: string;
  submissions: HomeworkSubmission[];
  studentId?: string;
  documentId?: string; // Add document ID prop
}

interface EditingFeedback {
  type: string;
  questionNumber: number;
  feedback: string;
}

export default function FeedbackDetailsModal({
  isOpen,
  onClose,
  studentName,
  teacherName,
  className,
  date,
  submissions,
  studentId,
  documentId
}: FeedbackDetailsModalProps) {
  const { data: session } = useSession();
  const [editingFeedback, setEditingFeedback] = useState<EditingFeedback | null>(null);
  const [localSubmissions, setLocalSubmissions] = useState<HomeworkSubmission[]>(submissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceFeedbacks, setVoiceFeedbacks] = useState<Record<string, VoiceFeedback[]>>({});
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<string | null>(null);
  const [uploadingVoice, setUploadingVoice] = useState(false);

  useEffect(() => {
    setLocalSubmissions(submissions);
  }, [submissions]);

  // Load voice feedbacks for each submission
  useEffect(() => {
    const loadVoiceFeedbacks = async () => {
      if (!documentId || localSubmissions.length === 0) return;

      const voiceFeedbackMap: Record<string, VoiceFeedback[]> = {};
      
      for (const submission of localSubmissions) {
        const key = `${submission.type}_${submission.questionNumber}`;
        try {
          const feedbacks = await getVoiceFeedbackForSubmission(
            documentId,
            submission.type,
            submission.questionNumber
          );
          voiceFeedbackMap[key] = feedbacks;
        } catch (error) {
          console.error('Error loading voice feedback:', error);
          voiceFeedbackMap[key] = [];
        }
      }
      
      setVoiceFeedbacks(voiceFeedbackMap);
    };

    loadVoiceFeedbacks();
  }, [documentId, localSubmissions]);

  if (!isOpen) return null;

  const handleSaveFeedback = async () => {
    if (!editingFeedback) return;
    
    setSaving(true);
    setError(null);

    try {
      console.log('Saving feedback for student:', studentName, 'date:', date);
      
      // Use the updateHomeworkFeedback function
      const success = await updateHomeworkFeedback(
        studentName,
        date,
        editingFeedback.type,
        editingFeedback.questionNumber,
        editingFeedback.feedback,
        session?.user?.id || undefined,
        session?.user?.name || session?.user?.email || undefined
      );
      
      if (success) {
        // Update local state to reflect the changes
        const updatedLocalSubmissions = localSubmissions.map(sub => {
          if (sub.type === editingFeedback.type && sub.questionNumber === editingFeedback.questionNumber) {
            return { ...sub, feedback: editingFeedback.feedback };
          }
          return sub;
        });
        
        setLocalSubmissions(updatedLocalSubmissions);
        setEditingFeedback(null);
      } else {
        setError('Không tìm thấy bài tập để cập nhật. Vui lòng thử lại sau.');
      }
    } catch (error) {
      console.error('Error saving feedback:', error);
      setError('Lỗi khi lưu feedback');
    } finally {
      setSaving(false);
    }
  };

  const handleVoiceRecordingComplete = async (
    audioBlob: Blob,
    audioUrl: string,
    submission: HomeworkSubmission
  ) => {
    if (!studentId || !documentId || !session?.user) return;

    setUploadingVoice(true);
    setError(null);

    try {
      // Calculate duration from the audio blob
      const audio = new Audio(audioUrl);
      await new Promise((resolve) => {
        audio.addEventListener('loadedmetadata', resolve);
      });
      const duration = Math.round(audio.duration);

      const voiceFeedback = await uploadVoiceFeedback(
        audioBlob,
        studentId,
        studentName,
        session.user.id || '',
        session.user.name || session.user.email || '',
        documentId,
        submission.type,
        submission.questionNumber,
        duration
      );

      if (voiceFeedback) {
        // Update local voice feedbacks
        const key = `${submission.type}_${submission.questionNumber}`;
        setVoiceFeedbacks(prev => ({
          ...prev,
          [key]: [voiceFeedback, ...(prev[key] || [])]
        }));
        
        setShowVoiceRecorder(null);
      } else {
        setError('Lỗi khi tải lên feedback bằng giọng nói');
      }
    } catch (error) {
      console.error('Error uploading voice feedback:', error);
      setError('Lỗi khi tải lên feedback bằng giọng nói');
    } finally {
      setUploadingVoice(false);
    }
  };

  const getSubmissionKey = (submission: HomeworkSubmission) => {
    return `${submission.type}_${submission.questionNumber}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] text-white">
          <h3 className="text-xl font-semibold">Chi tiết Feedback</h3>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 focus:outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Student and Teacher Info */}
        <div className="px-6 py-4 bg-[#fedac2]/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Học viên</p>
              <p className="font-medium">{studentName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Giảng viên</p>
              <p className="font-medium">{teacherName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lớp học</p>
              <p className="font-medium">{className}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Ngày nộp</p>
              <p className="font-medium">{date}</p>
            </div>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg">
            {error}
          </div>
        )}

        {/* Submissions and Feedback */}
        <div className="flex-1 overflow-y-auto p-6">
          {localSubmissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Không có bài tập nào
            </div>
          ) : (
            <div className="space-y-6">
              {localSubmissions.map((submission, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <h4 className="font-medium">Bài tập #{index + 1}</h4>
                  </div>
                  
                  <div className="p-4">
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-gray-500 mb-1">Nội dung bài tập</h5>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 whitespace-pre-wrap">
                        {submission.link ? (
                          <a 
                            href={submission.link.match(/https?:\/\/(?:www\.)?apeuni\.com\/[^\s]+/)?.[0] || submission.link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {submission.link}
                          </a>
                        ) : (
                          <span className="text-gray-500 italic">Không có nội dung</span>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h5 className="text-sm font-medium text-gray-500">Feedback của giảng viên</h5>
                        {studentId && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingFeedback({
                                type: submission.type,
                                questionNumber: submission.questionNumber,
                                feedback: submission.feedback || ''
                              })}
                              className="text-[#fc5d01] hover:text-[#fd7f33] text-sm"
                            >
                              {editingFeedback?.type === submission.type && 
                               editingFeedback?.questionNumber === submission.questionNumber
                                ? 'Đang chỉnh sửa'
                                : 'Chỉnh sửa'}
                            </button>
                            <button
                              onClick={() => {
                                const key = getSubmissionKey(submission);
                                setShowVoiceRecorder(showVoiceRecorder === key ? null : key);
                              }}
                              className="text-[#fc5d01] hover:text-[#fd7f33] text-sm flex items-center space-x-1"
                              disabled={uploadingVoice}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                              </svg>
                              <span>
                                {showVoiceRecorder === getSubmissionKey(submission) ? 'Ẩn ghi âm' : 'Ghi âm'}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingFeedback?.type === submission.type && 
                       editingFeedback?.questionNumber === submission.questionNumber ? (
                        <div className="mt-2">
                          <textarea
                            value={editingFeedback.feedback}
                            onChange={(e) => setEditingFeedback({
                              ...editingFeedback,
                              feedback: e.target.value
                            })}
                            className="w-full p-3 border border-[#fc5d01]/20 rounded focus:outline-none focus:ring-2 focus:ring-[#fc5d01] min-h-[100px] text-gray-700"
                            placeholder="Nhập feedback cho học viên..."
                          />
                          <div className="flex justify-end mt-2 space-x-2">
                            <button
                              onClick={() => setEditingFeedback(null)}
                              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                              disabled={saving}
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleSaveFeedback}
                              className="px-3 py-1.5 bg-[#fc5d01] text-white rounded hover:bg-[#fd7f33] transition-colors flex items-center"
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Đang lưu...
                                </>
                              ) : 'Lưu feedback'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className={`p-3 rounded border whitespace-pre-wrap ${
                          submission.feedback ? 'bg-[#fedac2]/20 border-[#fc5d01]/20' : 'bg-gray-50 border-gray-200'
                        }`}>
                          {submission.feedback ? (
                            <p>{submission.feedback}</p>
                          ) : (
                            <p className="text-gray-500 italic">Chưa có feedback</p>
                          )}
                        </div>
                      )}

                      {/* Voice Recorder */}
                      {showVoiceRecorder === getSubmissionKey(submission) && (
                        <div className="mt-4">
                          <VoiceRecorder
                            onRecordingComplete={(audioBlob, audioUrl) => 
                              handleVoiceRecordingComplete(audioBlob, audioUrl, submission)
                            }
                            maxDuration={180} // 3 minutes
                            className="mb-4"
                          />
                          {uploadingVoice && (
                            <div className="flex items-center justify-center p-4 bg-[#fedac2]/20 rounded-lg">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-[#fc5d01]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              <span className="text-[#fc5d01]">Đang tải lên feedback bằng giọng nói...</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Voice Feedback Player */}
                      {voiceFeedbacks[getSubmissionKey(submission)]?.length > 0 && (
                        <div className="mt-4">
                          <VoiceFeedbackPlayer
                            voiceFeedbacks={voiceFeedbacks[getSubmissionKey(submission)]}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
