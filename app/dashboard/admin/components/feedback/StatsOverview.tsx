'use client';

interface StatsOverviewProps {
  totalSubmissions: number;
  submissionsWithFeedback: number;
  submissionsWithoutFeedback: number;
  feedbackPercentage: number;
}

export default function StatsOverview({
  totalSubmissions,
  submissionsWithFeedback,
  submissionsWithoutFeedback,
  feedbackPercentage
}: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-500">Tổng số bài tập</span>
        </div>
        <div className="text-3xl font-bold text-[#fc5d01]">{totalSubmissions}</div>
        <div className="mt-2 text-sm text-gray-600">Trong khoảng thời gian đã chọn</div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-500">Đã có feedback</span>
        </div>
        <div className="text-3xl font-bold text-[#fc5d01]">{submissionsWithFeedback}</div>
        <div className="mt-2 text-sm text-gray-600">
          {feedbackPercentage}% tổng số bài tập
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-gray-500">Chưa có feedback</span>
        </div>
        <div className="text-3xl font-bold text-[#fc5d01]">{submissionsWithoutFeedback}</div>
        <div className="mt-2 text-sm text-gray-600">
          {totalSubmissions > 0 ? (100 - feedbackPercentage) : 0}% tổng số bài tập
        </div>
      </div>
    </div>
  );
}
