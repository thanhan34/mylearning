'use client';

import { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import VoiceFeedbackPlayer from './VoiceFeedbackPlayer';
import { VoiceFeedback } from '@/app/firebase/services/voice-feedback';

export default function VoiceFeedbackDemo() {
  const [recordings, setRecordings] = useState<VoiceFeedback[]>([]);
  const [currentRecording, setCurrentRecording] = useState<{
    audioBlob: Blob;
    audioUrl: string;
  } | null>(null);

  const handleRecordingComplete = (audioBlob: Blob, audioUrl: string) => {
    setCurrentRecording({ audioBlob, audioUrl });
    
    // Create a mock VoiceFeedback object for demo
    const mockFeedback: VoiceFeedback = {
      id: Date.now().toString(),
      studentId: 'demo-student',
      studentName: 'Demo Student',
      teacherId: 'demo-teacher',
      teacherName: 'Demo Teacher',
      submissionId: 'demo-submission',
      submissionType: 'speaking',
      submissionQuestionNumber: 1,
      audioUrl: audioUrl,
      audioPath: 'demo-path',
      duration: 60, // Will be calculated properly in real implementation
      createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any,
      updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any
    };
    
    setRecordings(prev => [mockFeedback, ...prev]);
  };

  const clearRecordings = () => {
    setRecordings([]);
    setCurrentRecording(null);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#fc5d01] mb-2">
          Voice Feedback Demo
        </h1>
        <p className="text-gray-600">
          Test tính năng ghi âm và phát lại feedback bằng giọng nói
        </p>
      </div>

      {/* Voice Recorder Section */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Ghi âm Feedback
        </h2>
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          maxDuration={180} // 3 minutes
        />
      </div>

      {/* Current Recording Preview */}
      {currentRecording && (
        <div className="bg-[#fedac2]/20 rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Bản ghi âm hiện tại
          </h2>
          <div className="flex items-center space-x-4">
            <audio
              controls
              src={currentRecording.audioUrl}
              className="flex-1"
            >
              Trình duyệt của bạn không hỗ trợ phát audio.
            </audio>
            <button
              onClick={() => setCurrentRecording(null)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Xóa
            </button>
          </div>
        </div>
      )}

      {/* Recordings List */}
      {recordings.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Danh sách Voice Feedback ({recordings.length})
            </h2>
            <button
              onClick={clearRecordings}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Xóa tất cả
            </button>
          </div>
          
          <VoiceFeedbackPlayer voiceFeedbacks={recordings} />
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-800 mb-4">
          Hướng dẫn sử dụng
        </h2>
        <div className="space-y-3 text-blue-700">
          <div className="flex items-start space-x-2">
            <span className="font-semibold">1.</span>
            <span>Click "Bắt đầu ghi âm" để bắt đầu ghi âm feedback</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">2.</span>
            <span>Nói feedback của bạn một cách rõ ràng</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">3.</span>
            <span>Click "Dừng ghi âm" khi hoàn thành</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">4.</span>
            <span>Sử dụng nút "Phát" để nghe lại bản ghi âm</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="font-semibold">5.</span>
            <span>Trong ứng dụng thực tế, bản ghi âm sẽ được lưu tự động</span>
          </div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-gray-50 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Thông tin kỹ thuật
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Format:</strong> WebM with Opus codec
          </div>
          <div>
            <strong>Max Duration:</strong> 3 minutes
          </div>
          <div>
            <strong>Sample Rate:</strong> 44.1 kHz
          </div>
          <div>
            <strong>Features:</strong> Noise suppression, Echo cancellation
          </div>
        </div>
      </div>
    </div>
  );
}
