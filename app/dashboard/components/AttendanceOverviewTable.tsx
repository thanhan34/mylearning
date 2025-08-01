'use client';

import { useState, useEffect } from 'react';
import { Attendance } from '../../../../types/attendance';
import { Class } from '../../../../types/admin';
import { 
  RiCheckLine, 
  RiCloseLine, 
  RiTimeLine, 
  RiUserLine,
  RiCalendarLine,
  RiBarChartLine
} from 'react-icons/ri';

interface AttendanceOverviewTableProps {
  selectedClass: Class | null;
  attendanceRecords: Attendance[];
}

interface StudentAttendanceData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  attendanceByDate: {
    [date: string]: 'present' | 'absent' | 'late' | 'excused';
  };
  stats: {
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    excusedCount: number;
    attendanceRate: number;
  };
}

const AttendanceOverviewTable = ({ selectedClass, attendanceRecords }: AttendanceOverviewTableProps) => {
  const [studentData, setStudentData] = useState<StudentAttendanceData[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'attendanceRate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!selectedClass || attendanceRecords.length === 0) {
      setStudentData([]);
      return;
    }

    // Process attendance data
    const processedData: StudentAttendanceData[] = selectedClass.students.map(student => {
      const attendanceByDate: { [date: string]: 'present' | 'absent' | 'late' | 'excused' } = {};
      let presentCount = 0;
      let absentCount = 0;
      let lateCount = 0;
      let excusedCount = 0;

      // Initialize all dates with absent status
      attendanceRecords.forEach(record => {
        attendanceByDate[record.date] = 'absent';
      });

      // Update with actual attendance data
      attendanceRecords.forEach(record => {
        const studentRecord = record.students.find(s => s.studentId === student.id);
        if (studentRecord) {
          attendanceByDate[record.date] = studentRecord.status;
          
          switch (studentRecord.status) {
            case 'present':
              presentCount++;
              break;
            case 'absent':
              absentCount++;
              break;
            case 'late':
              lateCount++;
              break;
            case 'excused':
              excusedCount++;
              break;
          }
        }
      });

      const totalSessions = attendanceRecords.length;
      const attendanceRate = totalSessions > 0 
        ? Math.round(((presentCount + lateCount + excusedCount) / totalSessions) * 100)
        : 0;

      return {
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        attendanceByDate,
        stats: {
          totalSessions,
          presentCount,
          absentCount,
          lateCount,
          excusedCount,
          attendanceRate
        }
      };
    });

    setStudentData(processedData);
  }, [selectedClass, attendanceRecords]);

  const getStatusIcon = (status: 'present' | 'absent' | 'late' | 'excused') => {
    switch (status) {
      case 'present':
        return <RiCheckLine className="w-5 h-5 text-green-600" />;
      case 'absent':
        return <RiCloseLine className="w-5 h-5 text-red-600" />;
      case 'late':
        return <RiTimeLine className="w-5 h-5 text-yellow-600" />;
      case 'excused':
        return <RiUserLine className="w-5 h-5 text-blue-600" />;
      default:
        return <RiCloseLine className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBgColor = (status: 'present' | 'absent' | 'late' | 'excused') => {
    switch (status) {
      case 'present':
        return 'bg-green-50 hover:bg-green-100';
      case 'absent':
        return 'bg-red-50 hover:bg-red-100';
      case 'late':
        return 'bg-yellow-50 hover:bg-yellow-100';
      case 'excused':
        return 'bg-blue-50 hover:bg-blue-100';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  const sortedStudentData = [...studentData].sort((a, b) => {
    if (sortBy === 'name') {
      const comparison = a.studentName.localeCompare(b.studentName);
      return sortOrder === 'asc' ? comparison : -comparison;
    } else {
      const comparison = a.stats.attendanceRate - b.stats.attendanceRate;
      return sortOrder === 'asc' ? comparison : -comparison;
    }
  });

  const handleSort = (field: 'name' | 'attendanceRate') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (!selectedClass) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <RiCalendarLine className="h-16 w-16 mx-auto mb-4 text-[#fedac2]" />
        <h3 className="text-lg font-semibold text-[#fc5d01] mb-2">Chọn lớp học</h3>
        <p className="text-gray-600">Vui lòng chọn một lớp học để xem bảng điểm danh tổng quan</p>
      </div>
    );
  }

  if (attendanceRecords.length === 0) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center">
        <RiBarChartLine className="h-16 w-16 mx-auto mb-4 text-[#fedac2]" />
        <h3 className="text-lg font-semibold text-[#fc5d01] mb-2">Chưa có dữ liệu điểm danh</h3>
        <p className="text-gray-600">Lớp học này chưa có buổi điểm danh nào. Hãy tạo điểm danh đầu tiên!</p>
      </div>
    );
  }

  // Sort attendance records by date
  const sortedAttendanceRecords = [...attendanceRecords].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#fc5d01] to-[#fd7f33] p-6">
        <h3 className="text-xl font-semibold text-white mb-2">
          Bảng điểm danh tổng quan - {selectedClass.name}
        </h3>
        <div className="flex items-center space-x-6 text-white/90 text-sm">
          <div className="flex items-center space-x-2">
            <RiCalendarLine className="w-4 h-4" />
            <span>Tổng số buổi: {attendanceRecords.length}</span>
          </div>
          <div className="flex items-center space-x-2">
            <RiUserLine className="w-4 h-4" />
            <span>Số học viên: {selectedClass.students.length}</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 bg-[#fedac2]/20 border-b">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <span className="font-medium text-gray-700">Chú thích:</span>
          <div className="flex items-center space-x-2">
            <RiCheckLine className="w-4 h-4 text-green-600" />
            <span>Có mặt</span>
          </div>
          <div className="flex items-center space-x-2">
            <RiCloseLine className="w-4 h-4 text-red-600" />
            <span>Vắng mặt</span>
          </div>
          <div className="flex items-center space-x-2">
            <RiTimeLine className="w-4 h-4 text-yellow-600" />
            <span>Đi muộn</span>
          </div>
          <div className="flex items-center space-x-2">
            <RiUserLine className="w-4 h-4 text-blue-600" />
            <span>Có phép</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-[#fedac2]">
            <tr>
              {/* Student Name Column */}
              <th className="sticky left-0 bg-[#fedac2] px-6 py-4 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-[#fc5d01] transition-colors"
                >
                  <span>Học viên</span>
                  {sortBy === 'name' && (
                    <span className="text-[#fc5d01]">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>

              {/* Date Columns */}
              {sortedAttendanceRecords.map(record => (
                <th key={record.id} className="px-3 py-4 text-center min-w-[100px]">
                  <div className="text-xs font-medium text-gray-700">
                    {new Date(record.date).toLocaleDateString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(record.date).toLocaleDateString('vi-VN', {
                      weekday: 'short'
                    })}
                  </div>
                </th>
              ))}

              {/* Stats Columns */}
              <th className="px-4 py-4 text-center bg-[#fdbc94] border-l-2 border-[#fc5d01]">
                <div className="text-xs font-medium text-gray-700">Tổng buổi</div>
              </th>
              <th className="px-4 py-4 text-center bg-[#fdbc94]">
                <div className="text-xs font-medium text-gray-700">Có mặt</div>
              </th>
              <th className="px-4 py-4 text-center bg-[#fdbc94]">
                <div className="text-xs font-medium text-gray-700">Vắng mặt</div>
              </th>
              <th className="px-4 py-4 text-center bg-[#fdbc94]">
                <div className="text-xs font-medium text-gray-700">Đi muộn</div>
              </th>
              <th className="px-4 py-4 text-center bg-[#fdbc94]">
                <div className="text-xs font-medium text-gray-700">Có phép</div>
              </th>
              <th className="px-4 py-4 text-center bg-[#fdbc94]">
                <button
                  onClick={() => handleSort('attendanceRate')}
                  className="flex items-center justify-center space-x-1 text-xs font-medium text-gray-700 hover:text-[#fc5d01] transition-colors w-full"
                >
                  <span>Tỷ lệ (%)</span>
                  {sortBy === 'attendanceRate' && (
                    <span className="text-[#fc5d01]">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedStudentData.map((student, index) => (
              <tr key={student.studentId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                {/* Student Name */}
                <td className="sticky left-0 bg-inherit px-6 py-4 border-r">
                  <div className="min-w-[200px]">
                    <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                    <div className="text-xs text-gray-500">{student.studentEmail}</div>
                  </div>
                </td>

                {/* Attendance Status for each date */}
                {sortedAttendanceRecords.map(record => {
                  const status = student.attendanceByDate[record.date] || 'absent';
                  return (
                    <td key={record.id} className={`px-3 py-4 text-center ${getStatusBgColor(status)} transition-colors`}>
                      <div className="flex justify-center">
                        {getStatusIcon(status)}
                      </div>
                    </td>
                  );
                })}

                {/* Statistics */}
                <td className="px-4 py-4 text-center bg-[#fedac2]/30 border-l-2 border-[#fc5d01]">
                  <span className="text-sm font-medium text-gray-900">
                    {student.stats.totalSessions}
                  </span>
                </td>
                <td className="px-4 py-4 text-center bg-[#fedac2]/30">
                  <span className="text-sm font-medium text-green-700">
                    {student.stats.presentCount}
                  </span>
                </td>
                <td className="px-4 py-4 text-center bg-[#fedac2]/30">
                  <span className="text-sm font-medium text-red-700">
                    {student.stats.absentCount}
                  </span>
                </td>
                <td className="px-4 py-4 text-center bg-[#fedac2]/30">
                  <span className="text-sm font-medium text-yellow-700">
                    {student.stats.lateCount}
                  </span>
                </td>
                <td className="px-4 py-4 text-center bg-[#fedac2]/30">
                  <span className="text-sm font-medium text-blue-700">
                    {student.stats.excusedCount}
                  </span>
                </td>
                <td className="px-4 py-4 text-center bg-[#fedac2]/30">
                  <span className={`text-sm font-bold ${
                    student.stats.attendanceRate >= 80 ? 'text-green-700' :
                    student.stats.attendanceRate >= 60 ? 'text-yellow-700' : 'text-red-700'
                  }`}>
                    {student.stats.attendanceRate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="bg-[#fedac2]/20 p-4 border-t">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-[#fc5d01]">
              {Math.round(studentData.reduce((sum, student) => sum + student.stats.attendanceRate, 0) / studentData.length || 0)}%
            </div>
            <div className="text-xs text-gray-600">Tỷ lệ điểm danh trung bình</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-700">
              {studentData.reduce((sum, student) => sum + student.stats.presentCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Tổng lượt có mặt</div>
          </div>
          <div>
            <div className="text-lg font-bold text-red-700">
              {studentData.reduce((sum, student) => sum + student.stats.absentCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Tổng lượt vắng mặt</div>
          </div>
          <div>
            <div className="text-lg font-bold text-yellow-700">
              {studentData.reduce((sum, student) => sum + student.stats.lateCount, 0)}
            </div>
            <div className="text-xs text-gray-600">Tổng lượt đi muộn</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceOverviewTable;
