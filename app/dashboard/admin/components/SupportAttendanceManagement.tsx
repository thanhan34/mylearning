import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { SupportClass, SupportAttendance, SupportAttendanceRecord } from '../../../../types/support-speaking';
import { 
  getSupportClassById, 
  createDefaultSupportAttendanceForClass,
  getSupportAttendanceByClassAndDate,
  updateSupportAttendance
} from '../../../firebase/services/support-speaking';
import { getUserByEmail } from '../../../firebase/services/user';
import ConfirmDialog from '../../../components/ConfirmDialog';

interface SupportAttendanceManagementProps {
  supportClassId: string;
  isAdmin?: boolean;
}

const SupportAttendanceManagement: React.FC<SupportAttendanceManagementProps> = ({ 
  supportClassId,
  isAdmin = false
}) => {
  const { data: session } = useSession();
  const [supportClass, setSupportClass] = useState<SupportClass | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<SupportAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [attendanceId, setAttendanceId] = useState<string | null>(null);
  const [canManageAttendance, setCanManageAttendance] = useState(false);
  
  // Load support class data
  const loadSupportClass = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const classData = await getSupportClassById(supportClassId);
      
      if (classData) {
        setSupportClass(classData);
        
        // Check if current user is the assigned teacher or an admin
        if (isAdmin) {
          setCanManageAttendance(true);
        } else if (session?.user?.email) {
          const userEmail = session.user.email;
          const teacherId = classData.teacherId;
          
          // Get teacher by ID to compare emails
          const teacher = await getUserByEmail(userEmail);
          setCanManageAttendance(teacher?.id === teacherId || teacher?.email === teacherId);
        }
      } else {
        setError('Support class not found.');
      }
    } catch (err) {
      console.error('Error loading support class:', err);
      setError('Failed to load support class. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Load attendance for the selected date
  const loadAttendance = async () => {
    try {
      if (!supportClassId || !date) return;
      
      setLoading(true);
      setError(null);
      
      const attendance = await getSupportAttendanceByClassAndDate(supportClassId, date);
      
      if (attendance) {
        setAttendanceRecords(attendance.students);
        setAttendanceId(attendance.id);
      } else {
        setAttendanceRecords([]);
        setAttendanceId(null);
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      setError('Failed to load attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadSupportClass();
  }, [supportClassId]);
  
  useEffect(() => {
    loadAttendance();
  }, [supportClassId, date]);
  
  // Create default attendance
  const handleCreateAttendance = async () => {
    try {
      if (!supportClassId || !date || !session?.user?.email) {
        setError('Missing required information.');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      const newAttendanceId = await createDefaultSupportAttendanceForClass(
        supportClassId,
        date,
        session.user.email,
        'present'
      );
      
      if (newAttendanceId) {
        setAttendanceId(newAttendanceId);
        await loadAttendance();
      } else {
        setError('Failed to create attendance. Please try again.');
      }
    } catch (err) {
      console.error('Error creating attendance:', err);
      setError('Failed to create attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Update attendance status
  const handleStatusChange = async (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    try {
      if (!attendanceId) {
        setError('No attendance record found. Please create one first.');
        return;
      }
      
      // Update local state first for immediate feedback
      const updatedRecords = attendanceRecords.map(record => {
        if (record.studentId === studentId) {
          return { ...record, status };
        }
        return record;
      });
      
      setAttendanceRecords(updatedRecords);
      
      // Update in database
      const success = await updateSupportAttendance(attendanceId, updatedRecords);
      
      if (!success) {
        // Revert local state if update failed
        await loadAttendance();
        setError('Failed to update attendance. Please try again.');
      }
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError('Failed to update attendance. Please try again.');
      // Revert local state
      await loadAttendance();
    }
  };
  
  // Handle date change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
  };
  
  if (loading && !supportClass) {
    return (
      <div className="flex justify-center p-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fc5d01]"></div>
      </div>
    );
  }
  
  if (error && !supportClass) {
    return (
      <div className="p-2">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }
  
  if (!supportClass) {
    return (
      <div className="p-2">
        <p>Support class not found.</p>
      </div>
    );
  }
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 text-[#fc5d01]">
        Attendance for {supportClass.name}
      </h3>
      
      <div className="mb-6 flex items-end gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#fc5d01] focus:border-transparent"
            value={date}
            onChange={handleDateChange}
          />
        </div>
        
        {!attendanceId && canManageAttendance && (
          <button
            onClick={() => setShowConfirmDialog(true)}
            className="px-4 py-2 bg-[#fc5d01] text-white rounded-md hover:bg-[#fd7f33] transition-colors"
          >
            Create Attendance
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}
      
      {loading && attendanceId ? (
        <div className="flex justify-center p-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#fc5d01]"></div>
        </div>
      ) : attendanceId ? (
        <div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendanceRecords.map((record) => (
                  <tr key={record.studentId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{record.studentName}</div>
                      <div className="text-sm text-gray-500">{record.studentEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {canManageAttendance ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleStatusChange(record.studentId, 'present')}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              record.status === 'present'
                                ? 'bg-green-100 text-green-800 ring-2 ring-green-600'
                                : 'bg-gray-100 text-gray-800 hover:bg-green-50'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.studentId, 'absent')}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              record.status === 'absent'
                                ? 'bg-red-100 text-red-800 ring-2 ring-red-600'
                                : 'bg-gray-100 text-gray-800 hover:bg-red-50'
                            }`}
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.studentId, 'late')}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              record.status === 'late'
                                ? 'bg-yellow-100 text-yellow-800 ring-2 ring-yellow-600'
                                : 'bg-gray-100 text-gray-800 hover:bg-yellow-50'
                            }`}
                          >
                            Late
                          </button>
                          <button
                            onClick={() => handleStatusChange(record.studentId, 'excused')}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              record.status === 'excused'
                                ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-600'
                                : 'bg-gray-100 text-gray-800 hover:bg-blue-50'
                            }`}
                          >
                            Excused
                          </button>
                        </div>
                      ) : (
                        <div className="px-3 py-1 rounded-full text-xs font-medium inline-block">
                          {record.status === 'present' && (
                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">Present</span>
                          )}
                          {record.status === 'absent' && (
                            <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full">Absent</span>
                          )}
                          {record.status === 'late' && (
                            <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">Late</span>
                          )}
                          {record.status === 'excused' && (
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">Excused</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {attendanceRecords.length === 0 && (
            <div className="p-4 bg-gray-50 text-center rounded-md">
              <p className="text-gray-500 text-sm">
                No students in this support class yet.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 text-center rounded-md">
          <p className="text-gray-500">
            No attendance record found for this date. Create one to get started.
          </p>
        </div>
      )}
      
      {/* Confirm Dialog */}
      {showConfirmDialog && (
        <ConfirmDialog
          title="Create Attendance"
          message={`Are you sure you want to create an attendance record for ${supportClass.name} on ${date}?`}
          confirmText="Create"
          cancelText="Cancel"
          onConfirm={() => {
            setShowConfirmDialog(false);
            handleCreateAttendance();
          }}
          onCancel={() => setShowConfirmDialog(false)}
        />
      )}
    </div>
  );
};

export default SupportAttendanceManagement;
