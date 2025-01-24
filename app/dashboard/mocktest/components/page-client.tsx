"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { User } from "../../../firebase/services/user";
import { Class } from "../../../firebase/services/types";
import { Mocktest } from "../../../../types/mocktest";
import { getMocktestsByStudent } from "../../../firebase/services/mocktest";
import MocktestTable from "./MocktestTable";

interface Props {
  user: User;
  classData: Class | null;
}

export default function MocktestClient({ user, classData }: Props) {
  const { data: session } = useSession();
  const [mocktests, setMocktests] = useState<Mocktest[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMocktests = async () => {
    if (!user.id) {
      console.error("No user ID available");
      return;
    }
    
    try {
      console.log("Loading mocktests for user:", {
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        hasClassData: !!classData,
        classId: classData?.id
      });
      if (!classData?.id) {
        console.error("No class ID available");
        return;
      }
      const data = await getMocktestsByStudent(user.id, classData.id);
      console.log("Loaded mocktests:", data);
      setMocktests(data);
    } catch (error) {
      console.error("Error loading mocktests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Component mounted with:", {
      userId: user.id,
      userEmail: user.email,
      userRole: user.role,
      hasClassData: !!classData,
      classId: classData?.id
    });
    loadMocktests();
  }, [user.id, classData]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">
          Danh sách Mocktest
        </h1>
      </div>

      {classData ? (
        <>
          <MocktestTable
            mocktests={mocktests}
            classId={classData.id}
            onUpdate={loadMocktests}
          />
          {mocktests.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              Chưa có bài mocktest nào. Nhấn nút "Thêm Mocktest" để nộp bài.
            </div>
          )}
        </>
      ) : (
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
                Bạn chưa được thêm vào lớp học nào. Vui lòng liên hệ với giáo viên của bạn.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
