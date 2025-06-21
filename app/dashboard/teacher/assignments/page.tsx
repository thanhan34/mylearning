'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import AssignmentCreationForm from '../../components/AssignmentCreationForm';
import AssignmentManagement from '../../components/AssignmentManagement';

const TeacherAssignmentsPage: React.FC = () => {
  const { data: session } = useSession();
  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');

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
        <div className="flex justify-between items-center">
          <h1 style={{ color: '#fc5d01' }} className="text-3xl font-bold">
            Quản Lý Bài Tập
          </h1>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setCurrentView('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'list'
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-200 hover:bg-gray-300'
              }`}
              style={currentView === 'list' ? { backgroundColor: '#fc5d01' } : {}}
            >
              Danh Sách Bài Tập
            </button>
            <button
              onClick={() => setCurrentView('create')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentView === 'create'
                  ? 'text-white'
                  : 'text-gray-600 bg-gray-200 hover:bg-gray-300'
              }`}
              style={currentView === 'create' ? { backgroundColor: '#fc5d01' } : {}}
            >
              Tạo Bài Tập Mới
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {currentView === 'list' && (
          <AssignmentManagement 
            onCreateNew={() => setCurrentView('create')}
          />
        )}
        
        {currentView === 'create' && (
          <AssignmentCreationForm
            onSuccess={() => setCurrentView('list')}
            onCancel={() => setCurrentView('list')}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherAssignmentsPage;
