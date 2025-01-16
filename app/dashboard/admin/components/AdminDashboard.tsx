'use client';

import { useEffect, useState } from 'react';
import DailyTargetTable from '../../components/DailyTargetTable';
import DailyHome from '../../components/DailyHome';
import { Bar } from 'react-chartjs-2';
import { getAdminStats } from '@/app/firebase/services';

interface AdminStats {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  classProgress: Array<{
    name: string;
    completionRate: number;
  }>;
}

const LoadingSkeleton = () => (
  <div className="animate-pulse">
    <div className="h-8 bg-[#fedac2] rounded w-24 mb-4"></div>
    <div className="h-4 bg-[#fedac2] rounded w-full mb-2"></div>
    <div className="h-4 bg-[#fedac2] rounded w-3/4"></div>
  </div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getAdminStats();
        if (data) {
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const classProgressData = {
    labels: stats?.classProgress.map(c => c.name) || [],
    datasets: [{
      label: 'Tỷ lệ hoàn thành bài tập (%)',
      data: stats?.classProgress.map(c => c.completionRate) || [],
      backgroundColor: '#fd7f33',
      borderRadius: 6,
    }]
  };

  return (
    <div className="space-y-8 p-6 animate-fadeIn">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Học viên</span>
          </div>
          {loading ? <LoadingSkeleton /> : (
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-[#fc5d01]">
                  {stats?.studentCount || 0}
                </div>
                <div className="text-sm text-[#fc5d01] opacity-75">học viên</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Tổng số học viên đang học</div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Lớp học</span>
          </div>
          {loading ? <LoadingSkeleton /> : (
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-[#fc5d01]">
                  {stats?.classCount || 0}
                </div>
                <div className="text-sm text-[#fc5d01] opacity-75">lớp</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Lớp học đang hoạt động</div>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Giảng viên</span>
          </div>
          {loading ? <LoadingSkeleton /> : (
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-[#fc5d01]">
                  {stats?.teacherCount || 0}
                </div>
                <div className="text-sm text-[#fc5d01] opacity-75">giảng viên</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Giảng viên đang giảng dạy</div>
            </div>
          )}
        </div>
      </div>

      {/* Class Progress Chart */}
      <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Tiến độ các lớp
        </h3>
        <div className="h-64">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-pulse flex space-x-4">
                <div className="h-48 w-full bg-[#fedac2] rounded"></div>
              </div>
            </div>
          ) : (
            <Bar 
              data={classProgressData}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      callback: (value) => `${value}%`,
                      color: '#666',
                      font: {
                        size: 12
                      }
                    },
                    grid: {
                      color: '#eee'
                    }
                  },
                  x: {
                    ticks: {
                      color: '#666',
                      font: {
                        size: 12
                      }
                    },
                    grid: {
                      display: false
                    }
                  }
                },
                animation: {
                  duration: 1000,
                  easing: 'easeInOutQuart'
                },
                hover: {
                  mode: 'index',
                  intersect: false
                }
              }}
            />
          )}
        </div>
      </div>

      {/* Daily Targets and Homework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-semibold text-[#fc5d01] mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Mục tiêu hàng ngày
          </h3>
          <DailyTargetTable />
        </div>
        <div className="bg-gradient-to-br from-white to-[#fedac2]/10 p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-semibold text-[#fc5d01] mb-6 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Bài tập về nhà
          </h3>
          <DailyHome />
        </div>
      </div>
    </div>
  );
}
