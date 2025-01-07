'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/app/firebase/config';
import UserManagement from './components/UserManagement';
import ClassManagement from './components/ClassManagement';
import SystemStats from './components/SystemStats';

const AdminPanel = () => {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState('users');
  const [isAdmin, setIsAdmin] = useState(false);

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
      }
    };

    checkAdminStatus();
  }, [session]);

  if (!isAdmin) {
    return null; // Prevent flash of content while checking admin status
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-[#fc5d01]">Quản trị hệ thống</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'users'
              ? 'bg-[#fc5d01] text-white'
              : 'bg-[#fedac2] text-[#fc5d01]'
          }`}
        >
          Quản lý tài khoản
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'classes'
              ? 'bg-[#fc5d01] text-white'
              : 'bg-[#fedac2] text-[#fc5d01]'
          }`}
        >
          Quản lý lớp học
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`px-4 py-2 rounded-lg ${
            activeTab === 'stats'
              ? 'bg-[#fc5d01] text-white'
              : 'bg-[#fedac2] text-[#fc5d01]'
          }`}
        >
          Thống kê tổng quan
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg p-6 shadow-lg">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'classes' && <ClassManagement />}
        {activeTab === 'stats' && <SystemStats />}
      </div>
    </div>
  );
};

export default AdminPanel;
