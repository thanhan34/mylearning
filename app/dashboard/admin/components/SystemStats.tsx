'use client';

import { useState, useEffect } from 'react';
import type { SystemStats, User } from '../../../../types/admin';
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

const SystemStats = () => {
  const [stats, setStats] = useState<SystemStats>({
    totalClasses: 0,
    totalAssignments: 0,
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    completionRate: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total classes
      const classesSnapshot = await getDocs(collection(db, 'classes'));
      const totalClasses = classesSnapshot.size;

      // Fetch total assignments
      const assignmentsSnapshot = await getDocs(collection(db, 'assignments'));
      const totalAssignments = assignmentsSnapshot.size;

      // Fetch users and count by role
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const totalUsers = usersSnapshot.size;
      const users = usersSnapshot.docs.map(doc => ({...doc.data(), id: doc.id} as User));
      const totalTeachers = users.filter(user => user.role === 'teacher').length;
      const totalStudents = users.filter(user => user.role === 'student').length;

      // Calculate completion rate from submissions
      const submissionsSnapshot = await getDocs(collection(db, 'submissions'));
      const submissions = submissionsSnapshot.docs.map(doc => doc.data());
      const completedSubmissions = submissions.filter(sub => sub.status === 'completed').length;
      const completionRate = submissions.length > 0 
        ? (completedSubmissions / submissions.length) * 100 
        : 0;

      setStats({
        totalClasses,
        totalAssignments,
        totalUsers,
        totalTeachers,
        totalStudents,
        completionRate,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-6 text-[#fc5d01]">Thống kê tổng quan</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {/* Total Classes */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#fc5d01]">
          <div className="text-sm text-gray-600 mb-2">Tổng số lớp học</div>
          <div className="text-2xl font-bold text-[#fc5d01]">{stats.totalClasses}</div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#fd7f33]">
          <div className="text-sm text-gray-600 mb-2">Tổng số giảng viên</div>
          <div className="text-2xl font-bold text-[#fd7f33]">{stats.totalTeachers}</div>
        </div>

        {/* Total Students */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#ffac7b]">
          <div className="text-sm text-gray-600 mb-2">Tổng số học viên</div>
          <div className="text-2xl font-bold text-[#ffac7b]">{stats.totalStudents}</div>
        </div>

        {/* Total Users */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#fdbc94]">
          <div className="text-sm text-gray-600 mb-2">Tổng số người dùng</div>
          <div className="text-2xl font-bold text-[#fdbc94]">{stats.totalUsers}</div>
        </div>

        {/* Total Assignments */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#fedac2]">
          <div className="text-sm text-gray-600 mb-2">Tổng số bài tập</div>
          <div className="text-2xl font-bold text-[#fedac2]">{stats.totalAssignments}</div>
        </div>

        {/* Completion Rate */}
        <div className="bg-white p-6 rounded-lg shadow-lg border-l-4 border-[#fc5d01]">
          <div className="text-sm text-gray-600 mb-2">Tỷ lệ hoàn thành</div>
          <div className="text-2xl font-bold text-[#fc5d01]">
            {stats.completionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-8 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">Tiến độ tổng thể</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-[#fc5d01] h-4 rounded-full transition-all duration-500"
            style={{ width: `${stats.completionRate}%` }}
          />
        </div>
        <div className="text-sm text-gray-600 mt-2">
          {stats.completionRate.toFixed(1)}% bài tập đã hoàn thành
        </div>
      </div>
    </div>
  );
};

export default SystemStats;
