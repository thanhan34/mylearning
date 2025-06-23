'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState } from 'react';
import UserManagement from './UserManagement';
import ClassManagement from './ClassManagement';
import DailyTargetSettings from './DailyTargetSettings';
import SystemStats from './SystemStats';
import FeedbackMonitoring from './FeedbackMonitoring';
import HomeworkFeedbackMonitoring from './HomeworkFeedbackMonitoring';
import WelcomeHeader from './WelcomeHeader';
import MispronouncedWordsTracker from '../../components/MispronouncedWordsTracker';

export default function AdminDashboardClient() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('stats');

  if (!session || (session.user as any)?.role !== 'admin') {
    redirect('/dashboard');
  }

  const tabs = [
    {
      id: 'stats',
      name: 'Thống kê hệ thống',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'feedback',
      name: 'Theo dõi Feedback',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      )
    },
    {
      id: 'homework-feedback',
      name: 'Feedback Bài tập',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'users',
      name: 'Quản lý Tài khoản',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    },
    {
      id: 'classes',
      name: 'Quản lý Lớp học',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'daily-targets',
      name: 'Daily Target Settings',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      id: 'mispronounced-words',
      name: 'Từ phát âm sai',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 10h6m-6 4h6" />
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <WelcomeHeader />

      {/* Main Content */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Tabs - Mobile View */}
        <div className="md:hidden border-b border-gray-200 bg-white">
          <div className="relative">
            <select 
              className="w-full py-3 px-4 bg-white border-0 focus:ring-2 focus:ring-[#fc5d01] text-sm text-gray-700 appearance-none"
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
            >
              {tabs.map((tab) => (
                <option key={tab.id} value={tab.id}>
                  {tab.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Tabs - Desktop View */}
        <div className="hidden md:block border-b border-gray-200">
          <nav className="-mb-px flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-[#fc5d01] text-[#fc5d01] bg-[#fedac2]/10'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                } flex items-center space-x-2 whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 flex-1 justify-center`}
              >
                <span className="flex-shrink-0">{tab.icon}</span>
                <span className="truncate">{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content Area */}
        <div className="p-3 sm:p-6 bg-gradient-to-br from-white to-[#fedac2]/5">
          <div className="animate-fadeIn">
            {activeTab === 'stats' && <SystemStats />}
            {activeTab === 'feedback' && <FeedbackMonitoring />}
            {activeTab === 'homework-feedback' && <HomeworkFeedbackMonitoring />}
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'classes' && <ClassManagement />}
            {activeTab === 'daily-targets' && <DailyTargetSettings />}
            {activeTab === 'mispronounced-words' && <MispronouncedWordsTracker userRole="admin" />}
          </div>
        </div>
      </div>
    </div>
  );
}
