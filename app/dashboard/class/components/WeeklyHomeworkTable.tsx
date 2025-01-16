'use client';

import { useEffect, useState } from 'react';
import { getStudentWeeklyStatus } from '@/app/firebase/services/homework';
import { ClassStudent } from '@/app/firebase/services/types';

interface WeeklyHomeworkTableProps {
  classId: string;
  students: ClassStudent[];
  onStudentSelect?: (student: ClassStudent) => void;
  onRemoveStudent?: (studentId: string) => void;
}

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const WeeklyHomeworkTable = ({ 
  classId, 
  students,
  onStudentSelect,
  onRemoveStudent 
}: WeeklyHomeworkTableProps) => {
  const [submissions, setSubmissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [dates, setDates] = useState<string[]>([]);
  const [weekRange, setWeekRange] = useState('');
  const [currentWeek, setCurrentWeek] = useState(new Date());

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
              {DAYS.map((day, index) => (
                <th key={day} className="px-6 py-3 text-center text-sm font-semibold w-24">
                  <div>{day}</div>
                  <div className="text-sm">{dates[index]}</div>
                </th>
              ))}
              <th className="px-6 py-3 text-left text-sm font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr 
                key={student.id} 
                onClick={() => onStudentSelect?.(student)}
                className="border-b hover:bg-[#fedac2] cursor-pointer"
              >
                <td className="px-6 py-4">{student.name}</td>
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
