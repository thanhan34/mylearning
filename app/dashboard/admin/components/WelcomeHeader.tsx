'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../../firebase/config';

interface Stats {
  students: number;
  classes: number;
  teachers: number;
}

export default function WelcomeHeader() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<Stats>({
    students: 0,
    classes: 0,
    teachers: 0
  });

  useEffect(() => {
    fetchQuickStats();
  }, []);

  const fetchQuickStats = async () => {
    try {
      // Get total students
      const studentsQuery = query(collection(db, 'users'), where('role', '==', 'student'));
      const studentsSnapshot = await getDocs(studentsQuery);
      const totalStudents = studentsSnapshot.size;

      // Get total classes
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const totalClasses = classesSnapshot.size;

      // Get total teachers
      const teachersQuery = query(collection(db, 'users'), where('role', '==', 'teacher'));
      const teachersSnapshot = await getDocs(teachersQuery);
      const totalTeachers = teachersSnapshot.size;

      setStats({
        students: totalStudents,
        classes: totalClasses,
        teachers: totalTeachers
      });
    } catch (error) {
      console.error('Error fetching quick stats:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-[#fedac2] rounded-2xl p-8 mb-8 shadow-lg">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#fc5d01] mb-2">
            Xin chào, {session?.user?.name || 'Admin'}
          </h1>
          <p className="text-gray-600 text-lg">
            Quản trị viên
          </p>
          <p className="text-gray-600 mt-2 max-w-2xl">
            Quản lý hệ thống và theo dõi hoạt động của giảng viên và học viên. Xem thống kê, quản lý tài khoản và cài đặt hệ thống.
          </p>
        </div>
        <div className="text-right">
          <p className="text-[#fc5d01] font-medium">
            {new Date().toLocaleDateString('vi-VN', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Học viên</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#fc5d01]">{stats.students}</span>
            <span className="text-gray-600">học viên</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Tổng số học viên đang học</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Lớp học</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#fc5d01]">{stats.classes}</span>
            <span className="text-gray-600">lớp</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Lớp học đang hoạt động</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-500">Giảng viên</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-[#fc5d01]">{stats.teachers}</span>
            <span className="text-gray-600">giảng viên</span>
          </div>
          <p className="text-sm text-gray-500 mt-2">Giảng viên đang giảng dạy</p>
        </div>
      </div>
    </div>
  );
}
