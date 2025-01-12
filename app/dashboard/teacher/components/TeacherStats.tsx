'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';

export default function TeacherStats() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    activeStudents: 0,
    completionRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [studentProgressData, setStudentProgressData] = useState({
    labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    datasets: [{
      label: 'Tỷ lệ hoàn thành',
      data: [65, 72, 68, 75, 82, 78, 70],
      borderColor: '#fc5d01',
      tension: 0.4
    }]
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!session?.user?.email) {
        setError('Không thể xác định giảng viên. Vui lòng đăng nhập lại.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Get classes
        const classesRef = collection(db, 'classes');
        const classesQuery = query(classesRef, where('teacherId', '==', session.user.email));
        const classesSnapshot = await getDocs(classesQuery);
        const totalClasses = classesSnapshot.size;

        // Get students
        const usersRef = collection(db, 'users');
        const studentsQuery = query(
          usersRef,
          where('teacherId', '==', session.user.email),
          where('role', '==', 'student')
        );
        const studentsSnapshot = await getDocs(studentsQuery);
        const totalStudents = studentsSnapshot.size;

        // Calculate active students (submitted homework in last 7 days)
        const activeStudents = Math.floor(totalStudents * 0.85); // Placeholder calculation
        const completionRate = totalStudents > 0 ? Math.floor((activeStudents / totalStudents) * 100) : 0;

        setStats({
          totalClasses,
          totalStudents,
          activeStudents,
          completionRate
        });
      } catch (error) {
        console.error('Error fetching teacher stats:', error);
        setError('Không thể tải thông tin. Vui lòng thử lại sau.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [session?.user?.email]);

  if (error) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center space-x-4 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-medium">Đã xảy ra lỗi</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#fedac2] rounded-full"></div>
                <div className="w-20 h-4 bg-[#fedac2] rounded opacity-50"></div>
              </div>
              <div className="space-y-3">
                <div className="h-8 w-16 bg-[#fedac2] rounded"></div>
                <div className="h-4 w-32 bg-[#fedac2] rounded opacity-30"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-xl shadow-lg animate-pulse">
          <div className="h-8 w-48 bg-[#fedac2] rounded mb-4"></div>
          <div className="h-64 bg-[#fedac2] rounded opacity-30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Total Classes */}
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
              <div className="text-3xl font-bold text-[#fc5d01]">{stats.totalClasses}</div>
              <div className="text-sm text-[#fc5d01] opacity-75">lớp</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Lớp đang phụ trách</div>
          </div>
        </div>

        {/* Total Students */}
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
              <div className="text-3xl font-bold text-[#fc5d01]">{stats.totalStudents}</div>
              <div className="text-sm text-[#fc5d01] opacity-75">học viên</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Tổng số học viên</div>
          </div>
        </div>

        {/* Active Students */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Hoạt động</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fc5d01]">{stats.activeStudents}</div>
              <div className="text-sm text-[#fc5d01] opacity-75">học viên</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Hoạt động trong 7 ngày</div>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Hoàn thành</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fc5d01]">{stats.completionRate}%</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Tỷ lệ hoàn thành bài tập</div>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <div className="bg-white p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold text-[#fc5d01] mb-6">Tiến độ học tập trong tuần</h3>
        <div className="h-64">
          <Line 
            data={studentProgressData}
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
                    color: '#eee'
                  }
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}
