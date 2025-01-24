"use client";

import { useState, useEffect } from "react";
import { User } from "../../../firebase/services/user";
import { Class } from "../../../firebase/services/types";
import { Mocktest } from "../../../../types/mocktest";
import { getMocktestsByStudent } from "../../../firebase/services/mocktest";
import MocktestTable from "./MocktestTable";

interface Props {
  student: User;
  classData: Class;
}

export default function StudentMocktestView({ student, classData }: Props) {
  const [mocktests, setMocktests] = useState<Mocktest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMocktests = async () => {
    if (!student.id) return;
    
    try {
      const data = await getMocktestsByStudent(student.id, classData.id);
      console.log("Filtered mocktests for student in class:", {
        studentId: student.id,
        classId: classData.id,
        count: data.length,
        mocktests: data
      });
      setMocktests(data);
    } catch (error) {
      console.error("Error loading student mocktests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMocktests();
  }, [student.id]);

  const getStats = () => {
    const totalMocktests = mocktests.length;
    const mocktestsWithFeedback = mocktests.filter(m => m.feedback).length;
    const latestMocktest = mocktests[0]?.submittedAt?.toDate();
    
    return {
      totalMocktests,
      mocktestsWithFeedback,
      latestMocktest
    };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-100 rounded w-1/3"></div>
            <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div className="h-24 bg-gray-100 rounded"></div>
              <div className="h-24 bg-gray-100 rounded"></div>
              <div className="h-24 bg-gray-100 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Mocktest của {student.name || student.email}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Lớp: {classData.name}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#fedac2] rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Tổng số mocktest</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.totalMocktests}</div>
          </div>
          <div className="bg-[#fedac2] rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Đã có feedback</div>
            <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.mocktestsWithFeedback}</div>
          </div>
          <div className="bg-[#fedac2] rounded-lg p-4">
            <div className="text-sm font-medium text-gray-600">Bài nộp gần nhất</div>
            <div className="mt-1 text-lg font-semibold text-gray-900">
              {stats.latestMocktest 
                ? new Intl.DateTimeFormat("vi-VN").format(stats.latestMocktest)
                : "Chưa có"}
            </div>
          </div>
        </div>

        <MocktestTable
          mocktests={mocktests}
          classId={classData.id}
          isTeacher={true}
          onUpdate={loadMocktests}
        />
      </div>
    </div>
  );
}
