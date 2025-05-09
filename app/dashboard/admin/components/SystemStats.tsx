'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAdminStats } from '@/app/firebase/services';
import dynamic from 'next/dynamic';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  ChartOptions
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Dynamically import chart components for code splitting
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), { 
  ssr: false,
  loading: () => <ChartSkeleton height={300} />
});

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), { 
  ssr: false,
  loading: () => <ChartSkeleton height={300} />
});

// Lazy load other components
const DailyHome = dynamic(() => import('../../components/DailyHome'), {
  loading: () => <ComponentSkeleton />
});

const DailyTargetTable = dynamic(() => import('../../components/DailyTargetTable'), {
  loading: () => <ComponentSkeleton />
});

// Skeleton loaders
const StatCardSkeleton = () => (
  <div className="bg-white p-6 rounded-xl shadow-md animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 bg-[#fedac2] rounded-full"></div>
      <div className="h-4 w-24 bg-gray-200 rounded"></div>
    </div>
    <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
    <div className="h-4 w-32 bg-gray-200 rounded"></div>
  </div>
);

const ChartSkeleton = ({ height = 400 }: { height?: number }) => (
  <div className="animate-pulse bg-gray-100 rounded-lg" style={{ height: `${height}px` }}></div>
);

const ComponentSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    <div className="h-4 bg-gray-200 rounded w-full"></div>
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
  </div>
);

const SystemStats = () => {
  const [stats, setStats] = useState({
    studentCount: 0,
    teacherCount: 0,
    classCount: 0,
    submissionCount: 0,
    classProgress: [] as Array<{
      name: string;
      completionRate: number;
    }>
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const data = await getAdminStats();
      if (data) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => ({
    labels: ['Học viên', 'Giảng viên', 'Lớp học'],
    datasets: [
      {
        label: 'Số lượng',
        data: [stats.studentCount, stats.teacherCount, stats.classCount],
        backgroundColor: [
          '#fd7f33',
          '#fc5d01',
          '#ffac7b',
        ],
        borderRadius: 6,
      },
    ],
  }), [stats.studentCount, stats.teacherCount, stats.classCount]);

  // Memoize the class progress chart data
  const classProgressChartData = useMemo(() => ({
    labels: stats.classProgress.map(c => c.name),
    datasets: [{
      label: 'Tỷ lệ hoàn thành (%)',
      data: stats.classProgress.map(c => c.completionRate),
      backgroundColor: '#ffac7b',
      borderRadius: 6,
    }]
  }), [stats.classProgress]);

  // Memoize the user distribution chart data
  const userDistributionChartData = useMemo(() => ({
    labels: ['Học viên', 'Giảng viên'],
    datasets: [{
      data: [stats.studentCount, stats.teacherCount],
      backgroundColor: ['#fd7f33', '#fc5d01'],
      borderWidth: 0,
    }]
  }), [stats.studentCount, stats.teacherCount]);

  // Memoize chart options to prevent unnecessary re-renders
  const chartOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#fff',
        titleColor: '#000',
        bodyColor: '#666',
        borderColor: '#fc5d01',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function(context: any) {
            return `${context.parsed.y} ${context.label.toLowerCase()}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#eee',
        },
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: '#666',
          font: {
            size: 12
          }
        }
      }
    },
    animation: {
      duration: 1000 // Reduced animation time for faster rendering
    }
  }), []);

  // Show error message if there was an error loading the data
  if (error) {
    return (
      <div className="p-6 bg-white rounded-xl shadow-md">
        <div className="text-red-500 font-medium">{error}</div>
        <button 
          onClick={fetchStats} 
          className="mt-4 px-4 py-2 bg-[#fc5d01] text-white rounded hover:bg-[#fd7f33] transition-colors"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Tổng người dùng</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">{stats.studentCount + stats.teacherCount}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Tất cả người dùng trong hệ thống</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Lớp học</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">{stats.classCount}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Lớp học đang hoạt động</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Học viên</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">{stats.studentCount}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Tổng số học viên</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Giảng viên</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">{stats.teacherCount}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Tổng số giảng viên</div>
            </div>
          </>
        )}
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Bài tập đã nộp</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">{stats.submissionCount}</div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Tổng số bài tập đã nộp</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Tỷ lệ hoàn thành</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">
                {stats.classProgress.length > 0 
                  ? Math.round(stats.classProgress.reduce((sum, c) => sum + c.completionRate, 0) / stats.classProgress.length)
                  : 0}%
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Tỷ lệ hoàn thành trung bình</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Tỷ lệ học viên</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">
                {stats.studentCount + stats.teacherCount > 0 
                  ? Math.round((stats.studentCount / (stats.studentCount + stats.teacherCount)) * 100)
                  : 0}%
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Phần trăm học viên trong hệ thống</div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-500">Bài tập/Học viên</span>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#fc5d01]">
                {stats.studentCount > 0 
                  ? Math.round((stats.submissionCount / stats.studentCount) * 10) / 10
                  : 0}
              </div>
              <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600">Số bài tập trung bình mỗi học viên</div>
            </div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {isLoading ? (
          <>
            <ChartSkeleton height={300} />
            <ChartSkeleton height={300} />
          </>
        ) : (
          <>
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
              <h3 className="text-base sm:text-lg font-semibold text-[#fc5d01] mb-4 sm:mb-6">Thống kê tổng quan</h3>
              <div className="h-[250px] sm:h-[300px]">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>

            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
              <h3 className="text-base sm:text-lg font-semibold text-[#fc5d01] mb-4 sm:mb-6">Phân bố người dùng</h3>
              <div className="h-[250px] sm:h-[300px] flex items-center justify-center">
                <Doughnut 
                  data={userDistributionChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: {
                          font: {
                            size: 12
                          },
                          color: '#666'
                        }
                      },
                      tooltip: {
                        backgroundColor: '#fff',
                        titleColor: '#000',
                        bodyColor: '#666',
                        borderColor: '#fc5d01',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
                        callbacks: {
                          label: function(context) {
                            const total = stats.studentCount + stats.teacherCount;
                            const value = context.raw as number;
                            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                            return `${context.label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    cutout: '60%'
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Class Progress */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
        <h3 className="text-base sm:text-lg font-semibold text-[#fc5d01] mb-4 sm:mb-6">Tiến độ các lớp học</h3>
        <div className="h-[300px] sm:h-[400px]">
          {isLoading ? (
            <ChartSkeleton height={400} />
          ) : (
            <Bar 
              data={classProgressChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: '#fff',
                    titleColor: '#000',
                    bodyColor: '#666',
                    borderColor: '#fc5d01',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                      label: function(context) {
                        return `Tỷ lệ hoàn thành: ${context.raw}%`;
                      }
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: '#eee',
                    },
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      },
                      color: '#666',
                      font: {
                        size: 12
                      }
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      color: '#666',
                      font: {
                        size: 12
                      }
                    }
                  }
                },
                animation: {
                  duration: 1000
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Daily Homework and Target Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold text-[#fc5d01] mb-4 sm:mb-6">Bài tập hàng ngày</h3>
          <DailyHome />
        </div>
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold text-[#fc5d01] mb-4 sm:mb-6">Mục tiêu hàng ngày</h3>
          <DailyTargetTable />
        </div>
      </div>
    </div>
  );
};

export default SystemStats;
