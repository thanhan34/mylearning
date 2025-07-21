'use client';

import { useState, useRef, useEffect } from 'react';
import { WFDSentence, WFDProgress, WFDAttempt, VoiceType } from '../../../../../types/wfd';
import { updateWFDProgress, checkTextAccuracy, getAudioUrl } from '../../../../firebase/services/wfd';
import { 
  RiPlayLine, 
  RiPauseLine, 
  RiVolumeUpLine, 
  RiCheckLine, 
  RiCloseLine,
  RiLoader4Line 
} from 'react-icons/ri';

interface WFDSentenceCardProps {
  sentence: WFDSentence;
  progress?: WFDProgress;
  sentenceNumber: number;
  selectedVoice: VoiceType;
  userId: string;
  dailyDate: string;
  onProgressUpdate: (progress: WFDProgress) => void;
}

export default function WFDSentenceCard({
  sentence,
  progress,
  sentenceNumber,
  selectedVoice,
  userId,
  dailyDate,
  onProgressUpdate
}: WFDSentenceCardProps) {
  const [userInput, setUserInput] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastAttemptResult, setLastAttemptResult] = useState<{ isCorrect: boolean; accuracy: number } | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const correctAttempts = progress?.correctAttempts || 0;
  const totalAttempts = progress?.attempts.length || 0;
  const isCompleted = totalAttempts >= 10; // ✅ Hoàn thành sau 10 lần đánh (không cần đúng)
  const audioUrl = getAudioUrl(sentence, selectedVoice);

  // Stop audio when voice changes - NO AUTO PLAY
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [selectedVoice]);

  // NO AUTO-PLAY: Audio chỉ phát khi người dùng nhấn nút "Phát audio"

  // Prevent copy/paste and right-click
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const preventCopyPaste = (e: Event) => {
      e.preventDefault();
      return false;
    };

    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const preventKeyboardShortcuts = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+X, Ctrl+Z, Ctrl+Y
      if (e.ctrlKey && ['c', 'v', 'a', 'x', 'z', 'y'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        return false;
      }
      // Prevent F12, Ctrl+Shift+I, Ctrl+U
      if (e.key === 'F12' || 
          (e.ctrlKey && e.shiftKey && e.key === 'I') ||
          (e.ctrlKey && e.key === 'u')) {
        e.preventDefault();
        return false;
      }
    };

    textarea.addEventListener('copy', preventCopyPaste);
    textarea.addEventListener('paste', preventCopyPaste);
    textarea.addEventListener('cut', preventCopyPaste);
    textarea.addEventListener('contextmenu', preventRightClick);
    textarea.addEventListener('keydown', preventKeyboardShortcuts);

    return () => {
      textarea.removeEventListener('copy', preventCopyPaste);
      textarea.removeEventListener('paste', preventCopyPaste);
      textarea.removeEventListener('cut', preventCopyPaste);
      textarea.removeEventListener('contextmenu', preventRightClick);
      textarea.removeEventListener('keydown', preventKeyboardShortcuts);
    };
  }, []);

  const playAudio = async () => {
    if (audioRef.current) {
      try {
        setIsPlaying(true);
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
        setIsPlaying(false);
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleSubmitLine = async (lineText: string) => {
    if (!lineText.trim() || isSubmitting || isCompleted) return;

    setIsSubmitting(true);
    setShowFeedback(false);

    try {
      const result = checkTextAccuracy(lineText, sentence.text);
      setLastAttemptResult(result);

      const attempt: WFDAttempt = {
        timestamp: new Date().toISOString(),
        userInput: lineText.trim(),
        isCorrect: result.isCorrect,
        accuracy: result.accuracy
      };

      const updatedProgress = await updateWFDProgress(userId, sentence.id, dailyDate, attempt);
      onProgressUpdate(updatedProgress);

      setShowFeedback(true);

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting attempt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!userInput.trim() || isSubmitting || isCompleted) return;

    setIsSubmitting(true);
    setShowFeedback(false);

    try {
      const result = checkTextAccuracy(userInput, sentence.text);
      setLastAttemptResult(result);

      const attempt: WFDAttempt = {
        timestamp: new Date().toISOString(),
        userInput: userInput.trim(),
        isCorrect: result.isCorrect,
        accuracy: result.accuracy
      };

      const updatedProgress = await updateWFDProgress(userId, sentence.id, dailyDate, attempt);
      onProgressUpdate(updatedProgress);

      setShowFeedback(true);

      // Clear input if correct, keep if incorrect for retry
      if (result.isCorrect) {
        setUserInput('');
      }

      // Auto-hide feedback after 3 seconds
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);

    } catch (error) {
      console.error('Error submitting attempt:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Chỉ Ctrl+Enter mới kiểm tra, Enter thường để xuống dòng
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
    // Enter thường không làm gì, để textarea tự xử lý xuống dòng
  };

  const getDifficultyColor = () => {
    if (correctAttempts >= 10) return 'text-green-600';
    if (correctAttempts >= 7) return 'text-blue-600';
    if (correctAttempts >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = () => {
    if (correctAttempts >= 10) return 'bg-green-500';
    if (correctAttempts >= 7) return 'bg-blue-500';
    if (correctAttempts >= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 transition-all duration-300 ${
      isCompleted ? 'ring-2 ring-green-500 bg-green-50' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
            isCompleted ? 'bg-green-500' : 'bg-[#fc5d01]'
          }`}>
            {isCompleted ? <RiCheckLine className="w-5 h-5" /> : sentenceNumber}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            Câu {sentenceNumber}
          </h3>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className={`text-sm font-medium ${getDifficultyColor()}`}>
            {totalAttempts}/10 lần đánh
          </span>
          <span className="text-xs text-gray-500">
            ({correctAttempts} đúng)
          </span>
          {isCompleted && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              Hoàn thành
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 bg-[#fc5d01]`}
            style={{ width: `${Math.min((totalAttempts / 10) * 100, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Tiến độ: {totalAttempts}/10 lần</span>
          <span>Độ chính xác: {totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0}%</span>
        </div>
      </div>

      {/* Audio Section */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-3">
          <button
            onClick={isPlaying ? pauseAudio : playAudio}
            className="flex items-center space-x-2 bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
            disabled={isCompleted}
          >
            {isPlaying ? (
              <RiPauseLine className="w-5 h-5" />
            ) : (
              <RiPlayLine className="w-5 h-5" />
            )}
            <span>{isPlaying ? 'Tạm dừng' : 'Phát audio'}</span>
          </button>
          
          <div className="flex items-center space-x-2 text-gray-600">
            <RiVolumeUpLine className="w-4 h-4" />
            <span className="text-sm">Giọng: {selectedVoice}</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={handleAudioEnded}
          preload="metadata"
        />
      </div>

      {/* Text Display */}
      <div className="mb-4">
        <div className="bg-[#fedac2] p-4 rounded-lg">
          <p className="text-gray-800 font-medium text-center">
            {sentence.text}
          </p>
        </div>
      </div>

      {/* Input Section */}
      {!isCompleted && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Gõ lại câu trên 10 lần để thuộ bài (Enter để xuống dòng, Ctrl+Enter để kiểm tra):
            </label>
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập câu bạn nghe được..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
              style={{
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none'
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!userInput.trim() || isSubmitting}
            className="w-full bg-[#fc5d01] text-white py-3 px-4 rounded-lg hover:bg-[#fd7f33] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <RiLoader4Line className="w-5 h-5 animate-spin" />
                <span>Đang kiểm tra...</span>
              </>
            ) : (
              <span>Kiểm tra (Ctrl+Enter)</span>
            )}
          </button>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && lastAttemptResult && (
        <div className={`mt-4 p-4 rounded-lg border ${
          lastAttemptResult.isCorrect 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {lastAttemptResult.isCorrect ? (
              <RiCheckLine className="w-5 h-5 text-green-600" />
            ) : (
              <RiCloseLine className="w-5 h-5 text-red-600" />
            )}
            <span className={`font-medium ${
              lastAttemptResult.isCorrect ? 'text-green-600' : 'text-red-600'
            }`}>
              {lastAttemptResult.isCorrect ? 'Chính xác!' : 'Chưa chính xác'}
            </span>
          </div>
          
          {!lastAttemptResult.isCorrect && (
            <div className="text-sm text-gray-600">
              <p>Độ chính xác: {lastAttemptResult.accuracy}%</p>
              <p className="mt-1">Hãy thử lại để đạt 100% chính xác.</p>
            </div>
          )}
        </div>
      )}

      {/* Completion Message */}
      {isCompleted && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <RiCheckLine className="w-5 h-5 text-green-600" />
            <span className="font-medium text-green-600">
              Hoàn thành! Bạn đã đánh câu này 10 lần để thuộ bài.
            </span>
          </div>
          <div className="text-sm text-green-600 mt-1">
            Tỷ lệ chính xác: {Math.round((correctAttempts / totalAttempts) * 100)}% ({correctAttempts}/{totalAttempts} lần đúng)
          </div>
        </div>
      )}

      {/* Attempt History */}
      {totalAttempts > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600">
            Tổng số lần thử: {totalAttempts} | 
            Lần đúng: {correctAttempts} | 
            Tỷ lệ thành công: {Math.round((correctAttempts / totalAttempts) * 100)}%
          </p>
        </div>
      )}
    </div>
  );
}
