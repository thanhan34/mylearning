'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import UserManagement from './components/UserManagement';
import ClassManagement from './components/ClassManagement';
import SystemStats from './components/SystemStats';
import DailyTargetSettings from './components/DailyTargetSettings';

const AdminPanel = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<'users' | 'classes' | 'stats' | 'dailyTarget'>('stats');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!session?.user?.email) return;
      
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', session.user.email), where('role', '==', 'admin'));
        const querySnapshot = await getDocs(q);
        
        setIsAdmin(!querySnapshot.empty);
        if (querySnapshot.empty) {
          redirect('/dashboard');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        redirect('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, [session]);

  if (isLoading) {
    return (
      <div className="p-6 animate-pulse">
        <div className="h-8 bg-[#fedac2] rounded w-64 mb-6"></div>
        <div className="flex gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-[#fedac2] rounded w-32"></div>
          ))}
        </div>
        <div className="h-96 bg-[#fedac2] rounded-lg"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const tabs = [
    {
      id: 'users',
      label: 'Quản lý tài khoản',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'classes',
      label: 'Quản lý lớp học',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'stats',
      label: 'Thống kê tổng quan',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'dailyTarget',
      label: 'Daily Target',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    }
  ];

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center space-x-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#fc5d01]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 className="text-2xl font-bold text-[#fc5d01]">Quản trị hệ thống</h1>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-[#fc5d01] text-white shadow-lg transform scale-105'
                : 'bg-gradient-to-br from-[#fedac2] to-white text-[#fc5d01] hover:shadow-md hover:scale-102'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-gradient-to-br from-white to-[#fedac2]/10 rounded-xl shadow-lg p-6 min-h-[500px]">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'classes' && <ClassManagement />}
        {activeTab === 'stats' && <SystemStats />}
        {activeTab === 'dailyTarget' && <DailyTargetSettings />}
      </div>
    </div>
  );
};

export default AdminPanel;
