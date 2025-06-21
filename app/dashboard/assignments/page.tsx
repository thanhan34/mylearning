'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import StudentAssignmentView from '../components/StudentAssignmentView';

const StudentAssignmentsPage: React.FC = () => {
  const { data: session } = useSession();

  if (!session) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Vui lòng đăng nhập để tiếp tục</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 style={{ color: '#fc5d01' }} className="text-3xl font-bold">
          Bài Tập Của Tôi
        </h1>
        <p className="text-gray-600 mt-2">
          Xem và nộp các bài tập được giao bởi giáo viên
        </p>
      </div>

      <StudentAssignmentView />
    </div>
  );
};

export default StudentAssignmentsPage;
