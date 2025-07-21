'use client';

import { WFDDailySession, WFDProgress } from '../../../../../types/wfd';
import { RiCheckboxCircleLine, RiTimeLine, RiStarLine } from 'react-icons/ri';

interface WFDProgressOverviewProps {
  dailySession: WFDDailySession | null;
  userProgress: WFDProgress[];
  totalSentences: number;
}

export default function WFDProgressOverview({ 
  dailySession, 
  userProgress, 
  totalSentences 
}: WFDProgressOverviewProps) {
  const completedSentences = userProgress.filter(p => p.correctAttempts >= 10).length;
  const totalProgress = dailySession?.totalProgress || 0;
  const totalCorrectAttempts = userProgress.reduce((sum, p) => sum + p.correctAttempts, 0);
  const totalAttempts = userProgress.reduce((sum, p) => sum + p.attempts.length, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-xl font-semibold text-[#fc5d01] mb-6">Tiến độ hôm nay</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Overall Progress */}
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-3">
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#fedac2]"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#fc5d01]"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeDasharray={`${totalProgress}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-[#fc5d01]">{totalProgress}%</span>
            </div>
          </div>
          <p className="text-sm text-gray-600">Tiến độ tổng</p>
        </div>

        {/* Completed Sentences */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#fedac2] rounded-full flex items-center justify-center mx-auto mb-3">
            <RiCheckboxCircleLine className="w-8 h-8 text-[#fc5d01]" />
          </div>
          <div className="text-2xl font-bold text-[#fc5d01] mb-1">
            {completedSentences}/{totalSentences}
          </div>
          <p className="text-sm text-gray-600">Câu hoàn thành</p>
        </div>

        {/* Correct Attempts */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#fedac2] rounded-full flex items-center justify-center mx-auto mb-3">
            <RiStarLine className="w-8 h-8 text-[#fc5d01]" />
          </div>
          <div className="text-2xl font-bold text-[#fc5d01] mb-1">
            {totalCorrectAttempts}
          </div>
          <p className="text-sm text-gray-600">Lần gõ đúng</p>
        </div>

        {/* Total Attempts */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#fedac2] rounded-full flex items-center justify-center mx-auto mb-3">
            <RiTimeLine className="w-8 h-8 text-[#fc5d01]" />
          </div>
          <div className="text-2xl font-bold text-[#fc5d01] mb-1">
            {totalAttempts}
          </div>
          <p className="text-sm text-gray-600">Tổng lần thử</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Tiến độ hoàn thành</span>
          <span className="text-sm font-medium text-[#fc5d01]">{completedSentences}/{totalSentences} câu</span>
        </div>
        <div className="w-full bg-[#fedac2] rounded-full h-3">
          <div 
            className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${totalProgress}%` }}
          ></div>
        </div>
      </div>

      {/* Motivational Message */}
      {totalProgress === 100 ? (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-600 text-center font-medium">
            🎉 Xuất sắc! Bạn đã hoàn thành tất cả bài tập hôm nay!
          </p>
        </div>
      ) : totalProgress >= 50 ? (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-600 text-center font-medium">
            💪 Tuyệt vời! Bạn đã hoàn thành hơn một nửa rồi!
          </p>
        </div>
      ) : totalProgress > 0 ? (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-600 text-center font-medium">
            🚀 Khởi đầu tốt! Hãy tiếp tục luyện tập!
          </p>
        </div>
      ) : (
        <div className="mt-4 p-3 bg-[#fedac2] border border-[#fdbc94] rounded-lg">
          <p className="text-[#fc5d01] text-center font-medium">
            ✨ Hãy bắt đầu luyện tập với câu đầu tiên!
          </p>
        </div>
      )}
    </div>
  );
}
