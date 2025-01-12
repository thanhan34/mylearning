'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { db } from '../../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Class, User } from '../../../../types/admin';

interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
}

const TeacherStats = () => {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TeacherStats>({
    totalClasses: 0,
    totalStudents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      fetchStats();
    }
  }, [session?.user?.email]);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const teacherEmail = session?.user?.email;
      if (!teacherEmail) {
        console.error('No teacher email found');
        setError('Không thể xác định giảng viên. Vui lòng đăng nhập lại.');
        return;
      }

      console.log('Fetching stats for teacher:', teacherEmail);
      
      // Get classes where teacherId matches teacher's email
      const classesRef = collection(db, 'classes');
      const classesQuery = query(classesRef, where('teacherId', '==', teacherEmail));
      const classesSnapshot = await getDocs(classesQuery);
      const totalClasses = classesSnapshot.size;
      console.log('Classes found:', totalClasses);

      // Get students where teacherId matches teacher's email
      const usersRef = collection(db, 'users');
      const studentsQuery = query(
        usersRef,
        where('teacherId', '==', teacherEmail),
        where('role', '==', 'student')
      );
      const studentsSnapshot = await getDocs(studentsQuery);
      const totalStudents = studentsSnapshot.size;
      console.log('Students found:', totalStudents);

      console.log('Stats fetched:', { totalClasses, totalStudents });
      setStats({
        totalClasses,
        totalStudents,
      });
    } catch (error) {
      console.error('Error fetching teacher stats:', error);
      setError('Không thể tải thống kê. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="relative z-10 bg-gradient-to-br from-white to-[#fedac2] rounded-xl p-8 shadow-lg">
        <div className="flex items-center mb-8">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-[#fedac2] rounded mb-2"></div>
            <div className="h-4 w-32 bg-[#fedac2] rounded opacity-70"></div>
          </div>
          <div className="ml-auto">
            <div className="h-4 w-40 bg-[#fedac2] rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-[#fedac2] rounded-full animate-pulse"></div>
                <div className="w-20 h-4 bg-[#fedac2] rounded animate-pulse opacity-50"></div>
              </div>
              <div className="space-y-3">
                <div className="flex items-baseline space-x-2">
                  <div className="h-8 w-16 bg-[#fedac2] rounded animate-pulse"></div>
                  <div className="h-4 w-12 bg-[#fedac2] rounded animate-pulse opacity-50"></div>
                </div>
                <div className="h-4 w-32 bg-[#fedac2] rounded animate-pulse opacity-30"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 bg-gradient-to-br from-white to-[#fedac2] rounded-xl p-8 shadow-lg">
        <div className="flex items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-[#fc5d01]">Thống kê của bạn</h2>
            <p className="text-sm text-gray-500 mt-1">Đã xảy ra lỗi</p>
          </div>
          <div className="ml-auto text-sm text-gray-500">
            {new Date().toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-lg border border-red-100">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-lg font-medium text-red-500">Không thể tải thống kê</div>
              <div className="text-sm text-gray-600 mt-1">{error}</div>
            </div>
            <button 
              onClick={() => fetchStats()} 
              className="px-4 py-2 bg-[#fc5d01] text-white rounded-lg hover:bg-[#fd7f33] transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 bg-gradient-to-br from-white to-[#fedac2] rounded-xl p-8 shadow-lg">
      <div className="flex items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#fc5d01]">Thống kê của bạn</h2>
          <p className="text-sm text-gray-500 mt-1">Cập nhật mới nhất</p>
        </div>
        <div className="ml-auto text-sm text-gray-500">
          {new Date().toLocaleDateString('vi-VN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Total Classes */}
        <div className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#fedac2] to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
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
        <div className="group bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#fedac2] to-transparent opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fd7f33]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-400">Học viên</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline space-x-2">
              <div className="text-3xl font-bold text-[#fd7f33]">{stats.totalStudents}</div>
              <div className="text-sm text-[#fd7f33] opacity-75">học viên</div>
            </div>
            <div className="text-sm text-gray-600 mt-1">Học viên đang theo học</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStats;
