'use client';

interface ClassStat {
  id: string;
  className: string;
  totalMocktests: number;
  mocktestsWithFeedback: number;
  feedbackPercentage: number;
}

interface MocktestClassStatsTableProps {
  classStats: ClassStat[];
}

export default function MocktestClassStatsTable({ 
  classStats 
}: MocktestClassStatsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#fc5d01]">Thống kê feedback theo lớp học</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Lớp học
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tổng mocktest
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Đã có feedback
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tỷ lệ
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classStats.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  Không có dữ liệu
                </td>
              </tr>
            ) : (
              classStats.map(classData => (
                <tr key={classData.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{classData.className}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{classData.totalMocktests}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{classData.mocktestsWithFeedback}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{classData.feedbackPercentage}%</div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          classData.feedbackPercentage < 50 ? 'bg-red-500' : 
                          classData.feedbackPercentage < 80 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`} 
                        style={{ width: `${classData.feedbackPercentage}%` }}
                      ></div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
