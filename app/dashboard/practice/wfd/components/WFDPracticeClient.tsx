'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { WFDSentence, WFDProgress, WFDDailySession, VoiceType } from '../../../../../types/wfd';
import { 
  getDailyWFDSentences, 
  getUserDailySession, 
  createOrUpdateDailySession,
  getUserDailyProgress 
} from '../../../../firebase/services/wfd';
import WFDSentenceCard from './WFDSentenceCard';
import WFDProgressOverview from './WFDProgressOverview';
import { RiLoader4Line } from 'react-icons/ri';

export default function WFDPracticeClient() {
  const { data: session } = useSession();
  const [sentences, setSentences] = useState<WFDSentence[]>([]);
  const [dailySession, setDailySession] = useState<WFDDailySession | null>(null);
  const [userProgress, setUserProgress] = useState<WFDProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<VoiceType>('Brian');

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (session?.user?.email) {
      initializeDailyPractice();
    }
  }, [session]);

  const initializeDailyPractice = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get daily sentences
      const dailySentences = await getDailyWFDSentences();
      setSentences(dailySentences);

      if (!session?.user?.email) return;

      // Get or create daily session
      const userId = session.user.email;
      let session_data = await getUserDailySession(userId, today);
      
      if (!session_data) {
        // Create new session with today's sentences
        const sentenceIds = dailySentences.map(s => s.id);
        session_data = await createOrUpdateDailySession(userId, today, sentenceIds);
      }
      
      setDailySession(session_data);

      // Get user's progress for today
      const progress = await getUserDailyProgress(userId, today);
      setUserProgress(progress);

    } catch (err) {
      console.error('Error initializing daily practice:', err);
      setError('Không thể tải dữ liệu luyện tập. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleProgressUpdate = (updatedProgress: WFDProgress) => {
    setUserProgress(prev => {
      const existingIndex = prev.findIndex(p => p.wfdId === updatedProgress.wfdId);
      if (existingIndex >= 0) {
        const newProgress = [...prev];
        newProgress[existingIndex] = updatedProgress;
        return newProgress;
      } else {
        return [...prev, updatedProgress];
      }
    });

    // Update daily session progress
    if (dailySession && updatedProgress.correctAttempts >= 10) {
      const completedSentences = [...dailySession.completedSentences];
      if (!completedSentences.includes(updatedProgress.wfdId)) {
        completedSentences.push(updatedProgress.wfdId);
        const totalProgress = Math.round((completedSentences.length / dailySession.sentences.length) * 100);
        
        setDailySession({
          ...dailySession,
          completedSentences,
          totalProgress
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RiLoader4Line className="w-8 h-8 text-[#fc5d01] animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Đang tải bài luyện tập...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={initializeDailyPractice}
          className="bg-[#fc5d01] text-white px-6 py-2 rounded-lg hover:bg-[#fd7f33] transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
        <p className="text-yellow-600">Không có câu luyện tập nào cho hôm nay.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Progress Overview */}
      <WFDProgressOverview 
        dailySession={dailySession}
        userProgress={userProgress}
        totalSentences={sentences.length}
      />

      {/* Voice Selection */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">Chọn giọng đọc</h3>
        <div className="flex flex-wrap gap-3">
          {(['Brian', 'Joanna', 'Olivia'] as VoiceType[]).map((voice) => (
            <button
              key={voice}
              onClick={() => setSelectedVoice(voice)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                selectedVoice === voice
                  ? 'bg-[#fc5d01] text-white shadow-md'
                  : 'bg-[#fedac2] text-[#fc5d01] hover:bg-[#fdbc94]'
              }`}
            >
              {voice}
            </button>
          ))}
        </div>
      </div>

      {/* Sentences */}
      <div className="space-y-6">
        {sentences.map((sentence, index) => {
          const progress = userProgress.find(p => p.wfdId === sentence.id);
          return (
            <WFDSentenceCard
              key={sentence.id}
              sentence={sentence}
              progress={progress}
              sentenceNumber={index + 1}
              selectedVoice={selectedVoice}
              userId={session?.user?.email || ''}
              dailyDate={today}
              onProgressUpdate={handleProgressUpdate}
            />
          );
        })}
      </div>

      {/* Completion Message */}
      {dailySession && dailySession.totalProgress === 100 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-green-600 text-xl font-semibold mb-2">
            🎉 Chúc mừng!
          </div>
          <p className="text-green-600">
            Bạn đã hoàn thành tất cả 10 câu Write From Dictation hôm nay!
          </p>
        </div>
      )}
    </div>
  );
}
