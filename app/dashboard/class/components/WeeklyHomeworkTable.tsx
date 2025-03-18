'use client';

import { useEffect, useState } from 'react';
import { getStudentWeeklyStatus } from '@/app/firebase/services/homework';
import { ClassStudent } from '@/app/firebase/services/types';
import { getUserById, User, updateUserPassedStatus } from '@/app/firebase/services/user';

interface WeeklyHomeworkTableProps {
  classId: string;
  students: ClassStudent[];
  showPassedStudents: boolean;
  onStudentSelect?: (student: ClassStudent) => void;
  onRemoveStudent?: (studentId: string) => void;
  onStudentPassedChange?: () => void;
}

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const WeeklyHomeworkTable = ({ 
  classId, 
  students,
  showPassedStudents,
  onStudentSelect,
  onRemoveStudent,
  onStudentPassedChange
}: WeeklyHomeworkTableProps) => {
  const [submissions, setSubmissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [weekRange, setWeekRange] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [fullStudentData, setFullStudentData] = useState<Record<string, User>>({});

  // Fetch full user data to get passed status
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData: Record<string, User> = {};
        for (const student of students) {
          const user = await getUserById(student.id);
          if (user) {
            userData[student.id] = user;
          }
        }
        setFullStudentData(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserData();
  }, [students]);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        // Calculate dates for the selected week
        const monday = new Date(currentWeek);
        monday.setDate(monday.getDate() - (monday.getDay() || 7) + 1); // Get Monday
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        // Set week range
        setWeekRange(`${monday.getDate()}/${monday.getMonth() + 1} - ${sunday.getDate()}/${sunday.getMonth() + 1}`);

        // Generate dates for the week
        const weekDates = DAYS.map((_, index) => {
          const date = new Date(monday);
          date.setDate(monday.getDate() + index);
          return {
            display: `${date.getDate()}/${date.getMonth() + 1}`,
            full: date
          };
        });

        setDates(weekDates.map(d => d.display));

        // Initialize all days for all students as submitted (true)
        const initializedData: Record<string, Record<string, boolean>> = {};
        students.forEach(student => {
          initializedData[student.id] = {};
          weekDates.forEach((date, index) => {
            initializedData[student.id][index] = false; // Default to not submitted
          });
        });

        // Get submissions from Firebase
        const data = await getStudentWeeklyStatus(classId, currentWeek);
        
        // Merge Firebase data with initialized data
        Object.keys(data).forEach(studentId => {
          if (initializedData[studentId]) {
            // Map submissions by date to our weekday indices
            weekDates.forEach((date, index) => {
              if (data[studentId][index] === true) {
                initializedData[studentId][index] = true;
              }
            });
          }
        });

        setSubmissions(initializedData);
      } catch (error) {
        console.error('Error fetching submissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [classId, students, currentWeek]);

  if (loading) {
    return <div className="text-center py-4">Đang tải...</div>;
  }

  const handlePreviousWeek = () => {
    const prevWeek = new Date(currentWeek);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeek(prevWeek);
  };

  const handleNextWeek = () => {
    const nextWeek = new Date(currentWeek);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeek(nextWeek);
  };

  const handleTogglePassedStatus = async (studentId: string, currentStatus: boolean) => {
    try {
      const success = await updateUserPassedStatus(studentId, !currentStatus);
      if (success) {
        // Update local state
        setFullStudentData(prev => ({
          ...prev,
          [studentId]: {
            ...prev[studentId],
            passed: !currentStatus
          }
        }));
        
        // Notify parent component if needed
        if (onStudentPassedChange) {
          onStudentPassedChange();
        }
      }
    } catch (error) {
      console.error('Error toggling passed status:', error);
    }
  };

  // Filter students based on passed status
  const filteredStudents = students.filter(student => 
    showPassedStudents || !fullStudentData[student.id]?.passed
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={handlePreviousWeek}
          className="text-[#fc5d01] hover:text-[#fd7f33]"
        >
          ← Tuần trước
        </button>
        <div className="text-sm text-gray-600">
          {weekRange}
        </div>
        <button
          onClick={handleNextWeek}
          className="text-[#fc5d01] hover:text-[#fd7f33]"
        >
          Tuần sau →
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#fc5d01] text-white">
              <th className="px-6 py-3 text-left text-sm font-semibold">Tên học viên</th>
              <th className="px-6 py-3 text-center text-sm font-semibold">Đã đậu</th>
              {DAYS.map((day, index) => (
                <th key={day} className="px-6 py-3 text-center text-sm font-semibold w-24">
                  {day}
                  <div className="text-sm">{dates[index]}</div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr 
                key={student.id} 
                onClick={() => onStudentSelect?.(student)}
                className="border-b hover:bg-[#fedac2] cursor-pointer"
              >
                <td className="px-6 py-4">{student.name}</td>
                <td className="px-6 py-4 text-center">
                  <div 
                    className="flex items-center justify-center"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTogglePassedStatus(student.id, !!fullStudentData[student.id]?.passed);
                    }}
                  >
                    <div className={`w-6 h-6 rounded border cursor-pointer flex items-center justify-center ${
                      fullStudentData[student.id]?.passed 
                        ? 'bg-[#fc5d01] border-[#fc5d01] text-white' 
                        : 'bg-white border-gray-300'
                    }`}>
                      {fullStudentData[student.id]?.passed && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                </td>
                {DAYS.map((_, index) => (
                  <td key={index} className="px-6 py-4 text-center">
                    {submissions[student.id]?.[index] ? (
                      <div className="w-6 h-6 bg-green-600 rounded-full mx-auto" title="Đã nộp" />
                    ) : (
                      <div className="w-6 h-6 bg-red-600 rounded-full mx-auto" title="Chưa nộp" />
                    )}
                  </td>
                ))}
                <td className="px-6 py-4">
                  {onRemoveStudent && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStudent(student.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Xóa
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WeeklyHomeworkTable;
