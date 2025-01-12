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
  }, [session?.user?.email]); // Add email to dependency array

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
      <div className="relative z-10 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thống kê của bạn</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-[#fc5d01]">Đang tải...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative z-10 bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thống kê của bạn</h2>
        <div className="flex justify-center items-center h-32">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thống kê của bạn</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Total Classes */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#fc5d01] hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-2">Số lớp đang phụ trách</div>
          <div className="text-2xl font-bold text-[#fc5d01]">{stats.totalClasses}</div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-[#fd7f33] hover:shadow-lg transition-shadow">
          <div className="text-sm text-gray-600 mb-2">Số học viên của bạn</div>
          <div className="text-2xl font-bold text-[#fd7f33]">{stats.totalStudents}</div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStats;
