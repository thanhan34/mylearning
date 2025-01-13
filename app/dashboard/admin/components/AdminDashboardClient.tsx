'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import UserManagement from './UserManagement';
import ClassManagement from './ClassManagement';
import DailyTargetSettings from './DailyTargetSettings';
import SystemStats from './SystemStats';
import StudentInfo from './StudentInfo';
import StudentSubmissions from './StudentSubmissions';

export default function AdminDashboardClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('users');

  if (!session || (session.user as any)?.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => setActiveTab('users')}
              className={`${
                activeTab === 'users'
                  ? 'border-[#fc5d01] text-[#fc5d01]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Quản lý Tài khoản
            </button>
            <button
              onClick={() => setActiveTab('classes')}
              className={`${
                activeTab === 'classes'
                  ? 'border-[#fc5d01] text-[#fc5d01]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Quản lý Lớp học
            </button>
            <button
              onClick={() => setActiveTab('daily-targets')}
              className={`${
                activeTab === 'daily-targets'
                  ? 'border-[#fc5d01] text-[#fc5d01]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              Daily Target Settings
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`${
                activeTab === 'stats'
                  ? 'border-[#fc5d01] text-[#fc5d01]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm`}
            >
              System Stats
            </button>
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'classes' && <ClassManagement />}
          {activeTab === 'daily-targets' && <DailyTargetSettings />}
          {activeTab === 'stats' && <SystemStats />}
        </div>
      </div>
    </div>
  );
}
