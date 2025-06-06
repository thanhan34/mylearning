"use client";

import { useState, useEffect } from "react";
import { User } from "../../../../firebase/services/user";
import { Class, ClassStudent } from "../../../../firebase/services/types";
import StudentMocktestView from "../../components/StudentMocktestView";
import { getMocktestsByClass } from "../../../../firebase/services/mocktest";
import { Mocktest } from "../../../../../types/mocktest";

interface Props {
  admin: User;
  classes: Class[];
}

export default function AdminMocktestClient({ admin, classes }: Props) {
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<ClassStudent | null>(null);
  const [mocktests, setMocktests] = useState<Mocktest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMocktests = async () => {
      if (!selectedClass) return;
      setLoading(true);
      try {
        // Get all mocktests for this class
        
        const classMocktests = await getMocktestsByClass(selectedClass.id);
        
        setMocktests(classMocktests);
      } catch (error) {
        console.error("Error fetching mocktests:", error);
      }
      setLoading(false);
    };

    fetchMocktests();
  }, [selectedClass]);

  // Get mocktest count for a student from the mocktests collection
  const getStudentMocktestCount = (studentId: string) => {
    if (!selectedClass) return 0;
    
    // Filter mocktests by both studentId and classId
    const studentMocktests = mocktests.filter(m => 
      m.studentId === studentId && 
      m.classId === selectedClass.id
    );

    
    
    return studentMocktests.length;
  };

  useEffect(() => {
    console.log("All mocktests:", mocktests);
  }, [mocktests]);

  const getClassStats = () => {
    if (!selectedClass) return null;
    
    const totalStudents = selectedClass.students.length;
    const studentsWithMocktest = new Set(mocktests.map(m => m.studentId)).size;
    const totalMocktests = mocktests.length;
    const mocktestsWithFeedback = mocktests.filter(m => m.feedback).length;

    return {
      totalStudents,
      studentsWithMocktest,
      totalMocktests,
      mocktestsWithFeedback
    };
  };

  if (classes.length === 0) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Chưa có lớp học nào trong hệ thống.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý Mocktest
          </h1>
        </div>

        {selectedClass && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {(() => {
              const stats = getClassStats();
              if (!stats) return null;

              return (
                <>
                  <div className="bg-[#fedac2] rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600">Tổng số học sinh</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalStudents}</div>
                  </div>
                  <div className="bg-[#fedac2] rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600">Học sinh đã nộp</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.studentsWithMocktest}</div>
                  </div>
                  <div className="bg-[#fedac2] rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600">Tổng số mocktest</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalMocktests}</div>
                  </div>
                  <div className="bg-[#fedac2] rounded-lg p-4">
                    <div className="text-sm font-medium text-gray-600">Đã có feedback</div>
                    <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.mocktestsWithFeedback}</div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn lớp
            </label>
            <select
              value={selectedClass?.id || ""}
              onChange={(e) => {
              const classId = e.target.value;
              const classData = classes.find(c => c.id === classId);
              console.log("Selected class:", {
                id: classId,
                data: classData,
                students: classData?.students.map(s => ({
                  id: s.id,
                  name: s.name || s.email
                }))
              });
              setSelectedClass(classData || null);
              setSelectedStudent(null);
              }}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#fc5d01] focus:outline-none focus:ring-1 focus:ring-[#fc5d01]"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((classData) => (
                <option key={classData.id} value={classData.id}>
                  {classData.name}
                </option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div className="overflow-hidden bg-white shadow-lg rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-700">Danh sách học sinh</h3>
              </div>
              {loading ? (
                <div className="p-4">
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-gray-100 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Học sinh
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Số bài nộp
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedClass.students.map((student) => {
                        const mocktestCount = getStudentMocktestCount(student.id);
                        const hasMultipleMocktests = mocktestCount > 1;
                        const status = hasMultipleMocktests ? 'Đã nộp' : mocktestCount === 1 ? '1 mocktest' : 'Chưa nộp';
                        
                        return (
                          <tr 
                            key={student.id}
                            className={`hover:bg-gray-50 ${selectedStudent?.id === student.id ? 'bg-[#fedac2]/20' : ''}`}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {student.name || student.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`flex-shrink-0 h-2 w-2 rounded-full mr-2 ${
                                  hasMultipleMocktests ? 'bg-green-400' : 
                                  mocktestCount === 1 ? 'bg-yellow-400' : 
                                  'bg-gray-300'
                                }`}></div>
                                <span className={`text-sm ${
                                  hasMultipleMocktests ? 'text-green-600 font-medium' : 
                                  mocktestCount === 1 ? 'text-yellow-600' : 
                                  'text-gray-500'
                                }`}>
                                  {hasMultipleMocktests ? 'Đã nộp' : mocktestCount === 1 ? '1 mocktest' : 'Chưa nộp'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{mocktestCount}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="text-[#fc5d01] hover:text-[#fd7f33] font-medium"
                              >
                                Xem chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedClass && selectedStudent && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <StudentMocktestView
            student={{
              id: selectedStudent.id,
              email: selectedStudent.email,
              name: selectedStudent.name,
              role: "student",
              classId: selectedClass.id,
              teacherId: selectedClass.teacherId
            }}
            classData={selectedClass}
          />
        </div>
      )}
    </div>
  );
}
