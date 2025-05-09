'use client';

import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';

interface MocktestFilterBarProps {
  selectedTimeframe: string;
  setSelectedTimeframe: (timeframe: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (teacherId: string) => void;
  selectedClass: string;
  setSelectedClass: (classId: string) => void;
  teachers: User[];
  classes: Class[];
}

export default function MocktestFilterBar({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes
}: MocktestFilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-3 sm:p-4 rounded-lg shadow-sm">
      <h2 className="text-lg sm:text-xl font-bold text-[#fc5d01]">Theo dõi Feedback Mocktest</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 w-full md:w-auto">
        {/* Timeframe filter */}
        <div className="relative">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] bg-white"
          >
            <option value="7">7 ngày qua</option>
            <option value="30">30 ngày qua</option>
            <option value="90">90 ngày qua</option>
            <option value="365">365 ngày qua</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Teacher filter */}
        <div className="relative">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] bg-white"
          >
            <option value="all">Tất cả giảng viên</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name || teacher.email}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        {/* Class filter */}
        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01] bg-white"
          >
            <option value="all">Tất cả lớp học</option>
            {classes.map(classData => (
              <option key={classData.id} value={classData.id}>
                {classData.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
