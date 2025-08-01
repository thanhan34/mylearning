'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Attendance, AttendanceRecord, AttendanceStats } from '../../../../types/attendance';
import { Class } from '../../../../types/admin';
import { 
  getAttendanceStatsForAllClasses, 
  getAttendanceByClass, 
  createDefaultAttendanceForClass,
  bulkUpdateAttendanceStatus,
  deleteAttendance
} from '@/app/firebase/services/attendance';
import { getClassById } from '@/app/firebase/services/class';
import SuccessNotification from '@/app/components/SuccessNotification';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import AttendanceOverviewTable from '@/app/dashboard/components/AttendanceOverviewTable';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/app/firebase/config';

const AttendanceManagement = () => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);
  const [notification, setNotification] = useState<{message: string, show: boolean}>({message: '', show: false});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [attendanceToDelete, setAttendanceToDelete] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState<'detail' | 'overview'>('detail');
  const [studentAttendance, setStudentAttendance] = useState<{
    [studentId: string]: {
      status: 'present' | 'absent' | 'late' | 'excused';
      notes: string;
    }
  }>({});

  // Fetch all classes and attendance stats
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch all classes
        const classesRef = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesRef);
        const classesData = classesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Class));
        
        setClasses(classesData);
        
        // Fetch attendance stats
        const attendanceStats = await getAttendanceStatsForAllClasses();
        setStats(attendanceStats);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Fetch attendance records when class is selected
  useEffect(() => {
    const fetchAttendanceRecords = async () => {
      if (!selectedClassId) return;
      
      try {
        setLoading(true);
        
        // Fetch class details
        const classData = await getClassById(selectedClassId);
        setSelectedClass(classData);
        
        // Fetch attendance records
        const records = await getAttendanceByClass(selectedClassId);
        setAttendanceRecords(records);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching attendance records:', error);
        setLoading(false);
      }
    };
    
    fetchAttendanceRecords();
  }, [selectedClassId]);

  // Initialize student attendance when attendance record is selected
  useEffect(() => {
    if (selectedAttendance) {
      const studentAttendanceMap: {
        [studentId: string]: {
          status: 'present' | 'absent' | 'late' | 'excused';
          notes: string;
        }
      } = {};
      
      selectedAttendance.students.forEach(student => {
        studentAttendanceMap[student.studentId] = {
          status: student.status,
          notes: student.notes || ''
        };
      });
      
      setStudentAttendance(studentAttendanceMap);
    } else {
      setStudentAttendance({});
    }
  }, [selectedAttendance]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedAttendance(null);
    setEditMode(false);
  };

  const handleAttendanceSelect = (attendance: Attendance) => {
    setSelectedAttendance(attendance);
    setSelectedDate(attendance.date);
    setEditMode(false);
  };

  const handleCreateAttendance = async () => {
    if (!selectedClassId || !selectedDate || !session?.user?.email) return;
    
    try {
      setLoading(true);
      
      const attendanceId = await createDefaultAttendanceForClass(
        selectedClassId,
        selectedDate,
        session.user.email,
        'absent' // Default all students to absent
      );
      
      if (attendanceId) {
        // Refresh attendance records
        const records = await getAttendanceByClass(selectedClassId);
        setAttendanceRecords(records);
        
        // Find and select the newly created attendance
        const newAttendance = records.find(record => record.date === selectedDate);
        if (newAttendance) {
          setSelectedAttendance(newAttendance);
          setEditMode(true);
        }
        
        setNotification({
          message: `Đã tạo điểm danh cho ngày ${selectedDate}`,
          show: true
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error creating attendance:', error);
      setLoading(false);
    }
  };

  const handleDeleteAttendance = (attendanceId: string) => {
    setAttendanceToDelete(attendanceId);
    setShowConfirmDelete(true);
  };

  const confirmDeleteAttendance = async () => {
    if (!attendanceToDelete) return;
    
    try {
      setLoading(true);
      
      const success = await deleteAttendance(attendanceToDelete);
      
      if (success) {
        // Refresh attendance records
        const records = await getAttendanceByClass(selectedClassId);
        setAttendanceRecords(records);
        
        if (selectedAttendance?.id === attendanceToDelete) {
          setSelectedAttendance(null);
        }
        
        setNotification({
          message: 'Đã xóa điểm danh',
          show: true
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error deleting attendance:', error);
      setLoading(false);
    }
    
    setShowConfirmDelete(false);
    setAttendanceToDelete(null);
  };

  const handleStatusChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        notes
      }
    }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedAttendance) return;
    
    try {
      setLoading(true);
      
      // Convert studentAttendance map to array of updates
      const studentUpdates = Object.entries(studentAttendance).map(([studentId, data]) => ({
        studentId,
        status: data.status,
        notes: data.notes
      }));
      
      const success = await bulkUpdateAttendanceStatus(
        selectedAttendance.id,
        studentUpdates
      );
      
      if (success) {
        // Refresh attendance records
        const records = await getAttendanceByClass(selectedClassId);
        setAttendanceRecords(records);
        
        // Update selected attendance
        const updatedAttendance = records.find(record => record.id === selectedAttendance.id);
        if (updatedAttendance) {
          setSelectedAttendance(updatedAttendance);
        }
        
        setNotification({
          message: 'Đã lưu điểm danh',
          show: true
        });
        
        setEditMode(false);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error saving attendance:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      case 'late':
        return 'bg-yellow-100 text-yellow-800';
      case 'excused':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'present':
        return 'Có mặt';
      case 'absent':
        return 'Vắng mặt';
      case 'late':
        return 'Đi muộn';
      case 'excused':
        return 'Có phép';
      default:
        return status;
    }
  };

  if (loading && !stats && classes.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-[#fedac2] rounded w-1/4 mb-6"></div>
          <div className="h-32 bg-[#fedac2] rounded opacity-50 mb-6"></div>
          <div className="h-64 bg-[#fedac2] rounded opacity-30"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[#fc5d01] mb-6">Quản lý điểm danh</h2>
      
      {/* Overview Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-400">Buổi học</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-[#fc5d01]">{stats.totalSessions}</div>
                <div className="text-sm text-[#fc5d01] opacity-75">buổi</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Tổng số buổi điểm danh</div>
            </div>
          </div>

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
              <div className="text-sm text-gray-600 mt-1">Tổng số học viên được điểm danh</div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-[#fedac2] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-400">Tỷ lệ tham gia</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline space-x-2">
                <div className="text-3xl font-bold text-[#fc5d01]">{stats.averageAttendance}%</div>
              </div>
              <div className="text-sm text-gray-600 mt-1">Tỷ lệ tham gia trung bình</div>
            </div>
          </div>
        </div>
      )}
      
      {/* Class Selection and Date Picker */}
      <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn lớp học</label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-[#fc5d01] focus:border-[#fc5d01]"
            >
              <option value="">-- Chọn lớp học --</option>
              {classes.map(classItem => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Chọn ngày</label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-[#fc5d01] focus:border-[#fc5d01]"
              />
              <button
                onClick={handleCreateAttendance}
                disabled={!selectedClassId || !selectedDate}
                className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tạo điểm danh
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* View Mode Tabs */}
      {selectedClassId && (
        <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
          <div className="flex space-x-1 bg-[#fedac2]/20 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('detail')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'detail'
                  ? 'bg-[#fc5d01] text-white shadow-sm'
                  : 'text-[#fc5d01] hover:bg-[#fedac2]/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <span>Điểm danh chi tiết</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('overview')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'overview'
                  ? 'bg-[#fc5d01] text-white shadow-sm'
                  : 'text-[#fc5d01] hover:bg-[#fedac2]/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span>Bảng tổng quan</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Content based on view mode */}
      {selectedClassId && viewMode === 'overview' && (
        <div className="mb-8">
          <AttendanceOverviewTable 
            selectedClass={selectedClass}
            attendanceRecords={attendanceRecords}
          />
        </div>
      )}

      {/* Attendance Records and Student List */}
      {selectedClassId && viewMode === 'detail' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Attendance Records List */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-lg font-semibold text-[#fc5d01] mb-4">Danh sách điểm danh</h3>
            
            {attendanceRecords.length === 0 ? (
              <div className="text-gray-500 text-center py-4">
                Chưa có điểm danh nào cho lớp này
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceRecords.map(record => (
                  <div
                    key={record.id}
                    onClick={() => handleAttendanceSelect(record)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAttendance?.id === record.id
                        ? 'bg-[#fedac2]'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{new Date(record.date).toLocaleDateString('vi-VN')}</div>
                        <div className="text-sm text-gray-500">
                          {record.students.filter(s => s.status === 'present').length} / {record.students.length} học viên có mặt
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteAttendance(record.id);
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Student Attendance */}
          <div className="md:col-span-2">
            {selectedAttendance ? (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-[#fc5d01]">
                    Điểm danh ngày {new Date(selectedAttendance.date).toLocaleDateString('vi-VN')}
                  </h3>
                  <div>
                    {editMode ? (
                      <button
                        onClick={handleSaveAttendance}
                        className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
                      >
                        Lưu
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditMode(true)}
                        className="bg-[#fc5d01] text-white px-4 py-2 rounded-lg hover:bg-[#fd7f33]"
                      >
                        Chỉnh sửa
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#fedac2]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Học viên
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Ghi chú
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedAttendance.students.map(student => (
                        <tr key={student.studentId}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                            <div className="text-sm text-gray-500">{student.studentEmail}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editMode ? (
                              <select
                                value={studentAttendance[student.studentId]?.status || student.status}
                                onChange={(e) => handleStatusChange(
                                  student.studentId, 
                                  e.target.value as 'present' | 'absent' | 'late' | 'excused'
                                )}
                                className="p-2 border border-gray-300 rounded-lg focus:ring-[#fc5d01] focus:border-[#fc5d01]"
                              >
                                <option value="present">Có mặt</option>
                                <option value="absent">Vắng mặt</option>
                                <option value="late">Đi muộn</option>
                                <option value="excused">Có phép</option>
                              </select>
                            ) : (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(student.status)}`}>
                                {getStatusText(student.status)}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {editMode ? (
                              <input
                                type="text"
                                value={studentAttendance[student.studentId]?.notes || student.notes || ''}
                                onChange={(e) => handleNotesChange(student.studentId, e.target.value)}
                                className="p-2 border border-gray-300 rounded-lg focus:ring-[#fc5d01] focus:border-[#fc5d01] w-full"
                                placeholder="Thêm ghi chú..."
                              />
                            ) : (
                              <span className="text-sm text-gray-500">
                                {student.notes || '-'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-[#fedac2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Chọn một bản ghi điểm danh để xem chi tiết</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Notification */}
      {notification.show && (
        <SuccessNotification
          message={notification.message}
          onClose={() => setNotification({message: '', show: false})}
        />
      )}
      
      {/* Confirm Delete Dialog */}
      {showConfirmDelete && (
        <ConfirmDialog
          title="Xóa điểm danh"
          message="Bạn có chắc chắn muốn xóa bản ghi điểm danh này? Hành động này không thể hoàn tác."
          confirmText="Xóa"
          cancelText="Hủy"
          onConfirm={confirmDeleteAttendance}
          onCancel={() => {
            setShowConfirmDelete(false);
            setAttendanceToDelete(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendanceManagement;
