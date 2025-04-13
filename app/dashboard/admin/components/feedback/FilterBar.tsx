'use client';

import { Class } from '@/app/firebase/services/types';
import { User } from '@/app/firebase/services/user';

interface FilterBarProps {
  selectedTimeframe: string;
  setSelectedTimeframe: (timeframe: string) => void;
  selectedTeacher: string;
  setSelectedTeacher: (teacherId: string) => void;
  selectedClass: string;
  setSelectedClass: (classId: string) => void;
  teachers: User[];
  classes: Class[];
}

export default function FilterBar({
  selectedTimeframe,
  setSelectedTimeframe,
  selectedTeacher,
  setSelectedTeacher,
  selectedClass,
  setSelectedClass,
  teachers,
  classes
}: FilterBarProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <h2 className="text-xl font-bold text-gray-900">Theo dõi Feedback Bài tập hàng ngày</h2>
      
      <div className="flex flex-wrap gap-3">
        {/* Timeframe filter */}
        <select
          value={selectedTimeframe}
          onChange={(e) => setSelectedTimeframe(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
        >
          <option value="7">7 ngày qua</option>
          <option value="30">30 ngày qua</option>
          <option value="90">90 ngày qua</option>
          <option value="365">365 ngày qua</option>
        </select>
        
        {/* Teacher filter */}
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
        >
          <option value="all">Tất cả giảng viên</option>
          {teachers.map(teacher => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name || teacher.email}
            </option>
          ))}
        </select>
        
        {/* Class filter */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
        >
          <option value="all">Tất cả lớp học</option>
          {classes.map(classData => (
            <option key={classData.id} value={classData.id}>
              {classData.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
