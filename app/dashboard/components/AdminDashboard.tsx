'use client';

import { useEffect, useState } from 'react';
import DailyTargetTable from './DailyTargetTable';
import DailyHome from './DailyHome';
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
      backgroundColor: '#fc5d01',
    }]
  };
  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Học viên</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fc5d01]">
                {loading ? "..." : stats?.studentCount || 0}
              </div>
              <div className="text-sm text-[#fc5d01] opacity-75">học viên</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Tổng số học viên đang học</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Lớp học</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fc5d01]">
                {loading ? "..." : stats?.classCount || 0}
              </div>
              <div className="text-sm text-[#fc5d01] opacity-75">lớp</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Lớp học đang hoạt động</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Giảng viên</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fc5d01]">
                {loading ? "..." : stats?.teacherCount || 0}
              </div>
              <div className="text-sm text-[#fc5d01] opacity-75">giảng viên</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Giảng viên đang giảng dạy</div>
          </div>
        </div>
      </div>

      {/* Class Progress Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Tiến độ các lớp</h3>
        <div className="h-64">
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
                    color: '#666'
                  },
                  grid: {
                    color: '#eee'
                  }
                },
                x: {
                  ticks: {
                    color: '#666'
                  },
                  grid: {
                    display: false
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Daily Targets and Homework */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Mục tiêu hàng ngày</h3>
          <DailyTargetTable />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Bài tập về nhà</h3>
          <DailyHome />
        </div>
      </div>
    </div>
  );
}
